#!/bin/bash

RES=$RESOLUTION
[ -z "$RES" ] && RES="1280x720"

mkdir -p /app/hls

ffmpeg \
  -f x11grab -video_size $RES -i :99.0 \
  -framerate 30 \
  -c:v libx264 -preset ultrafast -tune zerolatency \
  -f hls -hls_time 1 -hls_list_size 3 -hls_flags delete_segments \
  /app/hls/stream.m3u8