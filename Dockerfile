FROM ghcr.io/puppeteer/puppeteer:latest

# Install ffmpeg (still needed for streaming)
USER root
RUN apt-get update && apt-get install -y \
  ffmpeg \
  xvfb \
  x11-utils

# Set working directory and copy files
WORKDIR /app
COPY package*.json ./

# Change owner and install deps
RUN chown -R pptruser:pptruser /app
USER pptruser
RUN npm install

# Copy source files and build output
COPY . .

# Switch back to root to run ffmpeg safely
USER root

# Create and set permissions for hls directory
RUN mkdir -p /app/hls && chown -R pptruser:pptruser /app/hls

# Optional: double-check permissions for dist
RUN chown -R pptruser:pptruser /app/dist
USER pptruser

# Expose port
EXPOSE 3000

CMD ["bash", "start.sh"]