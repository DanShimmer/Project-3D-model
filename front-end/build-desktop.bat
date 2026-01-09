@echo off
echo.
echo =========================================
echo   Polyva 3D Desktop App Builder
echo =========================================
echo.

if "%1"=="" (
    echo Usage: build-desktop.bat [action]
    echo.
    echo Actions:
    echo   dev          - Start development mode
    echo   build        - Build for current platform
    echo   build-win    - Build for Windows
    echo   pack         - Create unpacked app for testing
    echo.
    goto :end
)

if "%1"=="dev" (
    echo Starting development mode...
    npm run dev:electron
    goto :end
)

if "%1"=="build" (
    echo Building Polyva 3D...
    npm run build
    npm run build:electron
    goto :end
)

if "%1"=="build-win" (
    echo Building for Windows...
    npm run build
    npm run build:win
    goto :end
)

if "%1"=="pack" (
    echo Creating unpacked app...
    npm run build
    npm run pack
    goto :end
)

echo Unknown action: %1

:end
echo.
