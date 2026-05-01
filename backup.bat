@echo off
echo جاري النسخ الاحتياطي...
rclone copy "C:\Users\DELL\desktop\birdshop\backend\birdshop.db" gdrive:birdshop-backup/db
rclone sync "C:\Users\DELL\desktop\birdshop\backend" gdrive:birdshop-backup/project --exclude "node_modules/**" --exclude ".wwebjs_cache/**" --exclude ".wwebjs_auth/**"
echo تم النسخ بنجاح!
pause