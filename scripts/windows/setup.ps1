$ErrorActionPreference = "Stop"

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
Set-Location $repoRoot

function Invoke-CheckedCommand {
    param(
        [Parameter(Mandatory = $true)]
        [scriptblock]$Command,
        [Parameter(Mandatory = $true)]
        [string]$Description
    )

    & $Command
    if ($LASTEXITCODE -ne 0) {
        throw "$Description failed with exit code $LASTEXITCODE."
    }
}

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    throw "Node.js is required. Install Node.js 22 or a compatible current LTS release and run this script again."
}

if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
    throw "npm is required. Install npm with Node.js and run this script again."
}

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    throw "Docker Desktop is required for the canonical local PostgreSQL workflow. See docs\operations\windows-postgresql.md for the native PostgreSQL fallback."
}

Invoke-CheckedCommand { docker info | Out-Null } "Docker Desktop readiness check"

Write-Host "Installing Bookkin dependencies..." -ForegroundColor Cyan
if (Test-Path "package-lock.json") {
    Invoke-CheckedCommand { npm ci } "Dependency installation"
} else {
    Invoke-CheckedCommand { npm install } "Dependency installation"
}

Write-Host "Starting PostgreSQL and applying the committed baseline..." -ForegroundColor Cyan
Invoke-CheckedCommand { npm run db:up } "PostgreSQL startup"
Invoke-CheckedCommand { npm run db:generate } "Prisma client generation"
Invoke-CheckedCommand { npm run db:migrate } "PostgreSQL migration replay"
Invoke-CheckedCommand { npm run db:migrate:status } "PostgreSQL migration status"
Invoke-CheckedCommand { npm run db:seed } "Minimal seed"

Write-Host "Running the foundation validation suite..." -ForegroundColor Cyan
& (Join-Path $repoRoot "scripts\windows\validate.ps1")

Write-Host "Bookkin is ready. Start it with: npm run dev" -ForegroundColor Green
