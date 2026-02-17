@echo off
setlocal

set "ROOT=d:\Production\PerFinPy"
set "BACKUP_DIR=G:\My Drive\Personal Finance\PerFin_2025_26\PerFin_Backup"
set "KEEP_LATEST=5"
set "PY=%ROOT%\venv\Scripts\python.exe"
set "SCRIPT=%ROOT%\export-excel.py"

if not exist "%PY%" (
  echo ERROR: Python venv not found at "%PY%". Run prod/dev once to create it.
  exit /b 1
)

if not exist "%SCRIPT%" (
  echo ERROR: export script not found at "%SCRIPT%".
  exit /b 1
)

"%PY%" "%SCRIPT%" "%BACKUP_DIR%" %KEEP_LATEST%

endlocal
