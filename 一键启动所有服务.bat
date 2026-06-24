@echo off
chcp 65001 >nul
echo ========================================
echo   一键启动所有服务
echo ========================================
echo.

echo 正在启动后端服务器...
start cmd /k "cd /d D:\woyaozoufan_tool\server && node index.js"
echo 后端服务器已启动（端口 3002）

echo.
echo 正在启动小工具前端...
start cmd /k "cd /d D:\woyaozoufan_tool\project && npm run dev"
echo 前端已启动（端口 5173 或其他可用端口）

echo.
echo 正在启动管理后台...
start cmd /k "cd /d D:\woyaozoufan_tool\admin-vue && npm run dev"
echo 管理后台已启动（端口 5175 或其他可用端口）

echo.
echo ========================================
echo 所有服务已启动完成！
echo 请在浏览器中访问：
echo - 小工具前端：http://localhost:5173/
echo - 管理后台：http://localhost:5175/
echo - 后端API：http://localhost:3002/
echo ========================================
echo.
pause