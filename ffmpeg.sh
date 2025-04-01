#!/bin/bash

RES=$RESOLUTION
[ -z "$RES" ] && RES="1280x720"

STREAM_ID=$STREAM_ID
[ -z "$STREAM_ID" ] && STREAM_ID="default"

STREAM_DIR="/app/hls/$STREAM_ID"
mkdir -p "$STREAM_DIR"

echo "Starting ffmpeg for stream $STREAM_ID in $STREAM_DIR"

ffmpeg \
  -f x11grab -video_size $RES -i :99.0 \
  -framerate 30 \
  -c:v libx264 -preset ultrafast -tune zerolatency \
  -f hls -hls_time 1 -hls_list_size 3 -hls_flags delete_segments \
  "$STREAM_DIR/stream.m3u8"