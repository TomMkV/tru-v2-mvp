# TRU Platform v2 - Deployment Guide

Complete deployment instructions for Lambda GPU VM or any cloud GPU infrastructure.

## Prerequisites

### Hardware Requirements
- GPU with CUDA support (NVIDIA)
- VRAM: 
  - Minimum: 16GB (for Qwen3-VL-4B/8B)
  - Recommended: 24GB+ (for Qwen3-VL-8B with headroom)
  - Large models: 48GB+ (for Qwen3-VL-30B)
- RAM: 32GB+ recommended
- Disk: 50GB+ (for model cache and Docker images)

### Software Requirements
- Ubuntu 22.04 LTS (recommended) or similar Linux distribution
- NVIDIA Driver 525+ (for CUDA 12.1)
- Docker 24.0+
- Docker Compose 2.0+
- NVIDIA Container Toolkit

## Quick Deployment (Docker Compose)

### Step 1: Install Dependencies

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Install NVIDIA Container Toolkit
distribution=$(. /etc/os-release;echo $ID$VERSION_ID)
curl -s -L https://nvidia.github.io/libnvidia-container/gpgkey | sudo apt-key add -
curl -s -L https://nvidia.github.io/libnvidia-container/$distribution/libnvidia-container.list | \
  sudo tee /etc/apt/sources.list.d/nvidia-container-toolkit.list

sudo apt-get update
sudo apt-get install -y nvidia-container-toolkit
sudo nvidia-ctk runtime configure --runtime=docker
sudo systemctl restart docker

# Verify GPU access
docker run --rm --gpus all nvidia/cuda:12.1.0-base-ubuntu22.04 nvidia-smi
```

### Step 2: Clone Repository

```bash
cd ~
git clone https://github.com/YOUR_USERNAME/tru-v2-mvp.git
cd tru-v2-mvp
```

### Step 3: Configure Environment

```bash
# Backend configuration
cd apps/inference-api
cp env.template .env

# Edit .env with your preferences
nano .env

# Key settings:
# MODEL_PATH=Qwen/Qwen3-VL-8B-Instruct  # or 4B for smaller GPU
# MODEL_BACKEND=hf                       # or vllm for production
# USE_FLASH_ATTN=true                   # Enable flash attention
```

### Step 4: Build and Start Services

```bash
cd ../../infrastructure

# Build containers (first time)
docker-compose build

# Start services
docker-compose up -d

# View logs
docker-compose logs -f

# Check health
curl http://localhost:8000/v1/health
curl http://localhost:3000
```

### Step 5: Access the Application

Open your browser to:
- **Frontend**: http://YOUR_VM_IP:3000
- **API Docs**: http://YOUR_VM_IP:8000/docs
- **Health Check**: http://YOUR_VM_IP:8000/v1/health/detailed

## Configuration Options

### Backend (.env)

```bash
# Model Configuration
MODEL_PATH=Qwen/Qwen3-VL-8B-Instruct
MODEL_BACKEND=hf                    # "hf" or "vllm"
USE_FLASH_ATTN=true                 # Recommended for performance

# vLLM Settings (if using vllm backend)
VLLM_GPU_MEMORY_UTILIZATION=0.90   # Higher in production
VLLM_TENSOR_PARALLEL_SIZE=1        # Multi-GPU: set to GPU count

# Video Processing
DEFAULT_VIDEO_FPS=2.0
DEFAULT_MAX_FRAMES=768
IMAGE_PATCH_SIZE=16

# Generation
MAX_NEW_TOKENS=2048
TEMPERATURE=0.7

# API
MAX_VIDEO_SIZE_MB=1000
CORS_ORIGINS=["http://YOUR_VM_IP:3000"]

# Logging
LOG_LEVEL=INFO
```

### Frontend (docker-compose.yml)

```yaml
services:
  web:
    environment:
      # Update to your VM's public IP
      - NEXT_PUBLIC_API_URL=http://YOUR_VM_IP:8000
```

## Using vLLM Backend (Production)

For better performance, use vLLM:

### Step 1: Update requirements.txt

```bash
cd apps/inference-api

# Uncomment vLLM in requirements.txt
sed -i 's/# vllm>=0.11.0/vllm>=0.11.0/' requirements.txt
```

### Step 2: Update Configuration

```bash
# In .env
MODEL_BACKEND=vllm
VLLM_GPU_MEMORY_UTILIZATION=0.90
VLLM_TENSOR_PARALLEL_SIZE=1  # or GPU count
```

### Step 3: Rebuild

```bash
cd ../../infrastructure
docker-compose down
docker-compose build inference-api
docker-compose up -d
```

## Monitoring and Maintenance

### View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f inference-api
docker-compose logs -f web
```

### Check GPU Usage

```bash
# On host
nvidia-smi

# In container
docker exec -it tru-v2-inference-api nvidia-smi
```

### Check Health

```bash
# Basic health
curl http://localhost:8000/v1/health

# Detailed (includes GPU info)
curl http://localhost:8000/v1/health/detailed | jq
```

### Update Services

```bash
cd infrastructure

# Pull latest code
git pull

# Rebuild and restart
docker-compose down
docker-compose build
docker-compose up -d
```

## Troubleshooting

### Model Won't Load

**Error**: `RuntimeError: vLLM backend requested but not available`

**Solution**: 
1. Check that vLLM is uncommented in `requirements.txt`
2. Or set `MODEL_BACKEND=hf` in `.env`
3. Rebuild container

**Error**: `CUDA out of memory`

**Solution**:
1. Use smaller model (Qwen3-VL-4B instead of 8B)
2. Reduce `VLLM_GPU_MEMORY_UTILIZATION`
3. Lower `DEFAULT_MAX_FRAMES` and `DEFAULT_MAX_PIXELS`

### GPU Not Detected

**Error**: Container can't access GPU

**Solution**:
```bash
# Verify nvidia-container-toolkit
sudo nvidia-ctk runtime configure --runtime=docker
sudo systemctl restart docker

# Test GPU access
docker run --rm --gpus all nvidia/cuda:12.1.0-base-ubuntu22.04 nvidia-smi
```

### Frontend Can't Connect to Backend

**Error**: CORS error or connection refused

**Solution**:
1. Check `CORS_ORIGINS` in backend `.env` includes frontend URL
2. Verify `NEXT_PUBLIC_API_URL` in docker-compose.yml
3. Ensure both containers are on same network

### Long Processing Times

**Observation**: Videos take 2-3 minutes to process

**This is normal** for:
- Large videos (>1 minute)
- High resolution videos
- First request (model loading)

**To optimize**:
1. Enable Flash Attention: `USE_FLASH_ATTN=true`
2. Use vLLM backend
3. Reduce FPS sampling: `DEFAULT_VIDEO_FPS=1.0`
4. Limit frames: `DEFAULT_MAX_FRAMES=512`

## Performance Tuning

### For Qwen3-VL-4B (16GB GPU)

```bash
MODEL_PATH=Qwen/Qwen3-VL-4B-Instruct
MODEL_BACKEND=hf
USE_FLASH_ATTN=true
DEFAULT_VIDEO_FPS=2.0
DEFAULT_MAX_FRAMES=768
```

### For Qwen3-VL-8B (24GB GPU)

```bash
MODEL_PATH=Qwen/Qwen3-VL-8B-Instruct
MODEL_BACKEND=vllm
VLLM_GPU_MEMORY_UTILIZATION=0.90
USE_FLASH_ATTN=true
DEFAULT_VIDEO_FPS=2.0
DEFAULT_MAX_FRAMES=768
```

### For Qwen3-VL-30B (48GB GPU)

```bash
MODEL_PATH=Qwen/Qwen3-VL-30B-Instruct
MODEL_BACKEND=vllm
VLLM_GPU_MEMORY_UTILIZATION=0.90
VLLM_TENSOR_PARALLEL_SIZE=1
DEFAULT_VIDEO_FPS=1.5
DEFAULT_MAX_FRAMES=512
```

## Security Considerations

### Production Deployment

1. **Use HTTPS**: Place Nginx reverse proxy with SSL
2. **Firewall**: Restrict ports 8000/3000 to trusted IPs
3. **Rate Limiting**: Add Nginx rate limiting
4. **Authentication**: Add API key authentication (future)
5. **File Size Limits**: Already enforced (1GB max)

### Nginx Reverse Proxy (Recommended)

```nginx
server {
    listen 80;
    server_name your-domain.com;

    # Frontend
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # Backend API
    location /api/ {
        rewrite ^/api(.*)$ $1 break;
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        
        # Increase timeout for long inference
        proxy_read_timeout 600s;
        proxy_send_timeout 600s;
        
        # Large file upload
        client_max_body_size 1000M;
    }
}
```

## Backup and Restore

### Model Cache

Models are cached in Docker volume `model-cache`. To back up:

```bash
# Backup
docker run --rm -v tru-v2-mvp_model-cache:/data -v $(pwd):/backup \
  ubuntu tar czf /backup/model-cache-backup.tar.gz /data

# Restore
docker run --rm -v tru-v2-mvp_model-cache:/data -v $(pwd):/backup \
  ubuntu tar xzf /backup/model-cache-backup.tar.gz -C /
```

### Configuration

```bash
# Backup config
cp apps/inference-api/.env apps/inference-api/.env.backup
cp infrastructure/docker-compose.yml infrastructure/docker-compose.yml.backup
```

## Cost Optimization

### Lambda GPU Cloud

- **Qwen3-VL-4B**: ~$0.50-0.80/hour on RTX A6000 (48GB)
- **Qwen3-VL-8B**: ~$0.50-0.80/hour on RTX A6000 (48GB)
- **Qwen3-VL-30B**: ~$1.50-2.00/hour on A100 (80GB)

### Tips

1. **Spot Instances**: Use when available (50-70% savings)
2. **Stop When Idle**: Don't run 24/7 during development
3. **Model Size**: Start with 4B, upgrade only if needed
4. **Batch Requests**: Process multiple videos in sequence

## Support

For issues:
1. Check logs: `docker-compose logs -f`
2. Review health: `curl http://localhost:8000/v1/health/detailed`
3. Verify GPU: `nvidia-smi`
4. GitHub Issues: [Create issue](https://github.com/YOUR_USERNAME/tru-v2-mvp/issues)

---

**Deployment Checklist**:
- [ ] Docker and NVIDIA toolkit installed
- [ ] Repository cloned
- [ ] Backend `.env` configured
- [ ] Docker containers built
- [ ] Services started and healthy
- [ ] Frontend accessible
- [ ] Test video processed successfully
- [ ] Monitoring configured
- [ ] Backups scheduled (if production)

