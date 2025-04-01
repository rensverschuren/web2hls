import puppeteer from "puppeteer";
import dotenv from "dotenv";
import path from "path";
import fs from "fs";

dotenv.config();

const RESOLUTION = process.env.RESOLUTION || "1920x1080";

// Store active tabs
const activeTabs = new Map<string, puppeteer.Page>();

async function createBrowser() {
  return await puppeteer.launch({
    headless: false, // stay false so it uses Xvfb
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-infobars",
      "--kiosk",
      "--start-fullscreen",
      "--window-size=1920,1080",
      "--disable-web-security",
      "--autoplay-policy=no-user-gesture-required",
      "--disable-translate",
      "--no-default-browser-check",
      "--no-first-run",
    ],
  });
}

async function createNewTab(streamId: string, url: string) {
  const browser = await createBrowser();
  const page = await browser.newPage();

  const [width, height] = RESOLUTION.split("x").map(Number);
  await page.setViewport({ width, height });
  await page.addStyleTag({ content: "* { cursor: none !important; }" });

  await page.goto(url, { waitUntil: "load", timeout: 60000 });
  console.log(`🖥️ Stream ${streamId}: Loaded ${url}`);

  activeTabs.set(streamId, page);

  // Handle page closure
  page.on("close", () => {
    console.log(`🛑 Stream ${streamId}: Tab closed`);
    activeTabs.delete(streamId);
  });
}

// Handle process signals
process.on("SIGTERM", async () => {
  console.log("Received SIGTERM, closing all tabs");
  for (const [streamId, page] of activeTabs) {
    await page.close();
    console.log(`Closed tab for stream ${streamId}`);
  }
  process.exit(0);
});

// Listen for new stream requests
process.on(
  "message",
  async (message: { type: string; streamId: string; url: string }) => {
    if (message.type === "new_stream") {
      await createNewTab(message.streamId, message.url);
    } else if (message.type === "stop_stream") {
      const page = activeTabs.get(message.streamId);
      if (page) {
        await page.close();
        activeTabs.delete(message.streamId);
        console.log(`Stopped stream ${message.streamId}`);
      }
    }
  }
);
