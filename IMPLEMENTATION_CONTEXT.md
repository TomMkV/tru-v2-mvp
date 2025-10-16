# Implementation Context for Next Agent Session

This document provides detailed context about the implementation decisions, code patterns, and technical details for continuing development.

## 🎯 Project Goal

Build a production-ready VLM (Vision Language Model) microservice that:
1. Accepts video uploads or URLs + text prompts
2. Processes videos using Qwen3-VL models
3. Returns natural language descriptions/analyses
4. Provides a modern web interface (NextJS)

## 🏛️ Architecture Decisions

### Why Python for Backend? (NOT Go)

**Critical constraint**: PyTorch, Transformers, and vLLM are Python-native with no viable Go alternatives.

**Options considered**:
1. ❌ **Go with Python subprocess** - Adds latency, complexity, memory duplication
2. ❌ **Go with Python bindings** - Memory management nightmare, debugging hell
3. ❌ **Rewrite in Go** - Would require reimplementing PyTorch (impossible)
4. ✅ **Python with FastAPI** - Direct access to ML stack, modern async support

**Result**: FastAPI provides comparable performance to Go for I/O-bound workloads (10-15k req/s), and the bottleneck is GPU inference (0.1-10 req/s), not the API layer.

### Why Monorepo?

**Benefits for this project**:
- Single source of truth for API contracts
- Coordinated releases
- Easier local development (single `docker-compose up`)
- Can split later if organizational needs change

**Alternative considered**: Multi-repo with separate `vlm-inference-service` and `vlm-web-ui` repos. Rejected due to early-stage coordination overhead.

### Why FastAPI over Alternatives?

| Framework | Async | Type Safety | Docs | WebSocket | Verdict |
|-----------|-------|-------------|------|-----------|---------|
| Flask | ❌ | ❌ | Manual | Via extensions | Legacy |
| Django | ⚠️ | ⚠️ | Good | Via Channels | Overkill |
| FastAPI | ✅ | ✅ (Pydantic) | Auto | ✅ | Perfect fit |

FastAPI chosen for:
- Native async/await (critical for long-running inference)
- Automatic OpenAPI docs (frontend can generate client)
- Pydantic validation (type-safe contracts)
- WebSocket support (future streaming)

## 📦 Extracted Components from Qwen3-VL

### What Was Taken & Why

#### 1. `qwen_vl_utils/` Package
**Source**: `Qwen3-VL/qwen-vl-utils/src/qwen_vl_utils/`  
**Destination**: `apps/inference-api/qwen_vl_utils/`

**Key functions**:
- `fetch_video()` - Multi-backend video loading (torchvision/decord/torchcodec)
- `process_vision_info()` - Extracts and processes video/image from messages
- `smart_resize()` - Adaptive resolution scaling based on pixel budgets
- `smart_nframes()` - Intelligent frame sampling with fps control

**Why copied vs pip install?**:
- Need full control for optimization
- Can modify for specific use cases
- No dependency on Qwen repo updates
- Apache 2.0 license allows this

#### 2. Model Loading Patterns
**Source**: `Qwen3-VL/web_demo_mm.py` lines 66-105, 178-198

**Adapted into**: `apps/inference-api/app/core/model.py`

**Key patterns**:
- Dual backend support (HF Transformers vs vLLM)
- Lazy model loading in lifespan manager
- Processor loading and configuration
- Input preparation for both backends

**Changes made**:
- Wrapped in `ModelManager` class
- Added async/await support
- Separated concerns (config, loading, inference)
- Added proper error handling

#### 3. Message Format
**Source**: Qwen3-VL README examples

**Implemented in**: `apps/inference-api/app/core/model.py::_prepare_messages()`

**Format**:
```python
messages = [{
    "role": "user",
    "content": [
        {
            "video": "<path_or_url>",
            "min_pixels": 4 * 32 * 32,
            "max_pixels": 256 * 32 * 32,
            "total_pixels": 20480 * 32 * 32,
            "fps": 2.0,
            "max_frames": 768
        },
        {"type": "text", "text": "<prompt>"}
    ]
}]
```

## 🔧 Implementation Details

### Model Loading Strategy

**File**: `app/core/model.py`

**Pattern**: Lifespan-managed singleton
```python
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Load model once
    model_manager = ModelManager()
    await model_manager.load_model()
    app.state.model_manager = model_manager
    yield
    # Shutdown: Cleanup
    await model_manager.cleanup()
```

**Why this pattern?**:
- Models are large (4-235GB), loading takes 30-120 seconds
- Should load once on startup, not per request
- Lifespan manager ensures proper cleanup
- State attached to app for easy access in routes

### Video Processing Pipeline

**File**: `qwen_vl_utils/vision_process.py`

**Flow**:
```
Input Video URL/Path
    ↓
Backend Selection (torchcodec > decord > torchvision)
    ↓
Frame Extraction (decode video)
    ↓
Smart Frame Sampling (fps-based or frame-count-based)
    ↓
Smart Resizing (pixel budget constraints)
    ↓
Tensor Conversion (to PyTorch)
    ↓
Return to Model
```

**Key parameters**:
- `fps`: Frames per second to sample (default: 2.0)
- `max_frames`: Maximum frames (default: 768)
- `min_pixels`: Minimum resolution per frame (default: 4 * 32²)
- `max_pixels`: Maximum resolution per frame (default: 256 * 32²)
- `total_pixels`: Total pixel budget across all frames (default: 20480 * 32²)

**Memory calculation**:
```python
# For a 1-minute video at 2 fps = 120 frames
# With max_pixels = 256 * 32 * 32 = 262,144 pixels per frame
# Total: 120 frames × 262,144 pixels × 3 channels × 4 bytes (float32)
# ≈ 377 MB just for video tensor
```

### Inference Endpoints

**File**: `app/api/routes/inference.py`

#### Endpoint 1: URL-based Inference
```python
POST /v1/inference/url
```

**Use case**: Process video from public URL  
**Advantage**: No upload overhead, streaming-capable  
**Limitation**: Requires accessible URL

#### Endpoint 2: Upload-based Inference
```python
POST /v1/inference/upload
```

**Use case**: Process local video files  
**Implementation**: Multipart form data, saves to temp file, processes, deletes  
**Limitation**: 1GB max file size (configurable)

**Why two endpoints?**:
- URL endpoint is more efficient (no upload time)
- Upload endpoint needed for private/local videos
- Different validation logic (URL reachability vs file size)

### Configuration Management

**File**: `app/core/config.py`

**Pattern**: Pydantic Settings with environment variable override

```python
class Settings(BaseSettings):
    MODEL_PATH: str = "Qwen/Qwen3-VL-8B-Instruct"
    MODEL_BACKEND: str = "hf"
    # ... other settings
    
    class Config:
        env_file = ".env"
```

**Why Pydantic Settings?**:
- Type validation at startup
- Automatic environment variable loading
- IDE autocomplete support
- Easy testing with dependency injection

### Error Handling Strategy

**Pattern**: Fail fast with detailed errors

```python
try:
    response = await model_manager.generate(...)
except Exception as e:
    logger.error(f"Inference failed: {e}", exc_info=True)
    raise HTTPException(status_code=500, detail=str(e))
```

**Why this approach?**:
- Explicit error messages help debugging
- Stack traces logged server-side
- Client gets actionable error message
- No silent failures

## 🧪 Testing Strategy (To Be Implemented)

### Unit Tests
**Location**: `apps/inference-api/tests/unit/`

**Coverage needed**:
- [ ] `test_model_loading.py` - Test both HF and vLLM backends
- [ ] `test_video_processing.py` - Test frame sampling, resizing
- [ ] `test_config.py` - Test environment variable parsing

### Integration Tests
**Location**: `apps/inference-api/tests/integration/`

**Coverage needed**:
- [ ] `test_inference_url.py` - Test URL endpoint with sample video
- [ ] `test_inference_upload.py` - Test upload endpoint
- [ ] `test_health_checks.py` - Test health endpoints

### E2E Tests
**Location**: `apps/web/tests/e2e/` (after frontend implementation)

**Coverage needed**:
- [ ] Full user flow: upload video → enter prompt → get result
- [ ] Error states: invalid video, timeout, model error

## 🎨 Frontend Implementation Guide (Next Priority)

### Recommended Stack

```typescript
// Technology choices
Framework: NextJS 14+ (App Router)
Language: TypeScript
Styling: TailwindCSS + shadcn/ui
State: React Query (for API calls)
Forms: React Hook Form + Zod validation
API Client: openapi-typescript-codegen (generate from OpenAPI)
```

### File Structure

```
apps/web/
├── src/
│   ├── app/
│   │   ├── page.tsx              # Home page with video upload
│   │   ├── layout.tsx            # Root layout
│   │   └── api/                  # API routes (optional)
│   ├── components/
│   │   ├── VideoUpload.tsx       # Drag-and-drop upload
│   │   ├── PromptInput.tsx       # Text input for prompt
│   │   ├── InferenceStatus.tsx   # Loading state
│   │   └── ResultDisplay.tsx     # Show generated text
│   ├── lib/
│   │   ├── api-client.ts         # Generated from OpenAPI
│   │   └── utils.ts
│   └── types/
│       └── api.ts                # TypeScript types
├── public/
├── package.json
└── next.config.js
```

### Key Components to Build

#### 1. VideoUpload Component
```typescript
interface VideoUploadProps {
  onUpload: (file: File) => void;
  maxSize: number; // MB
  acceptedFormats: string[];
}
```

**Features**:
- Drag-and-drop zone
- File validation (size, format)
- Upload progress bar
- Preview thumbnail

#### 2. InferenceForm Component
```typescript
interface InferenceFormProps {
  onSubmit: (data: InferenceRequest) => void;
  isLoading: boolean;
}
```

**Features**:
- Video input (upload or URL)
- Prompt textarea
- Advanced settings (collapsible)
  - FPS slider
  - Max frames input
  - Temperature slider
  - Max tokens input

#### 3. ResultDisplay Component
```typescript
interface ResultDisplayProps {
  result: InferenceResponse;
  videoSource: string;
}
```

**Features**:
- Generated text with markdown support
- Video replay (side-by-side)
- Copy to clipboard button
- Share functionality (future)

### API Client Generation

```bash
# Install generator
npm install openapi-typescript-codegen

# Generate client from FastAPI's OpenAPI schema
npx openapi-typescript-codegen \
  --input http://localhost:8000/openapi.json \
  --output src/lib/api-client \
  --client fetch
```

This generates type-safe functions:
```typescript
import { InferenceService } from '@/lib/api-client';

// Type-safe API call
const result = await InferenceService.inferenceFromUrl({
  video_url: "https://...",
  prompt: "Describe this video",
  video_params: { fps: 2.0 }
});
```

### State Management Pattern

```typescript
// Use React Query for server state
import { useMutation } from '@tanstack/react-query';

function useInference() {
  return useMutation({
    mutationFn: (data: InferenceRequest) => 
      InferenceService.inferenceFromUrl(data),
    onSuccess: (data) => {
      // Handle success
    },
    onError: (error) => {
      // Handle error
    }
  });
}
```

## 🚀 Deployment Considerations

### Development Environment
```bash
# Current setup
docker-compose up
# Frontend: http://localhost:3000
# Backend: http://localhost:8000
# API Docs: http://localhost:8000/docs
```

### Production Deployment Options

#### Option 1: Separate Services
```
Frontend → Vercel/Netlify
Backend → GPU VM (AWS/GCP/Azure)
```

**Pros**: Optimized for each service  
**Cons**: Need CORS configuration, more complex

#### Option 2: Single VM
```
Frontend + Backend → Single GPU VM with Nginx
```

**Pros**: Simpler networking  
**Cons**: Less flexible scaling

#### Option 3: Kubernetes
```
Frontend → k8s Deployment (CPU)
Backend → k8s Deployment (GPU nodes)
```

**Pros**: Production-grade, auto-scaling  
**Cons**: Complex setup, overkill for MVP

**Recommendation for MVP**: Option 1 (separate services)

### Environment Variables for Production

```bash
# Backend (.env)
MODEL_PATH=Qwen/Qwen3-VL-8B-Instruct
MODEL_BACKEND=vllm  # Use vLLM in production
USE_FLASH_ATTN=true
VLLM_GPU_MEMORY_UTILIZATION=0.90  # Higher in production
CORS_ORIGINS=["https://yourdomain.com"]

# Frontend (.env.production)
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
NEXT_PUBLIC_MAX_VIDEO_SIZE_MB=1000
```

## 📊 Performance Optimization Checklist

### Backend Optimizations
- [ ] Enable vLLM for batching and higher throughput
- [ ] Enable Flash Attention 2 (2-3x speedup)
- [ ] Use FP8 quantized models (Qwen3-VL-*-FP8)
- [ ] Implement request queuing for overflow
- [ ] Add Redis cache for repeated videos
- [ ] Use model quantization (INT4/INT8) for smaller GPUs

### Frontend Optimizations
- [ ] Implement chunked file upload (for large videos)
- [ ] Add client-side video compression (optional)
- [ ] Use WebSocket for streaming responses
- [ ] Implement request cancellation
- [ ] Add result caching (React Query)
- [ ] Lazy load components

## 🐛 Known Issues & Workarounds

### Issue 1: Model Loading Time
**Problem**: First request takes 30-120s (model loading)  
**Workaround**: Use lifespan manager to load on startup  
**Status**: ✅ Implemented

### Issue 2: Video Backend Compatibility
**Problem**: torchvision <0.19.0 doesn't support HTTPS  
**Workaround**: Use torchcodec (faster anyway)  
**Status**: ✅ torchcodec in requirements.txt

### Issue 3: OOM on Long Videos
**Problem**: Long videos can exceed GPU memory  
**Workaround**: Use `total_pixels` parameter to cap memory  
**Status**: ⚠️ Needs request-level validation

### Issue 4: Slow Video Upload
**Problem**: 1GB video takes minutes to upload  
**Future**: Implement chunked upload + progress bar  
**Status**: 🔲 Not yet implemented

## 🎯 Immediate Next Steps

### Priority 1: Frontend Implementation
1. Initialize NextJS project: `npx create-next-app@latest apps/web`
2. Install dependencies: `shadcn/ui`, `react-query`, `react-hook-form`
3. Generate API client from OpenAPI schema
4. Build VideoUpload component
5. Build InferenceForm component
6. Build ResultDisplay component
7. Connect to backend API
8. Test end-to-end flow

### Priority 2: Testing
1. Add pytest and test structure
2. Create sample test videos (short, medium, long)
3. Write unit tests for video processing
4. Write integration tests for endpoints
5. Add E2E tests with Playwright

### Priority 3: Documentation
1. Create API usage examples
2. Document model selection criteria
3. Write deployment guide for AWS/GCP/Azure
4. Create troubleshooting guide

## 💡 Code Patterns to Follow

### Async/Await Everywhere
```python
# Good
async def generate(...):
    result = await model_manager.generate(...)
    return result

# Bad - blocks event loop
def generate_sync(...):
    result = model_manager.generate_blocking(...)
    return result
```

### Type Hints Always
```python
# Good
async def generate(
    video: str,
    prompt: str,
    video_params: Optional[Dict[str, Any]] = None
) -> str:
    ...

# Bad
async def generate(video, prompt, video_params=None):
    ...
```

### Pydantic for Validation
```python
# Good
class InferenceRequest(BaseModel):
    video_url: str
    prompt: str
    
    @field_validator('video_url')
    @classmethod
    def validate_url(cls, v):
        if not v.startswith('http'):
            raise ValueError('Invalid URL')
        return v

# Bad - manual validation
def validate_request(data):
    if 'video_url' not in data:
        raise ValueError('Missing video_url')
    ...
```

### Structured Logging
```python
# Good
logger.info(
    "Processing video inference",
    extra={
        "video_url": video_url,
        "prompt_length": len(prompt),
        "backend": backend
    }
)

# Bad
logger.info(f"Processing {video_url}")
```

## 📝 Naming Conventions

- **Files**: snake_case (`model_manager.py`, `inference.py`)
- **Classes**: PascalCase (`ModelManager`, `InferenceRequest`)
- **Functions**: snake_case (`load_model()`, `process_video()`)
- **Constants**: UPPER_SNAKE_CASE (`MAX_VIDEO_SIZE`, `DEFAULT_FPS`)
- **Private**: Prefix with underscore (`_prepare_inputs()`)

## 🔗 Quick Links

- OpenAPI Docs (when running): http://localhost:8000/docs
- Redoc (when running): http://localhost:8000/redoc
- Health Check: http://localhost:8000/v1/health

---

**Ready for next agent session**: Backend is complete and functional. Focus should shift to frontend implementation and testing.

