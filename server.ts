import express from "express";

const app = express();
const PORT = process.env.PORT || 3000;

app.use("/stream", express.static("hls"));

app.listen(PORT, () => {
  console.log(`🎥 Serving HLS at http://localhost:${PORT}/stream/stream.m3u8`);
});
