#!/usr/bin/env bash
# =====================================================================
#   全国大学生数字媒体科技作品及创意竞赛（CMIT）现场答辩
#   《云山竹简 · 华风雅集》 离线免网展评模式 (macOS / Linux)
# =====================================================================

set -e

echo "🏮 [1/4] 检测 Node.js 环境..."
command -v node >/dev/null 2>&1 || { echo "[错误] 请先安装 Node.js 18+ 环境！"; exit 1; }

echo "🏮 [2/4] 启动后端服务 (端口 3001)..."
(cd backend && npm run dev) &
BACKEND_PID=$!

echo "🏮 [3/4] 启动前端服务 (端口 5173)..."
(cd frontend && npm run dev) &
FRONTEND_PID=$!

trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null || true" EXIT

echo "🏮 [4/4] 等待服务初始化 (3秒)..."
sleep 3

URL="http://localhost:5173"
echo "正在启动独立应用窗口: $URL"

if command -v open >/dev/null 2>&1; then
  # macOS
  if [ -d "/Applications/Google Chrome.app" ]; then
    open -na "Google Chrome" --args --app="$URL" --window-size=430,932
  elif [ -d "/Applications/Microsoft Edge.app" ]; then
    open -na "Microsoft Edge" --args --app="$URL" --window-size=430,932
  else
    open "$URL"
  fi
elif command -v xdg-open >/dev/null 2>&1; then
  # Linux
  xdg-open "$URL"
fi

echo "====================================================================="
echo "   ✅ 展评系统已成功启动！按 Ctrl+C 停止所有服务"
echo "====================================================================="

wait
