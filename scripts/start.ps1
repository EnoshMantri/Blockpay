# start.ps1 - BlockPay Concurrent Startup Script
# Starts both the backend and frontend servers in separate background processes

Write-Host "Starting BlockPay Backend (Port 4000)..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit -Command `"cd backend; npm run dev`""

Write-Host "Starting BlockPay Frontend (Port 5174)..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit -Command `"cd frontend; npm run dev`""

Write-Host "Servers are starting in new windows." -ForegroundColor Green
Write-Host "Close this window when done."
