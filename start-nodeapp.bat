@echo off
setlocal enabledelayedexpansion

set ROOT_DIR=%~dp0
set API_DIR=%ROOT_DIR%nodeapp\api
set WEB_DIR=%ROOT_DIR%nodeapp\web

echo Stopping any process on port 8001...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :8001 ^| findstr LISTENING') do (
  echo Killing PID %%a
  taskkill /PID %%a /F >nul 2>&1
)

set WEB_PORT=3000
echo Stopping any Node process on port %WEB_PORT%...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :%WEB_PORT% ^| findstr LISTENING') do (
  for /f "tokens=1" %%b in ('tasklist /FI "PID eq %%a" /FO CSV ^| findstr /I "node.exe"') do (
    echo Killing PID %%a
    taskkill /PID %%a /F >nul 2>&1
  )
)

for /f "tokens=5" %%a in ('netstat -ano ^| findstr :%WEB_PORT% ^| findstr LISTENING') do (
  set WEB_PORT=3001
)

echo Starting Node API...
start "perfinpy-api" cmd /k "cd /d %API_DIR% && npm install && npm run start"

echo Starting Next.js web...
start "perfinpy-web" cmd /k "cd /d %WEB_DIR% && set PORT=%WEB_PORT% && npm install && npm run dev"

echo.
echo API: http://127.0.0.1:8001
echo Web: http://127.0.0.1:%WEB_PORT%
echo.
echo Press any key to close this window (services keep running)...
pause >nul
