@echo off
setlocal

set "ROOT=%~dp0"
if "%PERFINPY_BACKUP_DIR%"=="" set "PERFINPY_BACKUP_DIR=G:\My Drive\Personal Finance\PerFin_2025_26\PerFin_Backup"
if "%PERFINPY_BACKUP_KEEP_LATEST%"=="" set "PERFINPY_BACKUP_KEEP_LATEST=5"
if "%PERFINPY_BACKUP_LOG_DIR%"=="" set "PERFINPY_BACKUP_LOG_DIR=%ROOT%logs"
if "%PERFINPY_BACKUP_WAIT_TIMEOUT%"=="" set "PERFINPY_BACKUP_WAIT_TIMEOUT=300"
if "%PERFINPY_BACKUP_WAIT_INTERVAL%"=="" set "PERFINPY_BACKUP_WAIT_INTERVAL=10"
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

>> "%LOG_FILE%" echo.
>> "%LOG_FILE%" echo [%DATE% %TIME%] Starting PerFinPy Excel backup
>> "%LOG_FILE%" echo ROOT=%ROOT%
>> "%LOG_FILE%" echo PY=%PY%
>> "%LOG_FILE%" echo BACKUP_DIR=%PERFINPY_BACKUP_DIR%
>> "%LOG_FILE%" echo KEEP_LATEST=%PERFINPY_BACKUP_KEEP_LATEST%
>> "%LOG_FILE%" echo WAIT_TIMEOUT=%PERFINPY_BACKUP_WAIT_TIMEOUT%
>> "%LOG_FILE%" echo WAIT_INTERVAL=%PERFINPY_BACKUP_WAIT_INTERVAL%
>> "%LOG_FILE%" echo EXPORT_URL=%PERFINPY_EXPORT_URL%

call :wait_for_backup_dir >> "%LOG_FILE%" 2>&1
if errorlevel 1 (
  >> "%LOG_FILE%" echo [%DATE% %TIME%] Finished with exit code 1
  endlocal & exit /b 1
)

"%PY%" "%SCRIPT%" "%PERFINPY_BACKUP_DIR%" %PERFINPY_BACKUP_KEEP_LATEST% >> "%LOG_FILE%" 2>&1
set "EXIT_CODE=%ERRORLEVEL%"

>> "%LOG_FILE%" echo [%DATE% %TIME%] Finished with exit code %EXIT_CODE%
endlocal & exit /b %EXIT_CODE%

:wait_for_backup_dir
set "WAITED=0"

:wait_for_backup_dir_loop
if exist "%PERFINPY_BACKUP_DIR%\" (
  echo [%DATE% %TIME%] Backup directory is available.
  exit /b 0
)

if exist "%PERFINPY_BACKUP_DIR%\.." (
  echo [%DATE% %TIME%] Backup directory parent is available; exporter will create the backup directory if needed.
  exit /b 0
)

if %WAITED% GEQ %PERFINPY_BACKUP_WAIT_TIMEOUT% (
  echo [%DATE% %TIME%] ERROR: Backup directory parent is not available after %PERFINPY_BACKUP_WAIT_TIMEOUT% seconds: "%PERFINPY_BACKUP_DIR%"
  exit /b 1
)

echo [%DATE% %TIME%] Waiting for backup directory parent: "%PERFINPY_BACKUP_DIR%"
timeout /t %PERFINPY_BACKUP_WAIT_INTERVAL% /nobreak >nul
set /a "WAITED+=PERFINPY_BACKUP_WAIT_INTERVAL"
goto wait_for_backup_dir_loop
