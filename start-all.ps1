<#
.SYNOPSIS
    One-click runner to start both Backend and Frontend in separate windows.
.DESCRIPTION
    Launches start-backend.ps1 and start-frontend.ps1 in dedicated PowerShell windows.
#>

param(
    [string]$NgrokToken = "",
    [int]$BackendPort = 8000
)

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$backendScript = Join-Path $scriptDir "start-backend.ps1"
$frontendScript = Join-Path $scriptDir "start-frontend.ps1"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "   Ollama Cloud Runner - One-Click Full Stack Launcher    " -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# 1. Start backend window
Write-Host "`n[1/2] Spawning Backend process in a new PowerShell window..." -ForegroundColor Green
$backendArgs = "-NoExit -ExecutionPolicy Bypass -File `"$backendScript`" -Port $BackendPort"
if ($NgrokToken) {
    $backendArgs += " -NgrokToken `"$NgrokToken`""
}
Start-Process powershell.exe -ArgumentList $backendArgs

# Brief pause so backend initializes
Start-Sleep -Seconds 2

# 2. Start frontend window
Write-Host "[2/2] Spawning Frontend (Vite) process in a new PowerShell window..." -ForegroundColor Green
$frontendArgs = "-NoExit -ExecutionPolicy Bypass -File `"$frontendScript`""
Start-Process powershell.exe -ArgumentList $frontendArgs

Write-Host "`nAll processes launched!" -ForegroundColor Cyan
Write-Host "Backend window: http://localhost:$BackendPort" -ForegroundColor DarkGray
Write-Host "Frontend window: http://localhost:5173" -ForegroundColor DarkGray
Write-Host "(Keep both windows open while developing / running)`n" -ForegroundColor Yellow
