param([Parameter(Mandatory = $true)][string]$PrinterName)

# Normaliza: recorta extremos y colapsa espacios multiples
function Normalize([string]$s) {
    if ($null -eq $s) { return '' }
    return (($s -replace '\s+', ' ').Trim())
}

$target = Normalize $PrinterName
$printers = Get-Printer -ErrorAction SilentlyContinue

# 1) Match exacto (case-insensitive) sobre nombre normalizado
$match = $printers | Where-Object { (Normalize $_.Name) -ieq $target } | Select-Object -First 1

# 2) Fallback: coincidencia parcial (la impresora contiene el nombre buscado o viceversa)
if (-not $match -and $target.Length -ge 3) {
    $match = $printers | Where-Object {
        $n = Normalize $_.Name
        $n -like "*$target*" -or $target -like "*$n*"
    } | Select-Object -First 1
}

if ($match) {
    # Devuelve el nombre REAL del sistema para imprimir sin ambiguedad
    Write-Output ("OK:" + $match.Name)
    exit 0
}

Write-Output "MISSING"
exit 1
