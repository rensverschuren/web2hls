FROM node:20-slim

# Install required dependencies for Chromium to run
RUN apt-get update && apt-get install -y \
  xvfb ffmpeg wget curl ca-certificates \
  libnss3 libatk1.0-0 libatk-bridge2.0-0 libcups2 libdrm2 \
  libxkbcommon0 libxcomposite1 libxdamage1 libxrandr2 libgbm1 libgtk-3-0 \
  && apt-get clean \
  && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy package files and install deps
COPY package*.json ./
RUN npm install

# Install only Chromium for Playwright
RUN npx playwright install chromium

# Copy source code
COPY . .

# Set display for Xvfb
ENV DISPLAY=:99

# Start app
CMD ["node", "dist/controller.js"]