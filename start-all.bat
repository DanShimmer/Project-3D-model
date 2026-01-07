@echo off
:: ============================================
:: Script khởi động tất cả services
:: Double-click file này để chạy
:: ============================================

echo.
echo 🚀 Starting all services...
echo.

:: Khởi động AI Service
echo 🤖 Starting AI Service (Port 8000)...
start "AI Service" cmd /k "cd /d "%~dp0AI-service" && python app.py"

:: Đợi 3 giây
timeout /t 3 /nobreak > nul

:: Khởi động Backend
echo ⚙️  Starting Backend Service (Port 5000)...
start "Backend" cmd /k "cd /d "%~dp0Back-end\src" && npm run dev"

:: Đợi 3 giây
timeout /t 3 /nobreak > nul

:: Khởi động Frontend
echo 🎨 Starting Frontend (Port 3000)...
start "Frontend" cmd /k "cd /d "%~dp0front-end" && npm run dev"

:: Đợi 5 giây để services khởi động
timeout /t 5 /nobreak > nul

echo.
echo ============================================
echo ✅ All services started!
echo.
echo 📱 Frontend:    http://localhost:3000
echo ⚙️  Backend:     http://localhost:5000  
echo 🤖 AI Service:  http://localhost:8000
echo ============================================
echo.

:: Mở trình duyệt
start http://localhost:3000

echo Press any key to exit...
pause > nul
