# Detached local CRA so agent shell aborts do not kill the server.
$ErrorActionPreference = "Stop"
Set-Location (Split-Path $PSScriptRoot -Parent)

$env:BROWSER = "none"
$env:PORT = "3010"
$env:HOST = "127.0.0.1"
$env:TSC_COMPILE_ON_ERROR = "true"
$env:CI = "false"

Write-Host "Starting al-data-explorer on http://127.0.0.1:3010 ..."
npm start
