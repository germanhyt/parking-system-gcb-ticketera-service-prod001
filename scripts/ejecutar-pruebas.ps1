# Pruebas automaticas del agente de impresion
# Genera: pruebas-resultado.json en la raiz del proyecto

$ErrorActionPreference = "Continue"
$proj = Split-Path -Parent $PSScriptRoot
Set-Location $proj

$report = [ordered]@{
    fecha           = (Get-Date).ToString("o")
    proyecto        = $proj
    node_version    = $null
    npm_version     = $null
    impresoras      = @()
    impresora_env   = $null
    servidor        = @{}
    impresion_fisica = @{}
    errores         = @()
}

function Add-Error($msg) { $report.errores += $msg; Write-Host "ERROR: $msg" -ForegroundColor Red }

Write-Host "=== Pruebas ticketera ===" -ForegroundColor Cyan

try { $report.node_version = (node --version 2>&1 | Out-String).Trim() } catch { Add-Error "Node no disponible: $_" }
try { $report.npm_version = (npm --version 2>&1 | Out-String).Trim() } catch { Add-Error "npm no disponible: $_" }

Write-Host "`n=== Compilacion TypeScript ===" -ForegroundColor Cyan
npx tsc --noEmit 2>&1 | Out-Host
if ($LASTEXITCODE -ne 0) {
    Add-Error "tsc --noEmit fallo; corrija errores antes de continuar"
    $outFileEarly = Join-Path $proj "pruebas-resultado.json"
    $report | ConvertTo-Json -Depth 8 | Set-Content -Path $outFileEarly -Encoding UTF8
    exit 1
}
Write-Host "OK compilacion" -ForegroundColor Green

if (-not (Test-Path "node_modules")) {
    Write-Host "Instalando dependencias..."
    npm install 2>&1 | Out-Host
    if ($LASTEXITCODE -ne 0) { Add-Error "npm install fallo con codigo $LASTEXITCODE" }
}

if (Test-Path ".env") {
    Get-Content ".env" | ForEach-Object {
        if ($_ -match '^\s*NOMBRE_IMPRESORA=(.+)$') { $report.impresora_env = $matches[1].Trim() }
    }
}

Write-Host "Impresoras en Windows:"
$printers = Get-Printer -ErrorAction SilentlyContinue
if ($printers) {
    $report.impresoras = @($printers | ForEach-Object { @{ Name = $_.Name; Status = $_.PrinterStatus.ToString() } })
    $printers | Format-Table Name, PrinterStatus -AutoSize
} else {
    Add-Error "No se pudo listar impresoras (Get-Printer)"
}

# Detener procesos node previos en este puerto (opcional)
Get-Process -Name "node" -ErrorAction SilentlyContinue | ForEach-Object {
    Write-Host "Deteniendo node PID $($_.Id)..."
    Stop-Process -Id $_.Id -Force -ErrorAction SilentlyContinue
}
Start-Sleep -Seconds 2

$logOut = Join-Path $proj "pruebas-dev.log"
$logErr = Join-Path $proj "pruebas-dev.err.log"
if (Test-Path $logOut) { Remove-Item $logOut -Force }
if (Test-Path $logErr) { Remove-Item $logErr -Force }

Write-Host "Iniciando npm run dev..."
$proc = Start-Process -FilePath "cmd.exe" -ArgumentList "/c", "npm run dev" -WorkingDirectory $proj `
    -RedirectStandardOutput $logOut -RedirectStandardError $logErr -PassThru -WindowStyle Hidden

$report.servidor.pid = $proc.Id

Write-Host "Esperando servidor en puerto 4000..."
$ready = $false
for ($i = 1; $i -le 24; $i++) {
    try {
        $null = Invoke-WebRequest -Uri "http://localhost:4000/health" -Method GET -TimeoutSec 2 -UseBasicParsing
        $ready = $true
        Write-Host "Servidor listo (${i}s)" -ForegroundColor Green
        break
    } catch {
        Start-Sleep -Seconds 1
    }
}
if (-not $ready) {
    Add-Error "Servidor no respondio en 24s en http://localhost:4000/health"
}

if (Test-Path $logOut) {
    $report.servidor.log_inicio = @(Get-Content $logOut -TotalCount 40)
}
if (Test-Path $logErr) {
    $errLines = @(Get-Content $logErr -TotalCount 20)
    if ($errLines.Count -gt 0) { $report.servidor.log_error = $errLines }
}

$base = "http://localhost:4000"

foreach ($path in @("/health", "/status")) {
    try {
        $r = Invoke-RestMethod -Uri "$base$path" -Method GET -TimeoutSec 10
        $report.servidor[$path.TrimStart('/')] = $r
        Write-Host "OK GET $path"
        $r | ConvertTo-Json -Depth 5 | Write-Host
    } catch {
        Add-Error "GET $path : $($_.Exception.Message)"
    }
}

Write-Host "`n=== Impresion fisica de prueba (POST /test-print) ===" -ForegroundColor Yellow
Write-Host "Revise la impresora POS-80 ahora." -ForegroundColor Yellow

try {
    $body = '{"folio":"CURSOR-TEST","placa":"TST-999"}'
    $print = Invoke-RestMethod -Uri "$base/test-print" -Method POST -ContentType "application/json" -Body $body -TimeoutSec 30
    $report.impresion_fisica = $print
    $report.impresion_fisica.verificacion_manual = "CONFIRMAR EN PAPEL si salio el ticket PRUEBA TICKETERA"
    Write-Host "Respuesta spooler:" -ForegroundColor Green
    $print | ConvertTo-Json -Depth 5 | Write-Host
} catch {
    Add-Error "POST /test-print : $($_.Exception.Message)"
    if ($_.ErrorDetails.Message) { $report.impresion_fisica.detalle = $_.ErrorDetails.Message }
}

$outFile = Join-Path $proj "pruebas-resultado.json"
$report | ConvertTo-Json -Depth 8 | Set-Content -Path $outFile -Encoding UTF8
Write-Host "`nInforme guardado en: $outFile" -ForegroundColor Cyan

Write-Host "`nServidor sigue corriendo (PID $($proc.Id)). Para detener:" -ForegroundColor Gray
Write-Host "  Stop-Process -Id $($proc.Id) -Force" -ForegroundColor Gray
