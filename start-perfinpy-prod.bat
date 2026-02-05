@echo off
setlocal

set "ROOT=d:\Production\PerFinPy"
set "CMD=%ROOT%\prod.cmd"

if not exist "%CMD%" (
  echo ERROR: prod.cmd not found at "%CMD%"
  exit /b 1
)

start "PerFinPy Production" /D "%ROOT%" "%CMD%"

endlocal
