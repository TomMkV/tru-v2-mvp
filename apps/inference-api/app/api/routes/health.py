"""
Health check endpoints
"""
from fastapi import APIRouter, Request
import torch

router = APIRouter()


@router.get("/health")
async def health_check(request: Request):
    """Basic health check endpoint"""
    return {
        "status": "healthy",
        "service": "tru-v2-vlm-inference"
    }


@router.get("/health/detailed")
async def detailed_health_check(request: Request):
    """Detailed health check with model and GPU status"""
    model_loaded = hasattr(request.app.state, 'model_manager') and \
                   request.app.state.model_manager.model is not None
    
    gpu_available = torch.cuda.is_available()
    gpu_count = torch.cuda.device_count() if gpu_available else 0
    
    gpu_info = []
    if gpu_available:
        for i in range(gpu_count):
            gpu_info.append({
                "id": i,
                "name": torch.cuda.get_device_name(i),
                "memory_allocated_gb": round(torch.cuda.memory_allocated(i) / 1e9, 2),
                "memory_reserved_gb": round(torch.cuda.memory_reserved(i) / 1e9, 2),
            })
    
    return {
        "status": "healthy" if model_loaded else "degraded",
        "model": {
            "loaded": model_loaded,
            "backend": request.app.state.model_manager.backend if model_loaded else None,
            "path": request.app.state.model_manager.model_path if model_loaded else None,
        },
        "gpu": {
            "available": gpu_available,
            "count": gpu_count,
            "devices": gpu_info
        }
    }

