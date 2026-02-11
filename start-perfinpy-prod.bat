@echo off
setlocal

set "ROOT=d:\Production\PerFinPy"
set "CMD=%ROOT%\prod.cmd"

if not exist "%CMD%" (
  echo ERROR: prod.cmd not found at "%CMD%"
  exit /b 1
)

powershell -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -Command "Start-Process -WindowStyle Hidden -WorkingDirectory '%ROOT%' -FilePath 'cmd.exe' -ArgumentList '/c ""%CMD%""'"

endlocal
