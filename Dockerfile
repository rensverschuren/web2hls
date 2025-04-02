FROM --platform=linux/arm64 node:20-slim

RUN apt-get update && apt-get install -y \
  chromium ffmpeg xvfb curl wget gnupg ca-certificates \
  libnss3 libatk1.0-0 libatk-bridge2.0-0 libcups2 libdrm2 \
  libxkbcommon0 libxcomposite1 libxdamage1 libxrandr2 libgbm1 libgtk-3-0 \
  && apt-get clean && rm -rf /var/lib/apt/lists/*

ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
ENV DISPLAY=:99

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

RUN npm run build

EXPOSE 3000

CMD ["node", "dist/controller.js"]