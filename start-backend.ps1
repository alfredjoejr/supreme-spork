<#
.SYNOPSIS
    One-click runner for Ollama Cloud Runner Local/Colab Backend Agent.
.DESCRIPTION
    Checks Python, sets up a local virtualenv if needed, installs requirements,
    and runs the FastAPI backend control agent (optionally exposing via ngrok).
.PARAMETER NgrokToken
    Optional ngrok authentication token to open a public tunnel.
.PARAMETER Port
    Port number for the FastAPI backend (defaults to 8000).
#>

param(
    [string]$NgrokToken = "",
    [int]$Port = 8000
)

$ErrorActionPreference = "Stop"
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$backendDir = Join-Path $scriptDir "colab-backend"
$venvDir = Join-Path $backendDir ".venv"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "   Starting Ollama Cloud Runner - Backend Agent           " -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

if (-not (Test-Path $backendDir)) {
    Write-Error "Backend directory not found at: $backendDir"
    exit 1
}

if (-not (Get-Command python -ErrorAction SilentlyContinue)) {
    Write-Error "Python is required but was not found in PATH."
    exit 1
}

Set-Location $backendDir

# Setup virtual environment if not present
if (-not (Test-Path $venvDir)) {
    Write-Host "`n[1/3] Creating Python virtual environment (.venv)..." -ForegroundColor Yellow
    python -m venv $venvDir
} else {
    Write-Host "`n[1/3] Existing virtual environment found." -ForegroundColor Green
}

$venvPython = Join-Path $venvDir "Scripts\python.exe"
if (-not (Test-Path $venvPython)) {
    $venvPython = "python"
}

Write-Host "[2/3] Checking backend requirements..." -ForegroundColor Yellow
& $venvPython -m pip install -q --disable-pip-version-check -r requirements.txt

Write-Host "`n[3/3] Starting Backend API on port $Port..." -ForegroundColor Green
if ($NgrokToken) {
    Write-Host "Ngrok token provided. Exposing public tunnel..." -ForegroundColor Magenta
    & $venvPython -m server.main --port $Port --ngrok-token $NgrokToken
} elseif ($env:NGROK_AUTHTOKEN) {
    Write-Host "Using NGROK_AUTHTOKEN from environment..." -ForegroundColor Magenta
    & $venvPython -m server.main --port $Port --ngrok-token $env:NGROK_AUTHTOKEN
} else {
    Write-Host "Running locally without ngrok. (Set `$env:NGROK_AUTHTOKEN or pass -NgrokToken to expose)" -ForegroundColor DarkGray
    & $venvPython -m server.main --port $Port
}
