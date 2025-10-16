#!/bin/bash
# TRU Platform v2 - Deployment Test Script
# Tests that both backend and frontend are operational

set -e

echo "🧪 TRU Platform v2 - Deployment Test"
echo "===================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
BACKEND_URL="${BACKEND_URL:-http://localhost:8000}"
FRONTEND_URL="${FRONTEND_URL:-http://localhost:3000}"
TIMEOUT=120

echo "Testing endpoints:"
echo "  Backend:  $BACKEND_URL"
echo "  Frontend: $FRONTEND_URL"
echo ""

# Test 1: Backend Health Check
echo "1️⃣  Testing backend health..."
if curl -f -s --max-time 10 "$BACKEND_URL/v1/health" > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} Backend health check passed"
else
    echo -e "${RED}✗${NC} Backend health check failed"
    echo "   Try: docker-compose logs inference-api"
    exit 1
fi

# Test 2: Backend Detailed Health
echo "2️⃣  Testing backend detailed health..."
HEALTH_RESPONSE=$(curl -s --max-time 10 "$BACKEND_URL/v1/health/detailed")
if echo "$HEALTH_RESPONSE" | grep -q '"status"'; then
    echo -e "${GREEN}✓${NC} Backend detailed health passed"
    
    # Check if model is loaded
    if echo "$HEALTH_RESPONSE" | grep -q '"loaded":true'; then
        echo -e "${GREEN}  ✓${NC} Model is loaded and ready"
    else
        echo -e "${YELLOW}  ⚠${NC} Model not loaded yet (may still be loading)"
    fi
    
    # Check GPU
    if echo "$HEALTH_RESPONSE" | grep -q '"available":true'; then
        GPU_COUNT=$(echo "$HEALTH_RESPONSE" | grep -o '"count":[0-9]*' | grep -o '[0-9]*')
        echo -e "${GREEN}  ✓${NC} GPU available (count: $GPU_COUNT)"
    else
        echo -e "${YELLOW}  ⚠${NC} No GPU detected (will be slower)"
    fi
else
    echo -e "${RED}✗${NC} Backend detailed health failed"
    exit 1
fi

# Test 3: Frontend Health
echo "3️⃣  Testing frontend..."
if curl -f -s --max-time 10 "$FRONTEND_URL" > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} Frontend is accessible"
else
    echo -e "${RED}✗${NC} Frontend not accessible"
    echo "   Try: docker-compose logs web"
    exit 1
fi

# Test 4: OpenAPI Documentation
echo "4️⃣  Testing API documentation..."
if curl -f -s --max-time 10 "$BACKEND_URL/openapi.json" > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} OpenAPI schema available"
else
    echo -e "${YELLOW}⚠${NC} OpenAPI schema not accessible (non-critical)"
fi

# Test 5: CORS Configuration
echo "5️⃣  Testing CORS headers..."
CORS_HEADERS=$(curl -s -I --max-time 10 "$BACKEND_URL/v1/health" | grep -i "access-control-allow-origin" || true)
if [ -n "$CORS_HEADERS" ]; then
    echo -e "${GREEN}✓${NC} CORS headers present"
else
    echo -e "${YELLOW}⚠${NC} CORS headers not detected (may cause frontend issues)"
fi

# Summary
echo ""
echo "===================================="
echo -e "${GREEN}✅ All critical tests passed!${NC}"
echo ""
echo "Next steps:"
echo "  1. Open frontend: $FRONTEND_URL"
echo "  2. Upload a test video"
echo "  3. Enter a prompt"
echo "  4. Process and verify results"
echo ""
echo "Useful commands:"
echo "  - View logs: docker-compose logs -f"
echo "  - Check GPU: nvidia-smi"
echo "  - API docs: $BACKEND_URL/docs"
echo ""

