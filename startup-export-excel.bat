@echo off
setlocal

set "ROOT=%~dp0"
if "%PERFINPY_BACKUP_DIR%"=="" set "PERFINPY_BACKUP_DIR=G:\My Drive\Personal Finance\PerFin_2025_26\PerFin_Backup"
if "%PERFINPY_BACKUP_KEEP_LATEST%"=="" set "PERFINPY_BACKUP_KEEP_LATEST=5"
if "%PERFINPY_BACKUP_LOG_DIR%"=="" set "PERFINPY_BACKUP_LOG_DIR=%ROOT%logs"
set "PY=%ROOT%\venv\Scripts\python.exe"
set "SCRIPT=%ROOT%\export-excel.py"

if not exist "%PY%" (
  set "PY=python"
)

if not exist "%SCRIPT%" (
  echo ERROR: export script not found at "%SCRIPT%".
  exit /b 1
)

if not exist "%PERFINPY_BACKUP_LOG_DIR%" mkdir "%PERFINPY_BACKUP_LOG_DIR%"
set "LOG_FILE=%PERFINPY_BACKUP_LOG_DIR%\startup-export-excel.log"

echo.>> "%LOG_FILE%"
echo [%DATE% %TIME%] Starting PerFinPy Excel backup>> "%LOG_FILE%"
echo ROOT=%ROOT%>> "%LOG_FILE%"
echo PY=%PY%>> "%LOG_FILE%"
echo BACKUP_DIR=%PERFINPY_BACKUP_DIR%>> "%LOG_FILE%"
echo KEEP_LATEST=%PERFINPY_BACKUP_KEEP_LATEST%>> "%LOG_FILE%"
echo EXPORT_URL=%PERFINPY_EXPORT_URL%>> "%LOG_FILE%"

"%PY%" "%SCRIPT%" "%PERFINPY_BACKUP_DIR%" %PERFINPY_BACKUP_KEEP_LATEST% >> "%LOG_FILE%" 2>&1
set "EXIT_CODE=%ERRORLEVEL%"

echo [%DATE% %TIME%] Finished with exit code %EXIT_CODE%>> "%LOG_FILE%"
exit /b %EXIT_CODE%

endlocal
