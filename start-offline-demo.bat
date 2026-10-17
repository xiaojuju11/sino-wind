@echo off
chcp 65001 >nul
title 云山竹简·华风雅集 - 国赛答辩离线演示一键启动

echo =====================================================================
echo    🏮 全国大学生数字媒体科技作品及创意竞赛（CMIT）现场答辩
echo           《云山竹简 · 华风雅集》 离线免网展评模式
echo =====================================================================
echo.
echo [1/4] 正在检测运行环境与 Node.js...
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [错误] 未检测到 Node.js，请确保已安装 Node 18+ 环境！
    pause
    exit /b 1
)

echo [2/4] 启动后端服务 (端口 3001，离线高可用模式)...
start "SinoWind-Backend" cmd /c "cd backend && npm run dev"

echo [3/4] 启动前端服务 (端口 5173，PWA+自适应翼展舞台)...
start "SinoWind-Frontend" cmd /c "cd frontend && npm run dev"

echo [4/4] 等待服务初始化就绪 (3秒)...
timeout /t 3 /nobreak >nul

echo.
echo 正在以独立应用窗口（Kiosk / App Window）启动展演...
echo （去除浏览器外壳与地址栏，呈现移动端原生沉浸感）
echo.

:: 优先检测 Microsoft Edge 以独立 App 模式启动
where msedge >nul 2>nul
if %errorlevel% equ 0 (
    start msedge --app=http://localhost:5173 --window-size=430,932
    goto done
)

:: 其次检测 Google Chrome 以独立 App 模式启动
where chrome >nul 2>nul
if %errorlevel% equ 0 (
    start chrome --app=http://localhost:5173 --window-size=430,932
    goto done
)

:: 兜底直接用系统默认浏览器打开
start http://localhost:5173

:done
echo =====================================================================
echo    ✅ 展评系统已成功启动！
echo    * 前端地址: http://localhost:5173
echo    * 后端地址: http://localhost:3001
echo    * 离线标本卡、平水韵状态机、Web Audio 物理声学均在纯端侧运行
echo    * 答辩结束后，直接关闭本窗口及服务命令行即可
echo =====================================================================
echo.
pause
