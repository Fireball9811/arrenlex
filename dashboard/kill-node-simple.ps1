# Script simple para detener node.js
$processes = Get-Process | Where-Object {$_.Name -like "*node*"}

# Terminar cada proceso
foreach ($proc in $processes) {
  Stop-Process -Id $proc.Id -Force
}

Write-Host "Todos los procesos node.exe han sido terminados."