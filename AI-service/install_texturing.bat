@echo off
echo ============================================
echo AI Texturing Service - Installation Script
echo ============================================
echo.

cd /d "%~dp0"

echo Activating virtual environment...
call venv311\Scripts\activate.bat

echo.
echo Installing texturing dependencies...
pip install -r requirements_texturing.txt

echo.
echo ============================================
echo Installation complete!
echo ============================================
echo.
echo To test the texturing service, run:
echo   python texturing_service.py
echo.
pause
