@echo off
cd /d "%~dp0"
echo جاري تشغيل البرنامج...
start http://localhost:3000
node index.js
pause