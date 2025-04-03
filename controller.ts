// controller.ts (CDP Screencast + MJPEG Streaming)
import express, { Request, Response, RequestHandler } from "express";
import puppeteer, { Browser, Page } from "puppeteer";
import { execSync } from "child_process";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const TARGET_URL = process.env.TARGET_URL || "https://example.com";
const RESOLUTION = process.env.RESOLUTION || "1280x720";
const [width, height] = RESOLUTION.split("x").map(Number);

let browser: Browser;
let page: Page;
let screencastClients: express.Response[] = [];

(async () => {
  try {
    // console.log("🖥️ Starting Xvfb...");
    // execSync(`Xvfb :99 -screen 0 ${RESOLUTION}x24 &`, { stdio: "inherit" });
    // process.env.DISPLAY = ":99";

    console.log("🚀 Launching Puppeteer...");
    browser = await puppeteer.launch({
      headless: true,
      executablePath:
        process.env.PUPPETEER_EXECUTABLE_PATH || "/usr/bin/chromium",
      args: [
        `--window-size=${width},${height}`,
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-infobars",
        "--disable-gpu",
      ],
    });

    const pages = await browser.pages();
    page = pages[0];
    await page.setViewport({ width, height });
    await page.goto(TARGET_URL);

    const client = await page.target().createCDPSession();
    await client.send("Page.enable");
    await client.send("Page.startScreencast", {
      format: "jpeg",
      quality: 70,
      maxWidth: width,
      maxHeight: height,
    });

    let lastSent = 0;
    client.on("Page.screencastFrame", async ({ data, sessionId }) => {
      const now = Date.now();

      // Always ack the frame so Chrome keeps rendering
      await client.send("Page.screencastFrameAck", { sessionId });

      // But only send to clients if we want to throttle
      if (now - lastSent < 100) return;
      lastSent = now;

      const jpegBuffer = Buffer.from(data, "base64");

      screencastClients.forEach((res) => {
        res.write(`--frame\r\n`);
        res.write(`Content-Type: image/jpeg\r\n`);
        res.write(`Content-Length: ${jpegBuffer.length}\r\n\r\n`);
        res.write(jpegBuffer);
        res.write("\r\n");
      });
    });

    console.log(`✅ Screencast running`);
  } catch (err) {
    console.error("❌ Failed to initialize:", err);
    process.exit(1);
  }
})();

app.get("/mjpeg", (req, res) => {
  res.writeHead(200, {
    "Content-Type": "multipart/x-mixed-replace; boundary=frame",
    "Cache-Control": "no-cache",
    Connection: "close",
    Pragma: "no-cache",
  });

  screencastClients.push(res);
  console.log(`➕ Client connected. Total: ${screencastClients.length}`);

  req.on("close", () => {
    screencastClients = screencastClients.filter((r) => r !== res);
    console.log(`➖ Client disconnected. Total: ${screencastClients.length}`);
  });
});

app.get("/navigate", (async (req: Request, res: Response) => {
  const url = req.query.url as string;
  if (!url) return res.status(400).send("Missing ?url param");

  try {
    await page.goto(url, { waitUntil: "load" });
    res.send(`✅ Navigated to ${url}`);
  } catch (err) {
    console.error("❌ Failed to navigate:", err);
    res.status(500).send("Navigation error");
  }
}) as RequestHandler);

app.listen(PORT, () => {
  console.log(`🎥 MJPEG stream at http://localhost:${PORT}/mjpeg`);
  console.log(`🌍 Navigate with /navigate?url=`);
});
