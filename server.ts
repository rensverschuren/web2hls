import express, { RequestHandler } from "express";
import { spawn } from "child_process";
import path from "path";
import fs from "fs";

const app = express();
const PORT = process.env.PORT || 3000;

// Store active streams
const activeStreams = new Map<string, any>();

// Ensure HLS directory exists
const hlsDir = path.join(process.cwd(), "hls");
if (!fs.existsSync(hlsDir)) {
  fs.mkdirSync(hlsDir, { recursive: true });
}

// Serve HLS files from stream-specific directories
app.use("/stream/:streamId", (req, res, next) => {
  const streamPath = path.join(hlsDir, req.params.streamId);
  express.static(streamPath)(req, res, next);
});

const startStream: RequestHandler = (req, res) => {
  const { url } = req.query;
  const streamId = Math.random().toString(36).substring(7);

  if (!url) {
    res.status(400).json({ error: "URL parameter is required" });
    return;
  }

  // Create a directory for this stream
  const streamDir = path.join(hlsDir, streamId);
  fs.mkdirSync(streamDir, { recursive: true });
  console.log(`Created stream directory: ${streamDir}`);

  // Start the puppeteer process
  const puppeteerProcess = spawn("node", ["dist/puppeteer.js"], {
    env: {
      ...process.env,
      TARGET_URL: url as string,
      STREAM_ID: streamId,
    },
  });

  // Start the ffmpeg process
  const ffmpegProcess = spawn("bash", ["ffmpeg.sh"], {
    env: {
      ...process.env,
      STREAM_ID: streamId,
    },
  });

  // Store both processes
  activeStreams.set(streamId, {
    puppeteer: puppeteerProcess,
    ffmpeg: ffmpegProcess,
  });

  // Log puppeteer output
  puppeteerProcess.stdout.on("data", (data) => {
    console.log(`Stream ${streamId} (puppeteer): ${data}`);
  });

  puppeteerProcess.stderr.on("data", (data) => {
    console.error(`Stream ${streamId} (puppeteer) error: ${data}`);
  });

  // Log ffmpeg output
  ffmpegProcess.stdout.on("data", (data) => {
    console.log(`Stream ${streamId} (ffmpeg): ${data}`);
  });

  ffmpegProcess.stderr.on("data", (data) => {
    console.error(`Stream ${streamId} (ffmpeg) error: ${data}`);
  });

  // Handle process closures
  puppeteerProcess.on("close", (code) => {
    console.log(`Stream ${streamId} (puppeteer) closed with code ${code}`);
    const stream = activeStreams.get(streamId);
    if (stream) {
      stream.ffmpeg.kill();
      activeStreams.delete(streamId);
    }
  });

  ffmpegProcess.on("close", (code) => {
    console.log(`Stream ${streamId} (ffmpeg) closed with code ${code}`);
    const stream = activeStreams.get(streamId);
    if (stream) {
      stream.puppeteer.kill();
      activeStreams.delete(streamId);
    }
  });

  res.json({
    streamId,
    streamUrl: `http://localhost:${PORT}/stream/${streamId}/stream.m3u8`,
  });
};

app.get("/start-stream", startStream);

app.get("/stop-stream/:streamId", (req, res) => {
  const { streamId } = req.params;
  const stream = activeStreams.get(streamId);

  if (stream) {
    stream.puppeteer.kill();
    stream.ffmpeg.kill();
    activeStreams.delete(streamId);
    res.json({ message: `Stream ${streamId} stopped` });
  } else {
    res.status(404).json({ error: "Stream not found" });
  }
});

app.listen(PORT, () => {
  console.log(`🎥 Server running at http://localhost:${PORT}`);
  console.log(`📝 Start a stream: GET /start-stream?url=YOUR_URL`);
  console.log(`🛑 Stop a stream: GET /stop-stream/:streamId`);
});
