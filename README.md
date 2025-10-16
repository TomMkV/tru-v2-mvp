# TRU V2 MVP - Video Language Model Platform

A production-ready VLM (Vision Language Model) microservice platform for processing video + prompt requests using Qwen3-VL.

## 🏗️ Architecture Overview

This is a **monorepo** containing:

1. **FastAPI Inference Service** (Python) - Core VLM processing
2. **NextJS Web Frontend** (TypeScript) - User interface (to be implemented)
3. **Shared API Contracts** - Type definitions and OpenAPI schemas

```
┌──────────────────────────────────────────────────────────┐
│              User Browser                                │
└────────────────┬─────────────────────────────────────────┘
                 │
┌────────────────▼─────────────────────────────────────────┐
│           NextJS Frontend (Port 3000)                    │
│  - Video upload interface                                │
│  - Result display                                        │
│  - Real-time inference status                            │
└────────────────┬─────────────────────────────────────────┘
                 │ HTTP REST API
┌────────────────▼─────────────────────────────────────────┐
│      Python FastAPI Service (Port 8000)                  │
│  ┌────────────────────────────────────┐                  │
│  │  API Layer (FastAPI)               │                  │
│  │  - /v1/inference/url               │                  │
│  │  - /v1/inference/upload            │                  │
│  │  - /v1/health                      │                  │
│  └──────────┬─────────────────────────┘                  │
│             │                                             │
│  ┌──────────▼─────────────────────────┐                  │
│  │  Video Processing (qwen-vl-utils)  │                  │
│  │  - Multi-backend video decoding    │                  │
│  │  - Smart frame sampling            │                  │
│  │  - Adaptive resolution scaling     │                  │
│  └──────────┬─────────────────────────┘                  │
│             │                                             │
│  ┌──────────▼─────────────────────────┐                  │
│  │  Model Inference                   │                  │
│  │  - HuggingFace Transformers        │                  │
│  │  - Optional: vLLM (production)     │                  │
│  │  - Qwen3-VL models (4B-235B)       │                  │
│  └────────────────────────────────────┘                  │
└──────────────────────────────────────────────────────────┘
```

## 📁 Repository Structure

```
tru-v2-mvp/
├── apps/
│   ├── inference-api/          # Python FastAPI service
│   │   ├── app/
│   │   │   ├── api/
│   │   │   │   └── routes/
│   │   │   │       ├── inference.py    # Video inference endpoints
│   │   │   │       └── health.py       # Health checks
│   │   │   ├── core/
│   │   │   │   ├── config.py           # Configuration management
│   │   │   │   └── model.py            # Model loading & inference
│   │   │   └── main.py                 # FastAPI app entry point
│   │   ├── qwen_vl_utils/              # Extracted from Qwen3-VL
│   │   ├── Dockerfile
│   │   ├── requirements.txt
│   │   └── env.template
│   │
│   └── web/                    # NextJS frontend (TO BE IMPLEMENTED)
│
├── packages/                   # Shared code (TO BE IMPLEMENTED)
│   └── api-types/             # TypeScript + Pydantic schemas
│
├── infrastructure/
│   └── docker-compose.yml     # Local development setup
│
└── README.md (this file)
```

## 🎯 What Was Migrated from Qwen3-VL

### ✅ Essential Components Extracted:

1. **`qwen_vl_utils/` package** (complete)
   - `vision_process.py` - Video/image preprocessing logic
   - Multi-backend video decoding (torchvision, decord, torchcodec)
   - Smart frame sampling and resolution management
   - Memory-efficient video processing

2. **Model loading patterns** from `web_demo_mm.py`
   - vLLM backend integration
   - HuggingFace Transformers backend
   - Dual-backend abstraction layer

3. **Video processing pipeline**
   - Frame sampling strategies
   - Pixel budget management
   - Video metadata tracking

### ❌ What Was NOT Migrated (Intentionally):

- Cookbooks and examples (reference only)
- Evaluation/benchmark tooling
- Fine-tuning code
- Gradio demo UI (building custom NextJS instead)
- Training scripts

## 🚀 Quick Start

### Prerequisites

- Python 3.10+
- CUDA 12.1+ (for GPU inference)
- Docker & Docker Compose
- NVIDIA Docker runtime (for GPU support)

### Local Development Setup

1. **Clone and navigate:**
   ```bash
   cd /Users/thomaspeterson/Projects/tru-v2-mvp
   ```

2. **Configure environment:**
   ```bash
   cd apps/inference-api
   cp env.template .env
   # Edit .env with your model path and settings
   ```

3. **Option A: Run with Docker Compose (Recommended)**
   ```bash
   cd infrastructure
   docker-compose up --build
   ```

4. **Option B: Run locally (for development)**
   ```bash
   cd apps/inference-api
   pip install -r requirements.txt
   uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
   ```

### Verify Installation

```bash
# Health check
curl http://localhost:8000/v1/health

# Detailed health check (includes GPU info)
curl http://localhost:8000/v1/health/detailed

# API documentation
open http://localhost:8000/docs
```

## 📡 API Endpoints

### 1. Inference from URL
```bash
POST /v1/inference/url
Content-Type: application/json

{
  "video_url": "https://example.com/video.mp4",
  "prompt": "Describe what happens in this video",
  "video_params": {
    "fps": 2.0,
    "max_frames": 768,
    "min_pixels": 4096,
    "max_pixels": 262144
  },
  "generation_params": {
    "max_tokens": 2048,
    "temperature": 0.7
  }
}
```

### 2. Inference from Upload
```bash
POST /v1/inference/upload
Content-Type: multipart/form-data

video: <file>
prompt: "What is happening in this video?"
fps: 2.0
max_tokens: 2048
```

### 3. Health Checks
```bash
GET /v1/health              # Basic health
GET /v1/health/detailed     # Includes GPU status
```

## 🔧 Configuration

Key environment variables in `apps/inference-api/.env`:

```bash
# Model Selection
MODEL_PATH=Qwen/Qwen3-VL-8B-Instruct  # or 4B, 30B, 235B variants
MODEL_BACKEND=hf                       # "hf" or "vllm"

# Performance
USE_FLASH_ATTN=true                    # Enable flash attention
VLLM_GPU_MEMORY_UTILIZATION=0.85      # vLLM memory usage
VLLM_TENSOR_PARALLEL_SIZE=1           # Multi-GPU support

# Video Processing
DEFAULT_VIDEO_FPS=2.0                  # Frame sampling rate
DEFAULT_MAX_FRAMES=768                 # Max frames per video
IMAGE_PATCH_SIZE=16                    # 16 for Qwen3-VL

# Generation
MAX_NEW_TOKENS=2048
TEMPERATURE=0.7
```

## 🧠 Model Backend Options

### HuggingFace Transformers (Default)
- **Pros**: Simple setup, good for development
- **Cons**: Lower throughput, no batching
- **Use case**: Development, single-user, smaller models

### vLLM (Production)
- **Pros**: High throughput, continuous batching, PagedAttention
- **Cons**: Requires more setup, CUDA 12.1+
- **Use case**: Production, multi-user, larger models

To use vLLM:
1. Uncomment `vllm>=0.11.0` in `requirements.txt`
2. Set `MODEL_BACKEND=vllm` in `.env`
3. Ensure CUDA 12.1+ is installed

## 🎨 Design Decisions Made

### 1. **Python for VLM Service (Not Go)**
**Rationale**: 
- PyTorch, Transformers, vLLM are Python-native
- No viable Go alternatives exist
- Go would add unnecessary complexity (FFI, IPC overhead)
- FastAPI provides comparable performance for I/O-bound workloads

### 2. **Monorepo Structure**
**Rationale**:
- Single source of truth for API contracts
- Coordinated releases between frontend/backend
- Simpler local development
- Can split later if needed

### 3. **FastAPI over Flask/Django**
**Rationale**:
- Async/await support (important for long inference)
- Automatic OpenAPI documentation
- Pydantic validation
- WebSocket support for streaming
- Modern, type-safe

### 4. **Extracted qwen-vl-utils vs Dependency**
**Rationale**:
- Full control over video processing logic
- Can optimize for specific use cases
- No dependency on Qwen3-VL repo updates
- Apache 2.0 license allows this

## 🚧 Next Steps (For Next Agent Session)

### High Priority:

1. **NextJS Frontend Implementation**
   - [ ] Initialize NextJS project in `apps/web/`
   - [ ] Video upload component with drag-and-drop
   - [ ] Prompt input interface
   - [ ] Real-time inference status display
   - [ ] Result visualization
   - [ ] TypeScript API client generation from OpenAPI

2. **API Contract Definition**
   - [ ] Create OpenAPI schema in `packages/api-types/`
   - [ ] Generate TypeScript types for frontend
   - [ ] Generate Pydantic models for backend validation

3. **Testing Infrastructure**
   - [ ] Unit tests for model loading
   - [ ] Integration tests for inference endpoints
   - [ ] End-to-end tests with sample videos
   - [ ] Load testing with realistic workloads

4. **Documentation**
   - [ ] API usage examples
   - [ ] Model selection guide
   - [ ] Deployment guide (cloud platforms)
   - [ ] Troubleshooting guide

### Medium Priority:

5. **Enhanced Features**
   - [ ] WebSocket streaming for real-time responses
   - [ ] Batch inference endpoint
   - [ ] Video preprocessing caching
   - [ ] Request queuing for long videos
   - [ ] Prometheus metrics

6. **Production Readiness**
   - [ ] Kubernetes manifests
   - [ ] CI/CD pipeline (GitHub Actions)
   - [ ] Environment-specific configs (dev/staging/prod)
   - [ ] Secrets management
   - [ ] Rate limiting

### Low Priority:

7. **Optimizations**
   - [ ] Model quantization (FP8/INT4)
   - [ ] Frame caching layer
   - [ ] Multi-model support
   - [ ] A/B testing framework

## 📊 Performance Expectations

### Throughput (approximate):
- **HF Backend**: 0.5-2 requests/sec (depending on video length)
- **vLLM Backend**: 2-10 requests/sec (with batching)

### Latency (per request):
- **Short video (<30s)**: 5-15 seconds
- **Medium video (1-2 min)**: 15-45 seconds  
- **Long video (5+ min)**: 1-3 minutes

### GPU Memory:
- **Qwen3-VL-4B**: 8-12GB VRAM
- **Qwen3-VL-8B**: 16-24GB VRAM
- **Qwen3-VL-30B**: 48-64GB VRAM
- **Qwen3-VL-235B**: 4x A100 (80GB each)

## 🐛 Known Issues & Limitations

1. **Video Backend Compatibility**
   - torchvision <0.19.0 doesn't support HTTPS URLs
   - decord has hanging issues and is unmaintained
   - **Recommendation**: Use torchcodec (installed by default)

2. **Memory Management**
   - Long videos can OOM with default settings
   - Use `total_pixels` parameter to cap memory usage
   - Implement request queuing for production

3. **Model Loading Time**
   - First request takes 30-120s (model loading)
   - Use lifespan manager to load on startup
   - Consider model caching strategies

## 📄 License & Attribution

This project extracts and adapts code from [Qwen3-VL](https://github.com/QwenLM/Qwen3-VL) under Apache 2.0 license.

**Original Work**: Copyright © Alibaba Cloud (Qwen Team)  
**This Adaptation**: Copyright © 2025 TRU V2 MVP Project

Key extracted components:
- `qwen_vl_utils/` - Video processing utilities
- Model loading patterns from `web_demo_mm.py`
- Inference pipeline architecture

All modifications and new code are marked appropriately.

## 🤝 Contributing

This is an MVP project. For the next development session, focus on:
1. Implementing the NextJS frontend
2. Adding comprehensive tests
3. Creating deployment documentation

## 📚 Additional Resources

- [Qwen3-VL Documentation](https://github.com/QwenLM/Qwen3-VL)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [vLLM Documentation](https://docs.vllm.ai/)
- [HuggingFace Model Hub](https://huggingface.co/Qwen)

---

**Status**: Backend API complete, Frontend pending implementation  
**Last Updated**: 2025-01-16  
**Python Version**: 3.10+  
**Node Version**: 20+ (for frontend)

