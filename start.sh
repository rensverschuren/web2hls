#!/bin/bash

# Start virtual screen
Xvfb :99 -screen 0 1920x1080x24 &
export DISPLAY=:99

# Start Puppeteer
node dist/puppeteer.js &

# Start ffmpeg grabbing :99
./ffmpeg.sh &

# Start stream server
node dist/server.js