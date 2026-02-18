@echo off
title Polyva 3D - Stop All

echo.
echo  Stopping all services...
echo.

taskkill /FI "WINDOWTITLE eq AI-Service*" /F 2>nul
taskkill /FI "WINDOWTITLE eq Backend*" /F 2>nul
taskkill /FI "WINDOWTITLE eq Frontend*" /F 2>nul

for /f "tokens=5" %%a in ('netstat -ano 2^>nul ^| findstr :3000 ^| findstr LISTENING') do taskkill /PID %%a /F 2>nul
for /f "tokens=5" %%a in ('netstat -ano 2^>nul ^| findstr :5000 ^| findstr LISTENING') do taskkill /PID %%a /F 2>nul
for /f "tokens=5" %%a in ('netstat -ano 2^>nul ^| findstr :5001 ^| findstr LISTENING') do taskkill /PID %%a /F 2>nul

echo.
echo  All services stopped!
echo.
pause
