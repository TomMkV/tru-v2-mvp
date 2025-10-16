"""
Configuration management for the VLM inference service
"""
import os
import json
from typing import List
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings with environment variable support"""
    
    # Service configuration
    SERVICE_NAME: str = "tru-v2-vlm-inference"
    API_VERSION: str = "v1"
    DEBUG: bool = False
    
    # Model configuration
    MODEL_PATH: str = os.getenv("MODEL_PATH", "Qwen/Qwen3-VL-8B-Instruct")
    MODEL_BACKEND: str = os.getenv("MODEL_BACKEND", "hf")  # "vllm" or "hf"
    DEVICE_MAP: str = "auto"
    USE_FLASH_ATTN: bool = True
    
    # vLLM specific settings
    VLLM_GPU_MEMORY_UTILIZATION: float = 0.85
    VLLM_TENSOR_PARALLEL_SIZE: int = int(os.getenv("VLLM_TENSOR_PARALLEL_SIZE", "1"))
    
    # Video processing settings
    DEFAULT_VIDEO_FPS: float = 2.0
    DEFAULT_MAX_FRAMES: int = 768
    DEFAULT_MIN_PIXELS: int = 4 * 32 * 32
    DEFAULT_MAX_PIXELS: int = 256 * 32 * 32
    DEFAULT_TOTAL_PIXELS: int = 20480 * 32 * 32
    IMAGE_PATCH_SIZE: int = 16  # 16 for Qwen3-VL, 14 for Qwen2.5-VL
    
    # Generation settings
    MAX_NEW_TOKENS: int = 2048
    TEMPERATURE: float = 0.7
    TOP_P: float = 0.8
    TOP_K: int = 20
    
    # API settings
    MAX_VIDEO_SIZE_MB: int = 1000  # 1GB max
    ALLOWED_VIDEO_FORMATS: List[str] = [".mp4", ".avi", ".mkv", ".mov", ".webm"]
    UPLOAD_DIR: str = "/tmp/tru-v2-uploads"
    
    # CORS - Parse from environment or use defaults
    CORS_ORIGINS: List[str] = json.loads(
        os.getenv("CORS_ORIGINS", '["http://localhost:3000", "http://localhost:3001"]')
    )
    
    # Logging
    LOG_LEVEL: str = "INFO"
    
    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()

# Ensure upload directory exists
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)

