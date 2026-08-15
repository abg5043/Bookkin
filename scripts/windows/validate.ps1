$ErrorActionPreference = "Stop"

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
Set-Location $repoRoot

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    throw "Node.js is required."
}

if (-not (Test-Path "node_modules")) {
    throw "Dependencies are not installed. Run .\scripts\windows\setup.ps1 first."
}

npm run lint
npm run typecheck
npm run test
npm run build

Write-Host "All Checkpoint 1 validation commands passed." -ForegroundColor Green
