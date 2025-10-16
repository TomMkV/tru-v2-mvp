# TRU Platform v2 - Frontend

NextJS 14 web interface for video analysis with Vision Language Models.

## Features

- 🎬 Drag-and-drop video upload
- ✍️ Interactive prompt input
- ⏱️ Real-time processing status
- 📊 Beautiful result display with video playback
- 🎨 Modern UI with TailwindCSS
- 📦 Production-ready Docker build

## Quick Start

### Development

```bash
# Install dependencies
npm install

# Create environment file
cp .env.template .env.local

# Run development server
npm run dev

# Open http://localhost:3000
```

### Production (Docker)

```bash
# From project root
cd infrastructure
docker-compose up --build

# Access at http://localhost:3000
```

## Configuration

Environment variables (`.env.local` or `.env.production`):

```bash
# API endpoint (required)
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## Architecture

```
app/
├── page.tsx           # Main application page
├── layout.tsx         # Root layout
└── globals.css        # Global styles

components/
├── VideoUploadZone.tsx    # Video upload with drag-drop
├── PromptInput.tsx        # Text prompt input
├── ProcessingState.tsx    # Loading indicator
└── ResultDisplay.tsx      # Result visualization

lib/
├── api.ts             # Type-safe API client
└── utils.ts           # Utility functions
```

## API Integration

The frontend communicates with the FastAPI backend via REST:

- **POST** `/v1/inference/upload` - Upload video + prompt
- **GET** `/v1/health` - Health check

Type-safe API client with:
- Upload progress tracking
- Proper error handling
- Timeout management (10 min for long videos)

## Development

```bash
# Lint
npm run lint

# Build
npm run build

# Start production server
npm start
```

## Docker Multi-Stage Build

The Dockerfile uses a 3-stage build:

1. **deps** - Install dependencies
2. **builder** - Build Next.js app
3. **runner** - Production runtime

Output: ~200MB production image

## Deployment

### VM Deployment

On your Lambda GPU VM:

```bash
# Clone repo
git clone <repo-url>
cd tru-v2-mvp/infrastructure

# Start services
docker-compose up -d

# View logs
docker-compose logs -f web

# Stop services
docker-compose down
```

### Environment Variables (Production)

Set `NEXT_PUBLIC_API_URL` to your backend's public URL:

```bash
# In docker-compose.yml or via .env
NEXT_PUBLIC_API_URL=http://YOUR_VM_IP:8000
```

## Browser Compatibility

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Known Issues

- Video preview requires browser codecs (H.264/VP9)
- Upload timeout set to 10 minutes (configurable in `lib/api.ts`)
- Large videos (>1GB) may be slow to upload

## License

Apache 2.0
