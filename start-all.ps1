# ============================================
# Script khởi động tất cả services
# Chạy: .\start-all.ps1
# ============================================

Write-Host "🚀 Starting all services..." -ForegroundColor Cyan
Write-Host ""

# Khởi động AI Service (Python Flask) - Port 8000
Write-Host "🤖 Starting AI Service (Port 8000)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\AI-service'; python app.py"

# Đợi 2 giây
Start-Sleep -Seconds 2

# Khởi động Backend (Node.js) - Port 5000
Write-Host "⚙️  Starting Backend Service (Port 5000)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\Back-end\src'; npm run dev"

# Đợi 2 giây
Start-Sleep -Seconds 2

# Khởi động Frontend (Vite) - Port 3000
Write-Host "🎨 Starting Frontend (Port 3000)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\front-end'; npm run dev"

Write-Host ""
Write-Host "============================================" -ForegroundColor Green
Write-Host "✅ All services started!" -ForegroundColor Green
Write-Host ""
Write-Host "📱 Frontend:    http://localhost:3000" -ForegroundColor Cyan
Write-Host "⚙️  Backend:     http://localhost:5000" -ForegroundColor Cyan
Write-Host "🤖 AI Service:  http://localhost:8000" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Green
Write-Host ""
Write-Host "Nhấn Enter để mở trình duyệt..." -ForegroundColor Gray
Read-Host

# Mở trình duyệt
Start-Process "http://localhost:3000"
