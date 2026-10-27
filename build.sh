#!/usr/bin/env bash
# 一键构建《无喉之歌》: 合成配乐 -> 逐帧渲染 -> 母带响度 -> 合成 film.mp4
# 环境变量: JOBS=并行渲染进程数  START/END=帧范围(默认 0..5928)  GPU=1 使用本机显卡(更快)
#           CHROME_PATH=自定义 Chromium 路径  PORT=本地端口(默认 8123)
set -euo pipefail
cd "$(dirname "$0")"
CPUS=$(getconf _NPROCESSORS_ONLN 2>/dev/null || echo 4)
JOBS=${JOBS:-$(( CPUS/2 > 0 ? CPUS/2 : 1 ))}
START=${START:-0}; END=${END:-5928}; export PORT=${PORT:-8123}
need(){ command -v "$1" >/dev/null || { echo "缺少依赖: $1"; exit 1; }; }
need node; need ffmpeg; need python3

echo "== 1/5 安装依赖"
[ -d node_modules/three ] && [ -d node_modules/playwright ] || npm install --no-audit --no-fund
[ -n "${CHROME_PATH:-}" ] || npx playwright install chromium

echo "== 2/5 合成配乐 (纯代码, 约 1 分钟)"
[ -f out/env.js ] && [ -f out/audio.wav ] || node audio.js
[ -f out/master.wav ] || ffmpeg -y -loglevel error -i out/audio.wav -af loudnorm=I=-14:TP=-1.2:LRA=16 -ar 48000 out/master.wav

echo "== 3/5 启动本地服务器 :$PORT"
python3 -m http.server "$PORT" >/dev/null 2>&1 & SRV=$!
trap 'kill $SRV 2>/dev/null || true' EXIT
sleep 1

echo "== 4/5 渲染帧 $START..$END  并行 $JOBS 路 (已存在的帧会跳过, 可断点续渲)"
N=$(( END-START )); PER=$(( (N+JOBS-1)/JOBS )); PIDS=()
for ((i=0;i<JOBS;i++)); do
  A=$(( START+i*PER )); B=$(( A+PER )); (( B>END )) && B=$END; (( A>=B )) && continue
  node render.js "$A" "$B" & PIDS+=($!)
done
for p in "${PIDS[@]}"; do wait "$p"; done

echo "== 5/5 编码 film.mp4"
if [ "$START" = 0 ] && [ "$END" = 5928 ]; then
  ffmpeg -y -loglevel error -stats -framerate 24 -i frames/f%05d.jpg -i out/master.wav \
    -c:v libx264 -preset slow -crf 20 -pix_fmt yuv420p -c:a aac -b:a 256k -shortest -movflags +faststart film.mp4
  echo "完成 -> $(pwd)/film.mp4"
else
  ffmpeg -y -loglevel error -framerate 24 -start_number "$START" -i frames/f%05d.jpg \
    -ss "$(python3 -c "print($START/24)")" -i out/master.wav -c:v libx264 -preset slow -crf 20 -pix_fmt yuv420p \
    -frames:v "$N" -c:a aac -b:a 256k -shortest "clip_${START}_${END}.mp4"
  echo "完成 -> $(pwd)/clip_${START}_${END}.mp4"
fi
