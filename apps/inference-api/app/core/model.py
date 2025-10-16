"""
Model loading and inference management
Extracted and adapted from Qwen3-VL web_demo_mm.py
"""
import os
import logging
from typing import Optional, List, Dict, Any, Union

import torch
from transformers import AutoProcessor, AutoModelForImageTextToText

from app.core.config import settings

logger = logging.getLogger(__name__)

# Check if vLLM is available
try:
    from vllm import LLM, SamplingParams
    from qwen_vl_utils import process_vision_info
    VLLM_AVAILABLE = True
except ImportError:
    VLLM_AVAILABLE = False
    logger.warning("vLLM not available. Using HuggingFace backend only.")


class ModelManager:
    """Manages model loading, configuration, and inference"""
    
    def __init__(self):
        self.model = None
        self.processor = None
        self.backend = settings.MODEL_BACKEND
        self.model_path = settings.MODEL_PATH
        
        # Validate backend choice
        if self.backend not in ["vllm", "hf"]:
            raise ValueError(f"Invalid MODEL_BACKEND: {self.backend}. Must be 'vllm' or 'hf'")
        
        if self.backend == "vllm" and not VLLM_AVAILABLE:
            error_msg = (
                "vLLM backend requested but not available. "
                "Install with: pip install vllm>=0.11.0 "
                "Or set MODEL_BACKEND=hf in your .env file"
            )
            logger.error(error_msg)
            raise RuntimeError(error_msg)
    
    async def load_model(self):
        """Load the model based on configured backend"""
        logger.info(f"Loading model from: {self.model_path}")
        logger.info(f"Using backend: {self.backend}")
        
        if self.backend == "vllm":
            self._load_vllm_model()
        else:
            self._load_hf_model()
        
        # Load processor (needed for both backends)
        self.processor = AutoProcessor.from_pretrained(self.model_path)
        logger.info("Processor loaded successfully")
    
    def _load_vllm_model(self):
        """Load model using vLLM backend for optimized inference"""
        os.environ['VLLM_WORKER_MULTIPROC_METHOD'] = 'spawn'
        
        tensor_parallel_size = settings.VLLM_TENSOR_PARALLEL_SIZE
        if tensor_parallel_size <= 0:
            tensor_parallel_size = torch.cuda.device_count()
        
        logger.info(f"Initializing vLLM with tensor_parallel_size={tensor_parallel_size}")
        
        self.model = LLM(
            model=self.model_path,
            trust_remote_code=True,
            gpu_memory_utilization=settings.VLLM_GPU_MEMORY_UTILIZATION,
            enforce_eager=False,
            tensor_parallel_size=tensor_parallel_size,
            seed=42
        )
        logger.info("vLLM model loaded successfully")
    
    def _load_hf_model(self):
        """Load model using HuggingFace Transformers backend"""
        load_kwargs = {
            "device_map": settings.DEVICE_MAP,
            "torch_dtype": "auto",
        }
        
        if settings.USE_FLASH_ATTN:
            load_kwargs["attn_implementation"] = "flash_attention_2"
            logger.info("Using flash_attention_2")
        
        self.model = AutoModelForImageTextToText.from_pretrained(
            self.model_path,
            **load_kwargs
        )
        logger.info("HuggingFace model loaded successfully")
    
    def _prepare_messages(
        self,
        video: Union[str, List],
        prompt: str,
        video_params: Optional[Dict[str, Any]] = None
    ) -> List[Dict[str, Any]]:
        """Prepare messages in Qwen3-VL format"""
        if video_params is None:
            video_params = {}
        
        # Set defaults
        video_config = {
            "video": video,
            "min_pixels": video_params.get("min_pixels", settings.DEFAULT_MIN_PIXELS),
            "max_pixels": video_params.get("max_pixels", settings.DEFAULT_MAX_PIXELS),
            "total_pixels": video_params.get("total_pixels", settings.DEFAULT_TOTAL_PIXELS),
            "fps": video_params.get("fps", settings.DEFAULT_VIDEO_FPS),
            "max_frames": video_params.get("max_frames", settings.DEFAULT_MAX_FRAMES),
        }
        
        # Handle pre-sampled frames
        if isinstance(video, list):
            video_config["sample_fps"] = video_params.get("sample_fps", settings.DEFAULT_VIDEO_FPS)
        
        messages = [
            {
                "role": "user",
                "content": [
                    video_config,
                    {"type": "text", "text": prompt}
                ]
            }
        ]
        
        return messages
    
    def _prepare_vllm_inputs(self, messages: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Prepare inputs for vLLM inference"""
        text = self.processor.apply_chat_template(
            messages, 
            tokenize=False, 
            add_generation_prompt=True
        )
        
        image_inputs, video_inputs, video_kwargs = process_vision_info(
            messages,
            image_patch_size=settings.IMAGE_PATCH_SIZE,
            return_video_kwargs=True,
            return_video_metadata=True
        )
        
        mm_data = {}
        if image_inputs is not None:
            mm_data['image'] = image_inputs
        if video_inputs is not None:
            mm_data['video'] = video_inputs
        
        return {
            'prompt': text,
            'multi_modal_data': mm_data,
            'mm_processor_kwargs': video_kwargs
        }
    
    async def generate(
        self,
        video: Union[str, List],
        prompt: str,
        video_params: Optional[Dict[str, Any]] = None,
        generation_params: Optional[Dict[str, Any]] = None
    ) -> str:
        """
        Generate response for video + prompt
        
        Args:
            video: Video file path, URL, or list of frames
            prompt: Text prompt
            video_params: Video processing parameters (fps, pixels, etc.)
            generation_params: Generation parameters (max_tokens, temperature, etc.)
        
        Returns:
            Generated text response
        """
        if self.model is None or self.processor is None:
            raise RuntimeError("Model not loaded. Call load_model() first.")
        
        # Prepare generation parameters
        if generation_params is None:
            generation_params = {}
        
        max_tokens = generation_params.get("max_tokens", settings.MAX_NEW_TOKENS)
        temperature = generation_params.get("temperature", settings.TEMPERATURE)
        top_p = generation_params.get("top_p", settings.TOP_P)
        top_k = generation_params.get("top_k", settings.TOP_K)
        
        # Prepare messages
        messages = self._prepare_messages(video, prompt, video_params)
        
        if self.backend == "vllm":
            return await self._generate_vllm(messages, max_tokens, temperature, top_p, top_k)
        else:
            return await self._generate_hf(messages, max_tokens, temperature, top_p, top_k)
    
    async def _generate_vllm(
        self,
        messages: List[Dict[str, Any]],
        max_tokens: int,
        temperature: float,
        top_p: float,
        top_k: int
    ) -> str:
        """Generate using vLLM backend"""
        inputs = self._prepare_vllm_inputs(messages)
        
        sampling_params = SamplingParams(
            max_tokens=max_tokens,
            temperature=temperature,
            top_p=top_p,
            top_k=top_k,
        )
        
        outputs = self.model.generate([inputs], sampling_params=sampling_params)
        
        if outputs and outputs[0].outputs:
            return outputs[0].outputs[0].text
        return ""
    
    async def _generate_hf(
        self,
        messages: List[Dict[str, Any]],
        max_tokens: int,
        temperature: float,
        top_p: float,
        top_k: int
    ) -> str:
        """Generate using HuggingFace backend"""
        from qwen_vl_utils import process_vision_info
        
        # Process vision inputs
        text = self.processor.apply_chat_template(
            messages,
            tokenize=False,
            add_generation_prompt=True
        )
        
        image_inputs, video_inputs, video_kwargs = process_vision_info(
            messages,
            image_patch_size=settings.IMAGE_PATCH_SIZE,
            return_video_kwargs=True,
            return_video_metadata=True
        )
        
        # Split videos and metadata if present
        if video_inputs is not None:
            videos, video_metadatas = zip(*video_inputs)
            videos, video_metadatas = list(videos), list(video_metadatas)
        else:
            videos = None
            video_metadatas = None
        
        # Prepare inputs
        inputs = self.processor(
            text=[text],
            images=image_inputs,
            videos=videos,
            video_metadata=video_metadatas,
            return_tensors="pt",
            do_resize=False,
            **video_kwargs
        )
        
        inputs = {k: v.to(self.model.device) for k, v in inputs.items()}
        
        # Generate
        output_ids = self.model.generate(
            **inputs,
            max_new_tokens=max_tokens,
            temperature=temperature,
            top_p=top_p,
            top_k=top_k,
            do_sample=temperature > 0,
        )
        
        # Decode
        generated_ids = [
            output_ids[len(input_ids):]
            for input_ids, output_ids in zip(inputs["input_ids"], output_ids)
        ]
        
        output_text = self.processor.batch_decode(
            generated_ids,
            skip_special_tokens=True,
            clean_up_tokenization_spaces=True
        )
        
        return output_text[0] if output_text else ""
    
    async def cleanup(self):
        """Cleanup resources"""
        logger.info("Cleaning up model resources...")
        self.model = None
        self.processor = None
        
        if torch.cuda.is_available():
            torch.cuda.empty_cache()
        
        logger.info("Cleanup complete")

