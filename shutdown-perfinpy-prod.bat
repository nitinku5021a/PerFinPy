@echo off
setlocal

set "ROOT=d:\Production\PerFinPy"
set "CMD=%ROOT%\prod.cmd"

if not exist "%CMD%" (
  echo ERROR: prod.cmd not found at "%CMD%"
  exit /b 1
)

echo Stopping existing PerFinPy processes (if any)...
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$ports = New-Object 'System.Collections.Generic.HashSet[int]';" ^
  "$defaults = @('8001','8002','5173','5174');" ^
  "foreach ($p in $defaults + @($env:BACKEND_PORT, $env:FRONTEND_PORT)) {" ^
  "  if ($p -and ($p -as [int])) { [void]$ports.Add([int]$p) }" ^
  "}" ^
  "foreach ($port in $ports) {" ^
  "  try {" ^
  "    $conns = Get-NetTCPConnection -State Listen -LocalPort $port -ErrorAction Stop | Select-Object -ExpandProperty OwningProcess -Unique;" ^
  "  } catch {" ^
  "    $conns = @();" ^
  "  }" ^
  "  foreach ($procId in $conns) {" ^
  "    try { Stop-Process -Id $procId -Force -ErrorAction Stop; Write-Host ('Stopped PID ' + $procId + ' on port ' + $port) } catch {}" ^
  "  }" ^
  "}"


endlocal
