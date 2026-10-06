@echo off
chcp 65001 >nul
echo Starting local server...
echo Browser will open automatically, please wait...

:: Stay in project root - vite preview looks for dist under the root
cd /d "%~dp0"

:: Start server with Node.js
"C:\Users\13695\AppData\Local\Programs\kimi-desktop\resources\resources\runtime\node.exe" "%~dp0node_modules\vite\bin\vite.js" preview --port 8080 --open

pause
