// controller.ts (LL-HLS + sub-second segment tuning with Puppeteer)
import express, { Request, Response, RequestHandler } from "express";
import puppeteer, { Browser, Page } from "puppeteer";
import { spawn, ChildProcess, execSync } from "child_process";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const TARGET_URL = process.env.TARGET_URL || "https://example.com";
const RESOLUTION = process.env.RESOLUTION || "1920x1080";
const [width, height] = RESOLUTION.split("x").map(Number);
const HLS_PATH = "/app/hls/stream.m3u8";

let browser: Browser;
let page: Page;
let ffmpeg: ChildProcess | null = null;

(async () => {
  try {
    console.log("🛠️ Ensuring system folders");
    execSync("mkdir -p /app/hls && chmod -R 777 /app/hls");

    console.log("🖥️ Starting Xvfb...");
    spawn("Xvfb", [":99", "-screen", "0", `${RESOLUTION}x24`], {
      stdio: "inherit",
    });
    process.env.DISPLAY = ":99";

    await new Promise((resolve) => setTimeout(resolve, 1000));

    console.log("🚀 Launching Puppeteer browser...");
    browser = await puppeteer.launch({
      headless: false,
      executablePath:
        process.env.PUPPETEER_EXECUTABLE_PATH || "/usr/bin/chromium",
      args: [
        `--window-size=${width},${height}`,
        "--kiosk",
        "--start-fullscreen",
        "--start-maximized",
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-infobars",
        "--disable-web-security",
        "--disable-dev-shm-usage",
        "--disable-extensions",
        "--disable-translate",
        "--disable-features=TranslateUI",
        "--disable-component-extensions-with-background-pages",
        "--autoplay-policy=no-user-gesture-required",
        "--disable-background-media-suspend",
        "--hide-scrollbars",
        "--no-default-browser-check",
        "--no-first-run",
        "--disable-notifications",
        "--force-device-scale-factor=1",
        "--remote-debugging-port=9222",
        "--app-auto-launched",
        "--force-renderer-accessibility",
        "--disable-gpu",
        "--disable-infobars",
        "--disable-software-rasterizer",
        "--disable-features=IsolateOrigins,site-per-process",
      ],
      ignoreDefaultArgs: ["--enable-automation"],
    });

    console.log("📄 Creating new page...");
    page = await browser.newPage();
    await page.setViewport({ width, height });
    await page.addStyleTag({ content: "* { cursor: none !important; }" });
    await page.goto(TARGET_URL, { waitUntil: "load" });
    console.log("✅ Browser setup complete");

    console.log("🎥 Starting ffmpeg with LL-HLS + short segments...");
    ffmpeg = spawn(
      "ffmpeg",
      [
        "-f",
        "x11grab",
        "-video_size",
        RESOLUTION,
        "-i",
        ":99.0",
        "-framerate",
        "30",
        "-c:v",
        "libx264",
        "-preset",
        "ultrafast",
        "-tune",
        "zerolatency",
        "-f",
        "hls",
        "-hls_time",
        "0.5",
        "-hls_playlist_type",
        "event",
        "-hls_flags",
        "independent_segments+split_by_time+temp_file",
        "-hls_segment_type",
        "fmp4",
        "-hls_fmp4_init_filename",
        "init.mp4",
        "-hls_segment_filename",
        "/app/hls/stream_%d.m4s",
        HLS_PATH,
      ],
      {
        stdio: "inherit",
      }
    );

    if (ffmpeg) {
      ffmpeg.on("error", (err) => {
        console.error("❌ FFmpeg error:", err);
      });

      ffmpeg.on("exit", (code) => {
        console.log(`📼 FFmpeg exited with code ${code}`);
      });
    }

    app.listen(PORT as number, "0.0.0.0", () => {
      console.log(
        `🎥 Serving HLS at http://localhost:${PORT}/stream/stream.m3u8`
      );
      console.log(
        `💬 Navigate to a URL: GET /navigate?url=https://example.com`
      );
    });
  } catch (err) {
    console.error("❌ Failed to initialize:", err);
    process.exit(1);
  }
})();

const navigateHandler: RequestHandler = async (req, res) => {
  const url = req.query.url as string;
  if (!url) {
    res.status(400).send("Missing 'url'");
    return;
  }

  if (!browser || !page) {
    console.error("❌ Browser or page not initialized");
    res.status(500).send("Browser not ready");
    return;
  }

  console.log("🌍 Navigating to:", url);
  try {
    await page.goto(url, { waitUntil: "load", timeout: 20000 });
    await page.addStyleTag({ content: "* { cursor: none !important; }" });

    const newUrl = page.url();
    console.log("✅ Navigation successful");
    console.log("📄 New page URL:", newUrl);
    res.send(`✅ Now streaming: ${newUrl}`);
  } catch (err) {
    console.error("❌ Failed to navigate:", err);
    res.status(500).send("Navigation failed");
  }
};

app.get("/navigate", navigateHandler);

app.use(
  "/stream",
  express.static("hls", {
    setHeaders: (res, filePath) => {
      if (filePath.endsWith(".m3u8")) {
        res.setHeader("Content-Type", "application/x-mpegURL");
        res.setHeader("Cache-Control", "no-cache");
      } else if (filePath.endsWith(".m4s") || filePath.endsWith(".mp4")) {
        res.setHeader("Content-Type", "video/mp4");
        res.setHeader("Cache-Control", "no-cache");
      }
    },
  })
);
