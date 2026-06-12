@echo off
setlocal enabledelayedexpansion
echo جاري النسخ الاحتياطي...

set BACKUP_DIR=C:\SkyBird-Backup
if not exist "%BACKUP_DIR%" mkdir "%BACKUP_DIR%"

for /f "tokens=2 delims==" %%I in ('wmic os get localdatetime /format:list') do set dt=%%I
set TIMESTAMP=%dt:~0,4%-%dt:~4,2%-%dt:~6,2%_%dt:~8,2%-%dt:~10,2%

set SOURCE=%~dp0birdshop.db
set DEST=%BACKUP_DIR%\birdshop_%TIMESTAMP%.db

copy "%SOURCE%" "%DEST%"
if errorlevel 1 (
    echo فشل النسخ!
    pause
    exit /b 1
)

set COUNT=0
for /f "delims=" %%F in ('dir /b /o-d "%BACKUP_DIR%\birdshop_*.db"') do (
    set /a COUNT+=1
    if !COUNT! GTR 10 (
        del "%BACKUP_DIR%\%%F"
    )
)

echo تم النسخ بنجاح: %DEST%
pause
