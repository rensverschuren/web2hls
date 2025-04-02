FROM node:20-slim

# Install Chromium and other required packages
RUN apt-get update && apt-get install -y \
  chromium ffmpeg xvfb curl wget gnupg ca-certificates \
  libnss3 libatk1.0-0 libatk-bridge2.0-0 libcups2 libdrm2 \
  libxkbcommon0 libxcomposite1 libxdamage1 libxrandr2 libgbm1 libgtk-3-0 \
  && apt-get clean && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy dependencies and install
COPY package*.json ./
RUN npm install

# Copy app files and build
COPY . .
RUN npm run build

# Puppeteer will use Chromium installed via apt
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
ENV DISPLAY=:99

EXPOSE 3000

CMD ["node", "dist/controller.js"]