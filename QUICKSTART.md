# TRU Platform v2 - Quick Start Guide

Get up and running in 5 minutes (after prerequisites).

## Prerequisites

✅ Docker & Docker Compose installed  
✅ NVIDIA GPU with CUDA support  
✅ NVIDIA Container Toolkit configured  
✅ 16GB+ VRAM (for Qwen3-VL-8B)

## Launch Application

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

# 5. Test deployment
./test-deployment.sh

# 6. Open in browser
# Frontend: http://localhost:3000
# API Docs: http://localhost:8000/docs
```

## First Video Analysis

1. Open http://localhost:3000
2. Drag and drop a video file (MP4, AVI, MOV, etc.)
3. Enter a prompt: "Describe what happens in this video"
4. Click "Process Video"
5. Wait 30s-3min depending on video length
6. View results!

## Common Commands

```bash
# View logs
docker-compose logs -f

# Restart services
docker-compose restart

# Stop services
docker-compose down

# Rebuild after code changes
docker-compose up -d --build

# Check GPU usage
nvidia-smi

# Check API health
curl http://localhost:8000/v1/health/detailed | jq
```

## Troubleshooting

**Model won't load?**
- Check logs: `docker-compose logs inference-api`
- Verify GPU: `nvidia-smi`
- Ensure 16GB+ VRAM available

**Frontend can't connect?**
- Check backend health: `curl http://localhost:8000/v1/health`
- Verify CORS settings in `apps/inference-api/.env`

**Processing too slow?**
- Enable Flash Attention: `USE_FLASH_ATTN=true` in `.env`
- Use smaller model: `MODEL_PATH=Qwen/Qwen3-VL-4B-Instruct`
- Reduce FPS: `DEFAULT_VIDEO_FPS=1.5`

## What's Next?

- Read [DEPLOYMENT.md](DEPLOYMENT.md) for production deployment
- Review [README.md](README.md) for architecture details
- Check [IMPLEMENTATION_CONTEXT.md](IMPLEMENTATION_CONTEXT.md) for technical deep-dive

## Performance Expectations

- **Short videos (<30s)**: 15-30 seconds
- **Medium videos (1-2min)**: 30-90 seconds
- **Long videos (5min+)**: 2-5 minutes

First request takes longer (model loading).

---

**Need Help?** Check logs first: `docker-compose logs -f`

