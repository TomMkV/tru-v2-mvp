"""
TRU V2 MVP - VLM Inference API
FastAPI service for video + prompt processing using Qwen3-VL
"""
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import inference, health
from app.core.config import settings
from app.core.model import ModelManager

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager - handles startup and shutdown"""
    # Startup: Load model
    logger.info("Starting TRU V2 inference service...")
    logger.info(f"Loading model: {settings.MODEL_PATH}")
    
    try:
        model_manager = ModelManager()
        await model_manager.load_model()
        app.state.model_manager = model_manager
        logger.info("Model loaded successfully")
    except Exception as e:
        logger.error(f"Failed to load model: {e}")
        raise
    
    yield
    
    # Shutdown: Cleanup
    logger.info("Shutting down TRU V2 inference service...")
    if hasattr(app.state, 'model_manager'):
        await app.state.model_manager.cleanup()


app = FastAPI(
    title="TRU V2 - VLM Inference API",
    description="Video Language Model inference service using Qwen3-VL",
    version="0.1.0",
    lifespan=lifespan,
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(health.router, prefix="/v1", tags=["Health"])
app.include_router(inference.router, prefix="/v1", tags=["Inference"])


@app.get("/")
async def root():
    return {
        "service": "TRU V2 VLM Inference API",
        "version": "0.1.0",
        "status": "operational"
    }

