Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$frontend = Join-Path $root "frontend"
$venvPath = Join-Path $root "venv"
$python = Join-Path $venvPath "Scripts\\python.exe"

Write-Host "==> PerFinPy local dev boot"

if (-not (Test-Path $venvPath)) {
  Write-Host "==> Creating Python virtual environment"
  & python -m venv $venvPath
}

Write-Host "==> Installing backend dependencies"
& $python -m pip install -r (Join-Path $root "requirements.txt")

Write-Host "==> Installing frontend dependencies"
Push-Location $frontend
& npm install
& node scripts/fix-css-tree.cjs
Pop-Location

Write-Host "==> Starting backend (Flask) in background and frontend (SvelteKit) in foreground"

$backend = Start-Process -WorkingDirectory $root -FilePath $python -ArgumentList "run.py" -NoNewWindow -PassThru

Write-Host ""
Write-Host "Backend:  http://127.0.0.1:5000"
Write-Host "Frontend: http://127.0.0.1:5173"
Write-Host ""
Write-Host "Press Ctrl+C to stop."

try {
  Push-Location $frontend
  & npm run dev
} finally {
  Pop-Location
  if ($backend -and -not $backend.HasExited) {
    Stop-Process -Id $backend.Id -Force
  }
}
