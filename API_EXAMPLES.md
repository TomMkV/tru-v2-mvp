# API Usage Examples

Quick reference for using the TRU V2 VLM Inference API.

## Base URL

```
Development: http://localhost:8000
Production: https://your-domain.com
```

## Authentication

Currently no authentication required (add as needed).

## Endpoints

### 1. Health Check

```bash
curl http://localhost:8000/v1/health
```

Response:
```json
{
  "status": "healthy",
  "service": "tru-v2-vlm-inference"
}
```

### 2. Detailed Health Check

```bash
curl http://localhost:8000/v1/health/detailed
```

Response:
```json
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
    "devices": [
      {
        "id": 0,
        "name": "NVIDIA A100",
        "memory_allocated_gb": 12.5,
        "memory_reserved_gb": 15.2
      }
    ]
  }
}
```

### 3. Inference from URL (Basic)

```bash
curl -X POST http://localhost:8000/v1/inference/url \
  -H "Content-Type: application/json" \
  -d '{
    "video_url": "https://qianwen-res.oss-cn-beijing.aliyuncs.com/Qwen2-VL/space_woaudio.mp4",
    "prompt": "Describe what happens in this video"
  }'
```

Response:
```json
{
  "response": "This video shows astronauts working in the International Space Station...",
  "prompt": "Describe what happens in this video",
  "video_source": "https://qianwen-res.oss-cn-beijing.aliyuncs.com/Qwen2-VL/space_woaudio.mp4",
  "backend": "hf"
}
```

### 4. Inference from URL (Advanced)

```bash
curl -X POST http://localhost:8000/v1/inference/url \
  -H "Content-Type: application/json" \
  -d '{
    "video_url": "https://example.com/video.mp4",
    "prompt": "What activities are shown in this video?",
    "video_params": {
      "fps": 4.0,
      "max_frames": 512,
      "min_pixels": 8192,
      "max_pixels": 524288,
      "total_pixels": 20971520
    },
    "generation_params": {
      "max_tokens": 1024,
      "temperature": 0.5,
      "top_p": 0.9,
      "top_k": 30
    }
  }'
```

### 5. Inference from Upload (Basic)

```bash
curl -X POST http://localhost:8000/v1/inference/upload \
  -F "video=@/path/to/your/video.mp4" \
  -F "prompt=What is happening in this video?"
```

### 6. Inference from Upload (Advanced)

```bash
curl -X POST http://localhost:8000/v1/inference/upload \
  -F "video=@/path/to/your/video.mp4" \
  -F "prompt=Describe the main events" \
  -F "fps=3.0" \
  -F "max_frames=1024" \
  -F "max_tokens=2048" \
  -F "temperature=0.8"
```

## Python Examples

### Using requests library

```python
import requests

# Basic inference
response = requests.post(
    "http://localhost:8000/v1/inference/url",
    json={
        "video_url": "https://example.com/video.mp4",
        "prompt": "What happens in this video?"
    }
)
result = response.json()
print(result["response"])
```

### Using generated API client

```python
# After generating client with openapi-typescript-codegen
from api_client import InferenceService, InferenceRequestURL

request = InferenceRequestURL(
    video_url="https://example.com/video.mp4",
    prompt="Describe this video",
    video_params={
        "fps": 2.0,
        "max_frames": 768
    }
)

result = InferenceService.inference_from_url(request)
print(result.response)
```

### File upload example

```python
import requests

files = {"video": open("video.mp4", "rb")}
data = {
    "prompt": "What is in this video?",
    "fps": 2.0,
    "max_tokens": 1024
}

response = requests.post(
    "http://localhost:8000/v1/inference/upload",
    files=files,
    data=data
)
print(response.json()["response"])
```

## JavaScript/TypeScript Examples

### Using fetch

```typescript
// Basic inference
const response = await fetch("http://localhost:8000/v1/inference/url", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    video_url: "https://example.com/video.mp4",
    prompt: "What happens in this video?",
  }),
});

const result = await response.json();
console.log(result.response);
```

### Using generated client (recommended)

```typescript
import { InferenceService } from "@/lib/api-client";

const result = await InferenceService.inferenceFromUrl({
  video_url: "https://example.com/video.mp4",
  prompt: "Describe this video",
  video_params: {
    fps: 2.0,
    max_frames: 768,
  },
});

console.log(result.response);
```

### File upload with FormData

```typescript
const formData = new FormData();
formData.append("video", videoFile);
formData.append("prompt", "What is in this video?");
formData.append("fps", "2.0");
formData.append("max_tokens", "1024");

const response = await fetch("http://localhost:8000/v1/inference/upload", {
  method: "POST",
  body: formData,
});

const result = await response.json();
```

### React Query integration

```typescript
import { useMutation } from "@tanstack/react-query";
import { InferenceService } from "@/lib/api-client";

function useVideoInference() {
  return useMutation({
    mutationFn: (data: InferenceRequestURL) =>
      InferenceService.inferenceFromUrl(data),
    onSuccess: (result) => {
      console.log("Inference complete:", result.response);
    },
    onError: (error) => {
      console.error("Inference failed:", error);
    },
  });
}

// Usage in component
const { mutate, isLoading, data } = useVideoInference();

mutate({
  video_url: videoUrl,
  prompt: userPrompt,
});
```

## Parameter Reference

### Video Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `fps` | float | 2.0 | Frames per second to sample |
| `max_frames` | int | 768 | Maximum number of frames |
| `min_pixels` | int | 4096 | Minimum pixels per frame (4×32²) |
| `max_pixels` | int | 262144 | Maximum pixels per frame (256×32²) |
| `total_pixels` | int | 20971520 | Total pixel budget (20480×32²) |

### Generation Parameters

| Parameter | Type | Default | Range | Description |
|-----------|------|---------|-------|-------------|
| `max_tokens` | int | 2048 | 1-4096 | Maximum tokens to generate |
| `temperature` | float | 0.7 | 0.0-2.0 | Sampling temperature (higher = more creative) |
| `top_p` | float | 0.8 | 0.0-1.0 | Nucleus sampling parameter |
| `top_k` | int | 20 | 0-100 | Top-k sampling parameter |

## Error Responses

### 400 Bad Request

```json
{
  "detail": "Invalid video format. Allowed formats: ['.mp4', '.avi', '.mkv', '.mov', '.webm']"
}
```

### 422 Validation Error

```json
{
  "detail": [
    {
      "loc": ["body", "video_url"],
      "msg": "video_url must start with http:// or https://",
      "type": "value_error"
    }
  ]
}
```

### 500 Internal Server Error

```json
{
  "detail": "Inference failed: CUDA out of memory"
}
```

## Rate Limiting

Currently no rate limiting (add as needed for production).

## Best Practices

1. **Use URL endpoint when possible** - Faster than upload
2. **Adjust fps based on video content** - Action: 4-8 fps, Static: 0.5-1 fps
3. **Monitor total_pixels** - Keep under 25M for stability
4. **Use lower temperature for factual descriptions** - 0.3-0.5
5. **Use higher temperature for creative analysis** - 0.7-1.0
6. **Handle errors gracefully** - Retry with exponential backoff

## Performance Tips

```python
# For long videos, reduce fps and pixels
{
    "video_params": {
        "fps": 1.0,              # Lower fps
        "max_frames": 512,       # Fewer frames
        "max_pixels": 131072,    # Lower resolution
        "total_pixels": 10485760 # Halve total budget
    }
}

# For short, detailed videos, increase quality
{
    "video_params": {
        "fps": 4.0,              # Higher fps
        "max_frames": 256,       # More frames
        "max_pixels": 524288,    # Higher resolution
    }
}
```

## Testing the API

### Using httpie

```bash
# Install httpie
pip install httpie

# Test health
http GET localhost:8000/v1/health

# Test inference
http POST localhost:8000/v1/inference/url \
  video_url="https://example.com/video.mp4" \
  prompt="Describe this video"
```

### Using Postman

1. Import OpenAPI schema: http://localhost:8000/openapi.json
2. All endpoints will be auto-configured
3. Test directly from Postman interface

### Using Swagger UI

Navigate to http://localhost:8000/docs and test interactively.

---

**Need more examples?** Check the `/docs` endpoint for interactive documentation.

