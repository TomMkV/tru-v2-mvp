# TRU V2 MVP - Video Language Model Platform

A production-ready VLM (Vision Language Model) microservice platform for processing video + prompt requests using Qwen3-VL.

## 🏗️ Architecture Overview

This is a **monorepo** containing:

1. **FastAPI Inference Service** (Python) - Core VLM processing ✅
2. **NextJS Web Frontend** (TypeScript) - User interface ✅
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
│   └── web/                    # NextJS frontend ✅ COMPLETE
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

**Required:**
- Docker & Docker Compose

**For GPU inference (recommended):**
- NVIDIA GPU with CUDA support
- NVIDIA Container Toolkit
- 16GB+ VRAM (for Qwen3-VL-8B)

**Note**: Works on CPU for testing (very slow), but requires GPU for production use.

### Option 1: One-Command Launch (Recommended)

```bash
# Clone and run
git clone <your-repo-url>
cd tru-v2-mvp
./test-now.sh
```

**What it does:**
- ✅ Checks prerequisites (Docker, GPU)
- ✅ Starts backend + frontend containers
- ✅ Runs automated health checks
- ✅ Opens browser to http://localhost:3000

**First run**: 5-10 minutes (downloads ~16GB model)  
**Subsequent runs**: ~30 seconds

### Option 2: Manual Docker Setup

```bash
# 1. Clone repository
git clone <your-repo-url>
cd tru-v2-mvp

# 2. Configure backend
cd apps/inference-api
cp env.template .env
# Edit .env if needed (defaults work for most cases)
cd ../..

# 3. Start services
cd infrastructure
docker-compose up -d

# 4. Wait for model loading (2-3 minutes first time)
docker-compose logs -f inference-api
# Look for: "Model loaded successfully"

# 5. Test deployment
./test-deployment.sh

# 6. Open browser
open http://localhost:3000
```

### Option 3: Local Development (No Docker)

**Backend:**
```bash
cd apps/inference-api
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp env.template .env
uvicorn app.main:app --reload
```

**Frontend** (new terminal):
```bash
cd apps/web
npm install
npm run dev
```

### Verify Everything Works

```bash
# Health check
curl http://localhost:8000/v1/health

# Detailed health (includes GPU info)
curl http://localhost:8000/v1/health/detailed | jq

# API documentation
open http://localhost:8000/docs

# Frontend
open http://localhost:3000
```

### First Video Analysis

1. Open http://localhost:3000
2. Drag and drop a video file (MP4, AVI, MOV, etc.)
3. Enter prompt: "Describe what happens in this video"
4. Click "Process Video"
5. Wait 30s-3min (depending on video length)
6. View results!

## 📡 API Reference

### Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/v1/health` | Basic health check |
| GET | `/v1/health/detailed` | Detailed health (GPU, model status) |
| POST | `/v1/inference/url` | Process video from URL |
| POST | `/v1/inference/upload` | Process uploaded video file |
| GET | `/docs` | Interactive API documentation (Swagger UI) |
| GET | `/openapi.json` | OpenAPI 3.0 schema |

### API Examples

#### 1. Test Health

```bash
# Basic health check
curl http://localhost:8000/v1/health

# Response
{
  "status": "healthy",
  "service": "tru-v2-vlm-inference"
}

# Detailed health (includes GPU info)
curl http://localhost:8000/v1/health/detailed | jq

# Response
{
  "status": "healthy",
  "model": {
    "loaded": true,
    "backend": "hf",
    "path": "Qwen/Qwen3-VL-8B-Instruct"
  },
  "gpu": {
    "available": true,
    "count": 1,
    "devices": [{"id": 0, "name": "NVIDIA RTX 3090", ...}]
  }
}
```

#### 2. Inference from URL (Basic)

```bash
curl -X POST http://localhost:8000/v1/inference/url \
  -H "Content-Type: application/json" \
  -d '{
    "video_url": "https://qianwen-res.oss-cn-beijing.aliyuncs.com/Qwen2-VL/space_woaudio.mp4",
    "prompt": "Describe what happens in this video"
  }'

# Response
{
  "response": "This video shows astronauts working in the International Space Station...",
  "prompt": "Describe what happens in this video",
  "video_source": "https://...",
  "backend": "hf"
}
```

#### 3. Inference from URL (Advanced)

```bash
curl -X POST http://localhost:8000/v1/inference/url \
  -H "Content-Type: application/json" \
  -d '{
    "video_url": "https://example.com/video.mp4",
    "prompt": "What activities are shown?",
    "video_params": {
      "fps": 4.0,
      "max_frames": 512,
      "min_pixels": 8192,
      "max_pixels": 524288
    },
    "generation_params": {
      "max_tokens": 1024,
      "temperature": 0.5,
      "top_p": 0.9,
      "top_k": 30
    }
  }'
```

#### 4. Inference from Upload

```bash
curl -X POST http://localhost:8000/v1/inference/upload \
  -F "video=@/path/to/video.mp4" \
  -F "prompt=What is happening in this video?" \
  -F "fps=2.0" \
  -F "max_tokens=2048"
```

#### 5. Python Example

```python
import requests

# Basic inference
response = requests.post(
    "http://localhost:8000/v1/inference/url",
    json={
        "video_url": "https://example.com/video.mp4",
        "prompt": "Describe this video"
    }
)
result = response.json()
print(result["response"])

# File upload
files = {"video": open("video.mp4", "rb")}
data = {"prompt": "What is in this video?"}
response = requests.post(
    "http://localhost:8000/v1/inference/upload",
    files=files,
    data=data
)
print(response.json()["response"])
```

#### 6. TypeScript/JavaScript Example

```typescript
// Using fetch
const response = await fetch("http://localhost:8000/v1/inference/url", {
  method: "POST",
  headers: {"Content-Type": "application/json"},
  body: JSON.stringify({
    video_url: "https://example.com/video.mp4",
    prompt: "Describe this video"
  })
});

const result = await response.json();
console.log(result.response);

// File upload with FormData
const formData = new FormData();
formData.append("video", videoFile);
formData.append("prompt", "What is in this video?");

const uploadResponse = await fetch("http://localhost:8000/v1/inference/upload", {
  method: "POST",
  body: formData
});
```

### Parameter Reference

**Video Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `fps` | float | 2.0 | Frames per second to sample |
| `max_frames` | int | 768 | Maximum number of frames |
| `min_pixels` | int | 4096 | Min pixels per frame (4×32²) |
| `max_pixels` | int | 262144 | Max pixels per frame (256×32²) |
| `total_pixels` | int | 20971520 | Total pixel budget (20480×32²) |

**Generation Parameters:**
| Parameter | Type | Default | Range | Description |
|-----------|------|---------|-------|-------------|
| `max_tokens` | int | 2048 | 1-4096 | Max tokens to generate |
| `temperature` | float | 0.7 | 0.0-2.0 | Sampling temperature |
| `top_p` | float | 0.8 | 0.0-1.0 | Nucleus sampling |
| `top_k` | int | 20 | 0-100 | Top-k sampling |

## 🧪 Testing

### Automated Testing

```bash
# Quick validation (recommended)
cd infrastructure
./test-deployment.sh

# Expected output:
# ✅ Backend health check passed
# ✅ Model is loaded and ready
# ✅ GPU available
# ✅ Frontend accessible
# ✅ CORS headers present
```

### Manual Testing

**Backend verification:**
```bash
# Check if model is loaded
curl http://localhost:8000/v1/health/detailed | jq '.model.loaded'
# Should return: true

# Check GPU status
curl http://localhost:8000/v1/health/detailed | jq '.gpu'

# Watch logs
docker-compose logs -f inference-api
```

**Frontend verification:**
```bash
# Check if accessible
curl -I http://localhost:3000
# Should return: HTTP/1.1 200 OK

# Open in browser
open http://localhost:3000
# Check browser console (F12) for errors
```

**End-to-end test:**
1. Download test video:
   ```bash
   curl -o /tmp/test.mp4 "https://qianwen-res.oss-cn-beijing.aliyuncs.com/Qwen2-VL/space_woaudio.mp4"
   ```
2. Test via API:
   ```bash
   curl -X POST http://localhost:8000/v1/inference/upload \
     -F "video=@/tmp/test.mp4" \
     -F "prompt=Describe this video"
   ```
3. Test via UI: Upload video at http://localhost:3000

### Performance Benchmarks

Expected processing times (with GPU):

| Video Length | Qwen3-VL-4B | Qwen3-VL-8B |
|--------------|-------------|-------------|
| 10 seconds   | 10-15s      | 15-25s      |
| 30 seconds   | 15-30s      | 25-45s      |
| 1 minute     | 30-60s      | 45-90s      |
| 5 minutes    | 90-180s     | 120-240s    |

**First request adds 30-120s** for model loading (once only).

### Troubleshooting

**Backend won't start:**
```bash
# Check logs
docker-compose logs inference-api | tail -20

# Common issues:
# - GPU not available → Check nvidia-smi
# - vLLM not installed → Set MODEL_BACKEND=hf in .env
# - Out of memory → Use smaller model (4B instead of 8B)
```

**Frontend can't connect:**
```bash
# Verify backend is running
curl http://localhost:8000/v1/health

# Check CORS configuration
grep CORS_ORIGINS apps/inference-api/.env
# Should include: http://localhost:3000
```

**Processing takes too long:**
```bash
# Check GPU usage
nvidia-smi

# Optimizations:
# 1. Enable Flash Attention: USE_FLASH_ATTN=true in .env
# 2. Use smaller model: MODEL_PATH=Qwen/Qwen3-VL-4B-Instruct
# 3. Reduce FPS: DEFAULT_VIDEO_FPS=1.5
```

### Health Check Checklist

Before considering deployment-ready:

- [ ] `docker-compose ps` shows both services healthy
- [ ] `/v1/health/detailed` shows `model.loaded: true`
- [ ] Frontend loads without console errors
- [ ] Can upload and process test video in <90s
- [ ] Multiple requests work without degradation
- [ ] `docker stats` shows stable memory usage

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

## ✅ What's Included

This is a **complete, production-ready MVP** with:

### Core Features ✅
- **Video upload interface** - Drag-and-drop with validation
- **Real-time processing status** - Progress bar + timer
- **VLM inference** - Qwen3-VL models (4B/8B/30B/235B)
- **Beautiful result display** - Video playback + generated text
- **Type-safe APIs** - Pydantic (backend) + TypeScript (frontend)
- **Health monitoring** - GPU status, model status
- **Docker deployment** - Single command: `docker-compose up`

### Documentation ✅
- **Comprehensive README** - You're reading it
- **[DEPLOYMENT.md](DEPLOYMENT.md)** - Production deployment guide
- **Automated test script** - `./test-now.sh`
- **Health checks** - `./infrastructure/test-deployment.sh`

## 🎯 Future Enhancements (Optional)

These features are **not required** for the MVP but can be added based on usage patterns:

### If You Hit Timeouts (>3min videos):
- Async job queue (Redis + Celery)
- Polling-based status checks
- Job history database

### If You Need Analytics:
- PostgreSQL for result storage
- Usage metrics and dashboards
- User activity tracking

### If You Need Scale:
- Kubernetes deployment
- Horizontal auto-scaling
- Request rate limiting
- Multi-region deployment

### Advanced Optimizations:
- Model quantization (FP8/INT4)
- Frame caching for repeated videos
- WebSocket streaming
- Multi-model support (A/B testing)

**Recommendation**: Deploy the MVP first, gather usage data, then add features based on real needs.

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

## 🚢 Deployment

### Local Testing
```bash
./test-now.sh
open http://localhost:3000
```

### Production (Lambda GPU VM)

See **[DEPLOYMENT.md](DEPLOYMENT.md)** for complete instructions.

**Quick version:**
```bash
# On your Lambda GPU VM
git clone <your-repo>
cd tru-v2-mvp/infrastructure
docker-compose up -d

# Test
./test-deployment.sh

# Access
open http://YOUR_VM_IP:3000
```

### What You Need for Production
- GPU VM (Lambda, AWS, GCP, Azure)
- NVIDIA GPU (16GB+ VRAM for 8B model)
- Docker + NVIDIA Container Toolkit
- Open ports: 3000 (frontend), 8000 (API)

## 🤝 Development

### Adding Features

**Backend endpoint:**
1. Create route in `apps/inference-api/app/api/routes/`
2. Add Pydantic models for validation
3. Register router in `main.py`
4. Update frontend API client

**Frontend component:**
1. Create component in `apps/web/components/`
2. Import in `app/page.tsx`
3. Use TypeScript for props
4. Style with TailwindCSS

**See `.cursorrules` for detailed patterns and conventions.**

## 📚 Documentation & Resources

### Project Documentation
- **README.md** (this file) - Complete guide: setup, API, testing, deployment
- **[DEPLOYMENT.md](DEPLOYMENT.md)** - Production deployment for Lambda GPU VMs
- **[.cursorrules](.cursorrules)** - AI agent context (architecture, patterns, decisions)

### Component Documentation
- **[apps/web/README.md](apps/web/README.md)** - Frontend architecture
- **[apps/inference-api/env.template](apps/inference-api/env.template)** - Configuration options
- **[/docs endpoint](http://localhost:8000/docs)** - Interactive API documentation (Swagger UI)

### External Resources
- [Qwen3-VL Documentation](https://github.com/QwenLM/Qwen3-VL) - Original model repository
- [FastAPI Documentation](https://fastapi.tiangolo.com/) - Backend framework
- [vLLM Documentation](https://docs.vllm.ai/) - Production inference engine
- [HuggingFace Model Hub](https://huggingface.co/Qwen) - Model downloads

## 💡 Common Questions

**Q: Does this work on Mac/Windows?**  
A: Yes for UI/API testing (CPU mode, very slow). For real video processing, deploy to Lambda GPU VM.

**Q: How much does it cost to run?**  
A: Development: ~$0.60/hour on Lambda GPU. Production 24/7: ~$432/month (or ~$216 with spot instances).

**Q: Can I use a different model?**  
A: Yes! Set `MODEL_PATH` in `.env` to any Qwen3-VL variant (4B, 8B, 30B, 235B) or compatible VLM.

**Q: Why no database/queue?**  
A: MVP uses synchronous, stateless processing (serverless-style). Add queue/DB later only if you hit timeout issues based on real usage.

**Q: How do I scale this?**  
A: Horizontally: Add more GPU workers behind load balancer. Vertically: Use larger GPU for bigger models. See [DEPLOYMENT.md](DEPLOYMENT.md).

---

**Status**: ✅ Production-ready full-stack application  
**Version**: 1.0.0-MVP  
**Last Updated**: October 16, 2025  
**Python**: 3.10+  
**Node**: 20+  
**CUDA**: 12.1+ (for GPU inference)

