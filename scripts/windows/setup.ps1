$ErrorActionPreference = "Stop"

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
Set-Location $repoRoot

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    throw "Node.js is required. Install Node.js 22 or a compatible current LTS release and run this script again."
}

if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
    throw "npm is required. Install npm with Node.js and run this script again."
}

Write-Host "Installing Bookkin dependencies..." -ForegroundColor Cyan
if (Test-Path "package-lock.json") {
    npm ci
} else {
    npm install
}

Write-Host "Running the foundation validation suite..." -ForegroundColor Cyan
npm run validate

Write-Host "Bookkin is ready. Start it with: npm run dev" -ForegroundColor Green
