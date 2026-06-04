param([Parameter(Mandatory = $true)][string]$PrinterName)
$p = Get-Printer -Name $PrinterName -ErrorAction SilentlyContinue
if ($p) { Write-Output "OK" ; exit 0 }
Write-Output "MISSING"
exit 1
