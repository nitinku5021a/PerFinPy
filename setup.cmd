@echo off
setlocal
REM First-run interactive setup (writes .env locally) then exits.
python "%~dp0install-wizard.py"
if errorlevel 1 exit /b %errorlevel%
echo.
echo Setup complete. You can now run:
echo   dev.cmd   (dev)
echo   prod.cmd  (production-style)
echo.
endlocal

