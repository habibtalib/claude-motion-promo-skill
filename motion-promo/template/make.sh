#!/usr/bin/env bash
# Full pipeline: frames → soundtrack → mux + loudness-normalise (-14 LUFS).  usage: ./make.sh [fps] [bpm|""=from scene META] [out-name]
set -euo pipefail
cd "$(dirname "$0")"
FPS="${1:-30}"; BPM="${2:-}"; NAME="${3:-promo}"
node render.mjs full "$FPS"
python3 audio.py ${BPM:+"$BPM"}
ffmpeg -y -loglevel error -i out/video_noaudio.mp4 -i out/audio.wav -c:v copy \
  -af "loudnorm=I=-14:TP=-1.5:LRA=11,aresample=48000" -c:a aac -b:a 256k -shortest -movflags +faststart "out/$NAME.mp4"
ffmpeg -hide_banner -i "out/$NAME.mp4" -af ebur128=peak=true -f null - 2>&1 | grep -E '^\s+(I|Peak):' || true
ffmpeg -y -loglevel error -i "out/$NAME.mp4" -vf "fps=1/2.5,scale=480:-1,tile=4x3" -frames:v 1 preview/contact.png
# verify the ENCODE too: pull key frames from the final mp4 (not just the renderer)
for s in 1 $(python3 -c "import json;d=json.load(open('events.json'))['meta']['dur'];print(' '.join(str(round(d*k,1)) for k in (.25,.5,.75,.95)))"); do
  ffmpeg -v error -y -ss "$s" -i "out/$NAME.mp4" -frames:v 1 "preview/check_$s.png"; done
echo "→ $(pwd)/out/$NAME.mp4   (contact sheet: preview/contact.png, encode checks: preview/check_*.png)"
