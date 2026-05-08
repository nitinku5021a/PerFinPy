@echo off
setlocal

set "ROOT=%~dp0"
if "%PERFINPY_BACKUP_DIR%"=="" set "PERFINPY_BACKUP_DIR=%USERPROFILE%\Documents\PerFinPyBackups"
if "%PERFINPY_BACKUP_KEEP_LATEST%"=="" set "PERFINPY_BACKUP_KEEP_LATEST=5"
set "PY=%ROOT%\venv\Scripts\python.exe"
set "SCRIPT=%ROOT%\export-excel.py"

if not exist "%PY%" (
  set "PY=python"
)

if not exist "%SCRIPT%" (
  echo ERROR: export script not found at "%SCRIPT%".
  exit /b 1
)

"%PY%" "%SCRIPT%" "%PERFINPY_BACKUP_DIR%" %PERFINPY_BACKUP_KEEP_LATEST%

endlocal
