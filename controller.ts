// controller.ts (Playwright + LL-HLS version)
import express, { Request, Response, RequestHandler } from "express";
import { chromium, Browser, Page } from "playwright";
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

    console.log("🚀 Launching Playwright browser...");
    browser = await chromium.launch({
      headless: false,
      args: [
        `--window-size=${width},${height}`,
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-infobars",
        "--disable-web-security",
        "--autoplay-policy=no-user-gesture-required",
        "--disable-translate",
        "--no-default-browser-check",
        "--no-first-run",
        "--disable-background-media-suspend",
        "--kiosk",
      ],
    });

    const context = await browser.newContext({ viewport: { width, height } });
    page = await context.newPage();
    await page.addStyleTag({ content: "* { cursor: none !important; }" });
    await page.goto(TARGET_URL, { waitUntil: "commit" });
    console.log("✅ Browser setup complete");

    console.log("🎥 Starting ffmpeg with LL-HLS...");
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
        "1",
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
        `\u{1F3A5} Serving HLS at http://localhost:${PORT}/stream/stream.m3u8`
      );
      console.log(
        `\u{1F4AC} Navigate to a URL: GET /navigate?url=https://example.com`
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
    // await page.evaluate(() => {
    //   const el = document.createElement("div");
    //   el.style.position = "fixed";
    //   el.style.top = "50%";
    //   el.style.left = "50%";
    //   el.style.width = "50px";
    //   el.style.height = "50px";
    //   el.style.margin = "-25px";
    //   el.style.borderRadius = "50%";
    //   el.style.border = "5px solid #000";
    //   el.style.borderTop = "5px solid transparent";
    //   el.style.animation = "spin 1s linear infinite";
    //   el.style.zIndex = "999999";

    //   const style = document.createElement("style");
    //   style.innerHTML = `@keyframes spin { 100% { transform: rotate(360deg); } }`;
    //   document.body.appendChild(style);
    //   document.body.appendChild(el);
    // });

    await page.goto(url, { waitUntil: "commit", timeout: 20000 });
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
