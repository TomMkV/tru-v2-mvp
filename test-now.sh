#!/bin/bash
# TRU Platform v2 - Quick Test Script
# Run this to test your local setup

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║    TRU Platform v2 - Quick Local Test                 ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════╝${NC}"
echo ""

# Check prerequisites
echo -e "${YELLOW}📋 Checking prerequisites...${NC}"
echo ""

# Docker
if command -v docker &> /dev/null; then
    echo -e "${GREEN}✅ Docker installed:${NC} $(docker --version)"
else
    echo -e "${RED}❌ Docker not found${NC}"
    echo "   Install from: https://docs.docker.com/get-docker/"
    exit 1
fi

# Docker Compose
if docker compose version &> /dev/null || docker-compose --version &> /dev/null; then
    echo -e "${GREEN}✅ Docker Compose installed${NC}"
else
    echo -e "${RED}❌ Docker Compose not found${NC}"
    exit 1
fi

# GPU
if command -v nvidia-smi &> /dev/null; then
    echo -e "${GREEN}✅ GPU detected${NC}"
    nvidia-smi --query-gpu=name,memory.total --format=csv,noheader | head -1
else
    echo -e "${YELLOW}⚠️  No GPU detected${NC}"
    echo "   Will run on CPU (very slow but works for testing)"
    echo "   For production, deploy on Lambda GPU VM"
fi

echo ""
echo -e "${YELLOW}🚀 Starting services...${NC}"
echo ""

cd "$(dirname "$0")/infrastructure"

# Check if already running
if docker compose ps | grep -q "Up"; then
    echo -e "${YELLOW}Services already running. Restarting...${NC}"
    docker compose restart
else
    echo "This will:"
    echo "  1. Download model (~16GB on first run)"
    echo "  2. Start backend (FastAPI)"
    echo "  3. Start frontend (NextJS)"
    echo ""
    read -p "Continue? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Cancelled."
        exit 0
    fi
    
    docker compose up -d
fi

echo ""
echo -e "${YELLOW}⏳ Waiting for services to start...${NC}"
echo ""

# Wait for backend (max 120 seconds)
echo -n "Waiting for backend"
for i in {1..120}; do
    if curl -s http://localhost:8000/v1/health > /dev/null 2>&1; then
        echo -e " ${GREEN}✓${NC}"
        break
    fi
    echo -n "."
    sleep 1
done

# Wait for frontend (max 30 seconds)
echo -n "Waiting for frontend"
for i in {1..30}; do
    if curl -s http://localhost:3000 > /dev/null 2>&1; then
        echo -e " ${GREEN}✓${NC}"
        break
    fi
    echo -n "."
    sleep 1
done

echo ""
echo -e "${YELLOW}🧪 Running health checks...${NC}"
echo ""

# Run automated tests
if [ -f "./test-deployment.sh" ]; then
    ./test-deployment.sh
else
    # Fallback manual checks
    echo "1️⃣  Testing backend health..."
    if curl -s http://localhost:8000/v1/health | grep -q "healthy"; then
        echo -e "${GREEN}✓${NC} Backend is healthy"
    else
        echo -e "${RED}✗${NC} Backend health check failed"
    fi
    
    echo "2️⃣  Testing frontend..."
    if curl -s -I http://localhost:3000 | grep -q "200"; then
        echo -e "${GREEN}✓${NC} Frontend is accessible"
    else
        echo -e "${RED}✗${NC} Frontend not accessible"
    fi
fi

echo ""
echo -e "${BLUE}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║    ✅ Setup Complete!                                  ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${GREEN}🎉 Your TRU Platform v2 is running!${NC}"
echo ""
echo "📍 Access Points:"
echo "   Frontend:  http://localhost:3000"
echo "   API Docs:  http://localhost:8000/docs"
echo "   Health:    http://localhost:8000/v1/health/detailed"
echo ""
echo "🎬 Next Steps:"
echo "   1. Open frontend: open http://localhost:3000"
echo "   2. Upload a test video (MP4, AVI, MOV, etc.)"
echo "   3. Enter prompt: 'Describe what happens in this video'"
echo "   4. Click 'Process Video'"
echo ""
echo "📊 Monitoring:"
echo "   View logs:     docker compose logs -f"
echo "   Stop services: docker compose down"
echo "   Restart:       docker compose restart"
echo ""
echo "📖 Documentation:"
echo "   README.md         - Complete setup, API, testing guide"
echo "   DEPLOYMENT.md     - Production deployment"
echo "   .cursorrules      - AI agent context (architecture & patterns)"
echo ""

