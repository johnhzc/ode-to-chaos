@echo off
chcp 65001

echo Starting server...
echo Please wait...

cd /d D:\KimiData\books_project\chaos-ode-dashboard

D:\myAIprojects\kimi-desktop\daimon-share\daimon\runtime\python\.venv\Scripts\python.exe -m http.server 8080 --directory dist

pause
