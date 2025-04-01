import puppeteer from "puppeteer";
import dotenv from "dotenv";

dotenv.config();

const TARGET_URL = process.env.TARGET_URL || "https://youtube.com";
const RESOLUTION = process.env.RESOLUTION || "1920x1080";

(async () => {
  const browser = await puppeteer.launch({
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

  const page = await browser.newPage();

  const [width, height] = RESOLUTION.split("x").map(Number);
  await page.setViewport({ width, height });
  await page.addStyleTag({ content: "* { cursor: none !important; }" });

  await page.goto(TARGET_URL, { waitUntil: "load", timeout: 60000 });
  console.log(`🖥️ Loaded ${TARGET_URL}`);
})();
