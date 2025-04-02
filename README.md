# Web2HLS

A tool that converts any website into an HLS (HTTP Live Streaming) stream. This allows you to view websites in video players that support HLS streaming.

## Features

- Convert any website into a live video stream
- Real-time screen capture using Xvfb and ffmpeg
- HLS streaming output for compatibility with most video players
- Simple HTTP API for navigation
- Docker support for easy deployment

## Prerequisites

- Docker and Docker Compose
- Node.js (if running locally)

## Quick Start

1. Clone the repository:
```bash
git clone https://github.com/yourusername/web2hls.git
cd web2hls
```

2. Start the service using Docker:
```bash
docker-compose up
```

3. The service will be available at `http://localhost:3000`

## API Usage

### Start Streaming a Website

```bash
curl "http://localhost:3000/navigate?url=https://example.com"
```

### Access the Stream

The HLS stream will be available at:
```
http://localhost:3000/stream/stream.m3u8
```

You can play this URL in any HLS-compatible video player (VLC, QuickTime, etc.).

## Environment Variables

- `PORT`: Server port (default: 3000)
- `RESOLUTION`: Screen resolution (default: 1920x1080)
- `TARGET_URL`: Initial website to load (default: https://example.com)

## Development

1. Install dependencies:
```bash
npm install
```

2. Build the project:
```bash
npm run build
```

3. Start the service:
```bash
npm start
```

## Docker Development

Build and run the container:
```bash
docker-compose build
docker-compose up
```

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
