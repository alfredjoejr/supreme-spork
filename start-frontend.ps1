<#
.SYNOPSIS
    One-click runner for Ollama Cloud Runner Frontend.
.DESCRIPTION
    Installs frontend dependencies if missing and starts Vite dev server.
#>

$ErrorActionPreference = "Stop"
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$frontendDir = Join-Path $scriptDir "frontend"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "   Starting Ollama Cloud Runner - Frontend (Vite)        " -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

if (-not (Test-Path $frontendDir)) {
    Write-Error "Frontend directory not found at: $frontendDir"
    exit 1
}

Set-Location $frontendDir

if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
    Write-Error "Node.js / npm is required but was not found in PATH."
    exit 1
}

if (-not (Test-Path (Join-Path $frontendDir "node_modules"))) {
    Write-Host "`n[1/2] Installing frontend dependencies (npm install)..." -ForegroundColor Yellow
    npm install --no-audit --no-fund
} else {
    Write-Host "`n[1/2] Frontend dependencies already installed." -ForegroundColor Green
}

Write-Host "`n[2/2] Launching Vite development server at http://localhost:5173..." -ForegroundColor Green
Write-Host "Press Ctrl+C to stop the server.`n" -ForegroundColor DarkGray

npm run dev -- --open
