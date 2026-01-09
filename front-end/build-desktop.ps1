# Polyva 3D - Desktop App Build Script
# =====================================

param(
    [Parameter(Position=0)]
    [ValidateSet('dev', 'build', 'build-win', 'build-mac', 'build-linux', 'pack')]
    [string]$Action = 'dev'
)

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "  Polyva 3D Desktop App Builder" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

# Check if we're in the front-end directory
if (-not (Test-Path "package.json")) {
    Write-Host "Error: package.json not found. Please run from front-end directory." -ForegroundColor Red
    exit 1
}

# Check for Electron dependencies
function Check-ElectronDeps {
    $packageJson = Get-Content "package.json" | ConvertFrom-Json
    $hasElectron = $packageJson.devDependencies.electron -or $packageJson.dependencies.electron
    
    if (-not $hasElectron) {
        Write-Host "Installing Electron dependencies..." -ForegroundColor Yellow
        
        # Use the electron package.json
        if (Test-Path "package.electron.json") {
            Copy-Item "package.json" "package.web.json.bak"
            Copy-Item "package.electron.json" "package.json"
        }
        
        npm install
    }
}

# Build functions
function Start-Dev {
    Write-Host "Starting development mode..." -ForegroundColor Green
    Write-Host "This will start Vite dev server and Electron" -ForegroundColor Gray
    
    Check-ElectronDeps
    
    # Start Vite and Electron concurrently
    npm run dev:electron
}

function Build-App {
    param([string]$Platform = '')
    
    Write-Host "Building Polyva 3D Desktop App..." -ForegroundColor Green
    
    Check-ElectronDeps
    
    # Build Vite first
    Write-Host "Step 1: Building web assets..." -ForegroundColor Yellow
    npm run build
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Web build failed!" -ForegroundColor Red
        exit 1
    }
    
    # Build Electron
    Write-Host "Step 2: Packaging Electron app..." -ForegroundColor Yellow
    
    switch ($Platform) {
        'win' { npm run build:win }
        'mac' { npm run build:mac }
        'linux' { npm run build:linux }
        default { npm run build:electron }
    }
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "Build complete!" -ForegroundColor Green
        Write-Host "Output: ./release/" -ForegroundColor Gray
        
        # List built files
        if (Test-Path "release") {
            Write-Host ""
            Write-Host "Built packages:" -ForegroundColor Cyan
            Get-ChildItem "release" -Filter "*.exe" | ForEach-Object { Write-Host "  - $($_.Name)" }
            Get-ChildItem "release" -Filter "*.dmg" | ForEach-Object { Write-Host "  - $($_.Name)" }
            Get-ChildItem "release" -Filter "*.AppImage" | ForEach-Object { Write-Host "  - $($_.Name)" }
            Get-ChildItem "release" -Filter "*.deb" | ForEach-Object { Write-Host "  - $($_.Name)" }
        }
    } else {
        Write-Host "Electron build failed!" -ForegroundColor Red
        exit 1
    }
}

function Pack-App {
    Write-Host "Creating unpacked app for testing..." -ForegroundColor Green
    
    Check-ElectronDeps
    npm run build
    npm run pack
    
    Write-Host ""
    Write-Host "Unpacked app ready in ./release/win-unpacked/" -ForegroundColor Green
}

# Execute action
switch ($Action) {
    'dev' { Start-Dev }
    'build' { Build-App }
    'build-win' { Build-App -Platform 'win' }
    'build-mac' { Build-App -Platform 'mac' }
    'build-linux' { Build-App -Platform 'linux' }
    'pack' { Pack-App }
}

Write-Host ""
