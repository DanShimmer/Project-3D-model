@echo off
:: ============================================
:: Tắt tất cả services
:: ============================================

echo Stopping all services...

:: Tắt các process Python (AI Service)
taskkill /F /IM python.exe 2>nul

:: Tắt các process Node (Backend & Frontend)
taskkill /F /IM node.exe 2>nul

echo.
echo ✅ All services stopped!
pause
