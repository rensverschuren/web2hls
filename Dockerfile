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

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Install only Chromium for Playwright
RUN npx playwright install chromium

# Copy source files
COPY . .

# Build the TypeScript project
RUN npm run build

# Set display for Xvfb
ENV DISPLAY=:99

# Expose port if needed (optional, good for local Docker or Fly.io)
EXPOSE 3000

# Start the app
CMD ["node", "dist/controller.js"]