# Reinstalacion cuando npm install falla en node-printer (CL.exe / EPERM)
$ErrorActionPreference = "Stop"
$proj = Split-Path -Parent $PSScriptRoot
Set-Location $proj

Write-Host "=== Detener procesos node ===" -ForegroundColor Cyan
Get-Process -Name "node" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2

Write-Host "=== Limpiar node_modules (si EPERM, cierre Cursor/antivirus) ===" -ForegroundColor Cyan
if (Test-Path "node_modules") {
    Remove-Item -Recurse -Force "node_modules" -ErrorAction SilentlyContinue
}
if (Test-Path "package-lock.json") {
    Remove-Item -Force "package-lock.json" -ErrorAction SilentlyContinue
}

Write-Host "=== npm install ===" -ForegroundColor Cyan
Write-Host "    Impresion: PowerShell RAW (no requiere compilar C++)" -ForegroundColor Gray
npm install
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host ""
Write-Host "=== Listo. Arranque: ===" -ForegroundColor Green
Write-Host "  npm run dev"
Write-Host ""
Write-Host "Prueba impresion:" -ForegroundColor Yellow
Write-Host '  Invoke-RestMethod http://localhost:4000/test-print -Method POST -ContentType "application/json" -Body ''{"folio":"TEST","placa":"ABC"}'''
