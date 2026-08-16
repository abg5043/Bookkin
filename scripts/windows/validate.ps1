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
    throw "Node.js is required."
}

if (-not (Test-Path "node_modules")) {
    throw "Dependencies are not installed. Run .\scripts\windows\setup.ps1 first."
}

Invoke-CheckedCommand { npm run db:validate } "Prisma schema validation"
Invoke-CheckedCommand { npm run db:generate } "Prisma client generation"
Invoke-CheckedCommand { npm run db:migrate:status } "PostgreSQL migration status"
Invoke-CheckedCommand { npm run db:test:up } "Disposable PostgreSQL test service startup"

$previousBookkinDatabaseUrl = $env:DATABASE_URL
try {
    $env:DATABASE_URL = "postgresql://bookkin_test:bookkin_test_only@127.0.0.1:5433/bookkin_test?schema=public"
    Invoke-CheckedCommand { npm run db:migrate } "Disposable test-database migration replay"
    Invoke-CheckedCommand { npm run test:db } "Required PostgreSQL integrity tests"
} finally {
    if ($null -eq $previousBookkinDatabaseUrl) {
        Remove-Item Env:DATABASE_URL -ErrorAction SilentlyContinue
    } else {
        $env:DATABASE_URL = $previousBookkinDatabaseUrl
    }
}

Invoke-CheckedCommand { npm run lint } "Lint"
Invoke-CheckedCommand { npm run typecheck } "Type check"
Invoke-CheckedCommand { npm run test } "Test suite"
Invoke-CheckedCommand { npm run build } "Production build"

Write-Host "All current Bookkin validation commands passed." -ForegroundColor Green
