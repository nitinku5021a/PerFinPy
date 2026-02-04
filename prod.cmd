@echo off
setlocal
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0prod.ps1"
endlocal
