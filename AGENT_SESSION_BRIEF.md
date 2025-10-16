# Agent Session Brief - TRU V2 MVP

## 🎯 Quick Context

You are continuing development on **TRU V2 MVP**, a VLM microservice platform for video + prompt processing.

**Current Status**: ✅ Backend complete, 🚧 Frontend pending

## 📍 Where We Are

### What's Done ✅

1. **FastAPI Inference Service** (`apps/inference-api/`)
   - Model loading & management (HF + vLLM backends)
   - Two inference endpoints (URL + upload)
   - Health check endpoints
   - Configuration management
   - Docker setup

2. **Core Video Processing** (`qwen_vl_utils/`)
   - Multi-backend video decoding
   - Smart frame sampling
   - Adaptive resolution scaling
   - Extracted from Qwen3-VL repo

3. **Documentation**
   - README.md - User-facing documentation
   - IMPLEMENTATION_CONTEXT.md - Technical details
   - This file - Quick brief

### What's Next 🚧

1. **NextJS Frontend** (`apps/web/`)
   - Not yet created
   - Should include: video upload, prompt input, results display
   - Target: Modern, responsive UI with TailwindCSS

2. **Testing Infrastructure**
   - No tests yet
   - Need: unit tests, integration tests, E2E tests

3. **API Type Contracts** (`packages/api-types/`)
   - Not yet created
   - Generate TypeScript types from OpenAPI schema

## 🚀 Quick Start Commands

```bash
# Navigate to project
cd /Users/thomaspeterson/Projects/tru-v2-mvp

# Start backend only (for testing)
cd apps/inference-api
pip install -r requirements.txt
uvicorn app.main:app --reload

# Or use Docker
cd infrastructure
docker-compose up

# Test API
curl http://localhost:8000/v1/health
open http://localhost:8000/docs
```

## 🏗️ Repository Structure

```
tru-v2-mvp/
├── apps/
│   ├── inference-api/     ✅ COMPLETE - Python FastAPI
│   │   ├── app/
│   │   │   ├── main.py           # App entry point
│   │   │   ├── core/
│   │   │   │   ├── config.py     # Settings
│   │   │   │   └── model.py      # Model manager
│   │   │   └── api/routes/
│   │   │       ├── inference.py  # Inference endpoints
│   │   │       └── health.py     # Health checks
│   │   └── qwen_vl_utils/        # Video processing
│   │
│   └── web/               🚧 TODO - NextJS frontend
│
├── infrastructure/        ✅ COMPLETE
│   └── docker-compose.yml
│
└── [documentation files]  ✅ COMPLETE
```

## 🎯 Suggested Next Task

**If focusing on frontend:**

```bash
# 1. Create NextJS app
cd apps
npx create-next-app@latest web --typescript --tailwind --app

# 2. Install dependencies
cd web
npm install @tanstack/react-query axios zod react-hook-form

# 3. Generate API client
npm install openapi-typescript-codegen
npx openapi-typescript-codegen \
  --input http://localhost:8000/openapi.json \
  --output src/lib/api-client

# 4. Build components
# - VideoUpload.tsx
# - PromptInput.tsx  
# - InferenceStatus.tsx
# - ResultDisplay.tsx
```

**If focusing on testing:**

```bash
# 1. Setup pytest structure
cd apps/inference-api
mkdir -p tests/{unit,integration}

# 2. Install test dependencies
pip install pytest pytest-asyncio pytest-cov httpx

# 3. Create test files
# - tests/unit/test_model.py
# - tests/integration/test_inference.py
```

## 🔑 Key Files to Understand

| File | Purpose | Priority |
|------|---------|----------|
| `apps/inference-api/app/main.py` | FastAPI app setup | HIGH |
| `apps/inference-api/app/core/model.py` | Model loading & inference | HIGH |
| `apps/inference-api/app/api/routes/inference.py` | API endpoints | HIGH |
| `apps/inference-api/qwen_vl_utils/vision_process.py` | Video processing | MEDIUM |
| `apps/inference-api/app/core/config.py` | Configuration | MEDIUM |
| `README.md` | User documentation | LOW |
| `IMPLEMENTATION_CONTEXT.md` | Technical deep-dive | LOW |

## 🧠 Critical Technical Decisions

1. **Python backend (not Go)** - PyTorch/Transformers have no Go alternatives
2. **Monorepo structure** - Single source of truth, easier development
3. **FastAPI framework** - Async support, auto docs, type safety
4. **Dual model backends** - HuggingFace (dev) + vLLM (prod)
5. **Extracted qwen-vl-utils** - Full control over video processing

## 📡 API Endpoints Available

```bash
# Health checks
GET  /v1/health
GET  /v1/health/detailed

# Inference
POST /v1/inference/url      # Process video from URL
POST /v1/inference/upload   # Process uploaded video

# Documentation
GET  /docs                  # Swagger UI
GET  /openapi.json          # OpenAPI schema
```

## 🔧 Environment Variables

Key variables in `apps/inference-api/env.template`:

```bash
MODEL_PATH=Qwen/Qwen3-VL-8B-Instruct  # Model to load
MODEL_BACKEND=hf                       # "hf" or "vllm"
USE_FLASH_ATTN=true                   # Performance boost
DEFAULT_VIDEO_FPS=2.0                  # Frame sampling
MAX_NEW_TOKENS=2048                    # Generation limit
```

## 🐛 Known Issues

1. **Model loading takes 30-120s** - Expected, loads on startup
2. **Long videos can OOM** - Use `total_pixels` parameter
3. **First request slow** - Model warm-up, subsequent faster
4. **torchvision <0.19 no HTTPS** - Use torchcodec (already installed)

## 💡 Development Tips

### Testing the API

```bash
# Simple health check
curl http://localhost:8000/v1/health

# Test inference with URL
curl -X POST http://localhost:8000/v1/inference/url \
  -H "Content-Type: application/json" \
  -d '{
    "video_url": "https://qianwen-res.oss-cn-beijing.aliyuncs.com/Qwen2-VL/space_woaudio.mp4",
    "prompt": "Describe this video"
  }'

# Test inference with upload
curl -X POST http://localhost:8000/v1/inference/upload \
  -F "video=@/path/to/video.mp4" \
  -F "prompt=What happens in this video?"
```

### Interactive API Docs

Open http://localhost:8000/docs - you can test endpoints directly from browser.

### Checking GPU Status

```bash
# Detailed health check includes GPU info
curl http://localhost:8000/v1/health/detailed | jq

# Or use nvidia-smi
nvidia-smi
```

## 📚 Reference Documents

- **README.md** - User guide, quickstart, API docs
- **IMPLEMENTATION_CONTEXT.md** - Architecture decisions, code patterns, optimization tips
- **env.template** - Configuration options
- **docker-compose.yml** - Container orchestration

## 🎯 Recommended Implementation Order

### Phase 1: Frontend Foundation
1. ✅ Initialize NextJS project
2. ✅ Setup TailwindCSS + shadcn/ui
3. ✅ Generate API client from OpenAPI
4. ✅ Create basic layout

### Phase 2: Core Features
5. ✅ VideoUpload component (drag-and-drop)
6. ✅ PromptInput component (textarea + settings)
7. ✅ InferenceStatus component (loading states)
8. ✅ ResultDisplay component (show response)
9. ✅ Connect components to API

### Phase 3: Enhancement
10. ✅ Error handling (network errors, validation)
11. ✅ Upload progress indicator
12. ✅ Advanced settings panel (fps, tokens, etc.)
13. ✅ Result history (local storage)
14. ✅ Copy/share functionality

### Phase 4: Testing
15. ✅ Backend unit tests
16. ✅ Backend integration tests
17. ✅ Frontend component tests
18. ✅ E2E tests (Playwright)

### Phase 5: Production
19. ✅ Environment configs (dev/staging/prod)
20. ✅ CI/CD pipeline (GitHub Actions)
21. ✅ Deployment docs
22. ✅ Monitoring & logging

## 🤔 Common Questions

**Q: Which model should I use?**
A: For development: Qwen3-VL-4B or 8B. For production: 8B or larger with vLLM.

**Q: Why is first request slow?**
A: Model loading. Use lifespan manager (already implemented) to load on startup.

**Q: Can I use Go for the backend?**
A: No. PyTorch/Transformers are Python-only. See IMPLEMENTATION_CONTEXT.md "Why Python?" section.

**Q: Should I use vLLM?**
A: For development: No (HF is simpler). For production: Yes (2-10x faster).

**Q: How do I add a new endpoint?**
A: Add route in `app/api/routes/`, add Pydantic models, update OpenAPI docs.

**Q: Where are the tests?**
A: Not yet implemented. See "Phase 4: Testing" above.

## 🆘 Troubleshooting

### Backend won't start
```bash
# Check Python version (needs 3.10+)
python --version

# Check CUDA available
python -c "import torch; print(torch.cuda.is_available())"

# Check logs
docker-compose logs -f inference-api
```

### Frontend can't connect to API
```bash
# Check backend is running
curl http://localhost:8000/v1/health

# Check CORS settings in app/core/config.py
CORS_ORIGINS=["http://localhost:3000"]
```

### Model loading fails
```bash
# Check MODEL_PATH exists on HuggingFace
# Check GPU memory available
nvidia-smi

# Check logs
tail -f /var/log/tru-v2-inference.log
```

## ✅ Pre-flight Checklist

Before starting development:
- [ ] Backend runs: `docker-compose up` works
- [ ] API accessible: `curl http://localhost:8000/v1/health` returns 200
- [ ] GPU available: `nvidia-smi` shows GPU
- [ ] Docs readable: http://localhost:8000/docs loads
- [ ] Environment configured: `.env` file created from template

## 🎬 You're Ready!

The backend is complete and functional. Your primary focus should be:

1. **Implementing the NextJS frontend** - This is the highest priority
2. **Adding tests** - Ensure reliability
3. **Writing deployment docs** - Make it production-ready

All the hard work (VLM integration, video processing, model management) is done. You're building the interface and polish.

Good luck! 🚀

---

**Created**: 2025-01-16  
**Status**: Backend complete, frontend pending  
**Next Session Focus**: Frontend implementation

