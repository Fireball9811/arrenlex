# Script para matar procesos node.js corriendos
$processes = Get-Process | Where-Object {$_.Name -like "*node*"} | Select-Object Id, ProcessId, ProcessName

# Inicializar lista de procesos
$nodeProcesses = @()

foreach ($proc in $processes) {
  $pid = $proc.Id
  taskkill /FIM $pid /T 2>NUL
}

# Mostrar resultados
Write-Host "Se encontraron $($nodeProcesses.Count) procesos node.exe corriendo. Deteniendo..."
foreach ($proc in $nodeProcesses) {
  Write-Host "Proceso: $($proc.ProcessName) - PID: $($proc.Id)"
}

Write-Host ""
Write-Host "Todos los procesos han sido terminados."
