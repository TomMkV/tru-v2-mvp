"""
Inference endpoints for video + prompt processing
"""
import os
import logging
from typing import Optional, List, Union
from pathlib import Path
import aiofiles

from fastapi import APIRouter, Request, HTTPException, UploadFile, File, Form
from pydantic import BaseModel, Field, field_validator

from app.core.config import settings

logger = logging.getLogger(__name__)

router = APIRouter()


class VideoProcessingParams(BaseModel):
    """Video processing parameters"""
    fps: Optional[float] = Field(default=settings.DEFAULT_VIDEO_FPS, description="Frames per second to sample")
    max_frames: Optional[int] = Field(default=settings.DEFAULT_MAX_FRAMES, description="Maximum number of frames")
    min_pixels: Optional[int] = Field(default=settings.DEFAULT_MIN_PIXELS, description="Minimum pixels per frame")
    max_pixels: Optional[int] = Field(default=settings.DEFAULT_MAX_PIXELS, description="Maximum pixels per frame")
    total_pixels: Optional[int] = Field(default=settings.DEFAULT_TOTAL_PIXELS, description="Total pixel budget")


class GenerationParams(BaseModel):
    """Text generation parameters"""
    max_tokens: Optional[int] = Field(default=settings.MAX_NEW_TOKENS, description="Maximum tokens to generate")
    temperature: Optional[float] = Field(default=settings.TEMPERATURE, ge=0.0, le=2.0, description="Sampling temperature")
    top_p: Optional[float] = Field(default=settings.TOP_P, ge=0.0, le=1.0, description="Nucleus sampling parameter")
    top_k: Optional[int] = Field(default=settings.TOP_K, ge=0, description="Top-k sampling parameter")


class InferenceRequestURL(BaseModel):
    """Inference request with video URL"""
    video_url: str = Field(..., description="URL to video file (http/https)")
    prompt: str = Field(..., min_length=1, description="Text prompt for the model")
    video_params: Optional[VideoProcessingParams] = None
    generation_params: Optional[GenerationParams] = None
    
    @field_validator('video_url')
    @classmethod
    def validate_video_url(cls, v):
        if not (v.startswith('http://') or v.startswith('https://')):
            raise ValueError('video_url must start with http:// or https://')
        return v


class InferenceResponse(BaseModel):
    """Inference response"""
    response: str = Field(..., description="Generated text response")
    prompt: str = Field(..., description="Original prompt")
    video_source: str = Field(..., description="Video source (URL or filename)")
    backend: str = Field(..., description="Inference backend used")


@router.post("/inference/url", response_model=InferenceResponse)
async def inference_from_url(
    request: Request,
    inference_request: InferenceRequestURL
):
    """
    Process a video from URL with text prompt
    
    The video will be streamed and processed directly without saving to disk.
    Supports http:// and https:// URLs.
    """
    model_manager = request.app.state.model_manager
    
    try:
        logger.info(f"Processing video from URL: {inference_request.video_url}")
        
        # Convert Pydantic models to dicts
        video_params = inference_request.video_params.model_dump() if inference_request.video_params else None
        generation_params = inference_request.generation_params.model_dump() if inference_request.generation_params else None
        
        # Generate response
        response_text = await model_manager.generate(
            video=inference_request.video_url,
            prompt=inference_request.prompt,
            video_params=video_params,
            generation_params=generation_params
        )
        
        return InferenceResponse(
            response=response_text,
            prompt=inference_request.prompt,
            video_source=inference_request.video_url,
            backend=model_manager.backend
        )
    
    except Exception as e:
        logger.error(f"Inference failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Inference failed: {str(e)}")


@router.post("/inference/upload", response_model=InferenceResponse)
async def inference_from_upload(
    request: Request,
    video: UploadFile = File(...),
    prompt: str = Form(...),
    fps: Optional[float] = Form(default=settings.DEFAULT_VIDEO_FPS),
    max_frames: Optional[int] = Form(default=settings.DEFAULT_MAX_FRAMES),
    min_pixels: Optional[int] = Form(default=settings.DEFAULT_MIN_PIXELS),
    max_pixels: Optional[int] = Form(default=settings.DEFAULT_MAX_PIXELS),
    total_pixels: Optional[int] = Form(default=settings.DEFAULT_TOTAL_PIXELS),
    max_tokens: Optional[int] = Form(default=settings.MAX_NEW_TOKENS),
    temperature: Optional[float] = Form(default=settings.TEMPERATURE),
    top_p: Optional[float] = Form(default=settings.TOP_P),
    top_k: Optional[int] = Form(default=settings.TOP_K),
):
    """
    Process an uploaded video file with text prompt
    
    Accepts multipart/form-data with video file and parameters.
    The video will be temporarily saved, processed, then deleted.
    """
    model_manager = request.app.state.model_manager
    
    # Validate file extension
    file_ext = Path(video.filename).suffix.lower()
    if file_ext not in settings.ALLOWED_VIDEO_FORMATS:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid video format. Allowed formats: {settings.ALLOWED_VIDEO_FORMATS}"
        )
    
    # Check file size
    video.file.seek(0, 2)  # Seek to end
    file_size = video.file.tell()
    video.file.seek(0)  # Reset to start
    
    if file_size > settings.MAX_VIDEO_SIZE_MB * 1024 * 1024:
        raise HTTPException(
            status_code=400,
            detail=f"Video file too large. Maximum size: {settings.MAX_VIDEO_SIZE_MB}MB"
        )
    
    # Save uploaded file temporarily
    temp_video_path = os.path.join(
        settings.UPLOAD_DIR,
        f"temp_{os.getpid()}_{video.filename}"
    )
    
    try:
        # Save file
        async with aiofiles.open(temp_video_path, 'wb') as out_file:
            content = await video.read()
            await out_file.write(content)
        
        logger.info(f"Saved uploaded video to: {temp_video_path}")
        
        # Prepare parameters
        video_params = {
            "fps": fps,
            "max_frames": max_frames,
            "min_pixels": min_pixels,
            "max_pixels": max_pixels,
            "total_pixels": total_pixels,
        }
        
        generation_params = {
            "max_tokens": max_tokens,
            "temperature": temperature,
            "top_p": top_p,
            "top_k": top_k,
        }
        
        # Generate response
        response_text = await model_manager.generate(
            video=f"file://{temp_video_path}",
            prompt=prompt,
            video_params=video_params,
            generation_params=generation_params
        )
        
        return InferenceResponse(
            response=response_text,
            prompt=prompt,
            video_source=video.filename,
            backend=model_manager.backend
        )
    
    except Exception as e:
        logger.error(f"Inference failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Inference failed: {str(e)}")
    
    finally:
        # Cleanup temporary file
        if os.path.exists(temp_video_path):
            try:
                os.remove(temp_video_path)
                logger.info(f"Cleaned up temporary file: {temp_video_path}")
            except Exception as e:
                logger.warning(f"Failed to cleanup temp file: {e}")

