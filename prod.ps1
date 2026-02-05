Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$frontend = Join-Path $root "frontend"
$venvPath = Join-Path $root "venv"
$python = Join-Path $venvPath "Scripts\\python.exe"

Write-Host "==> PerFinPy production boot"

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
& node scripts/fix-svelte-kit.cjs
Pop-Location

Write-Host "==> Building frontend"
Push-Location $frontend
& npm run build
Pop-Location

$backendHost = $env:BACKEND_HOST
$isWindows = $env:OS -eq "Windows_NT"
if (-not $backendHost) {
  $backendHost = "0.0.0.0"
}

$backendPort = $env:BACKEND_PORT
if (-not $backendPort) {
  if ($isWindows) { $backendPort = "8001" } else { $backendPort = "8000" }
}
$backendPortInUse = $false
try {
  $client = New-Object System.Net.Sockets.TcpClient
  $client.Connect($backendHost, [int]$backendPort)
  $backendPortInUse = $true
} catch {
  $backendPortInUse = $false
} finally {
  if ($client) { $client.Dispose() }
}
if ($backendPortInUse) { $backendPort = "8002" }

$frontendHost = $env:FRONTEND_HOST
if (-not $frontendHost) { $frontendHost = "0.0.0.0" }

$frontendPort = $env:FRONTEND_PORT
if (-not $frontendPort) { $frontendPort = "5173" }
$portInUse = $false
try {
  $client = New-Object System.Net.Sockets.TcpClient
  $client.Connect($frontendHost, [int]$frontendPort)
  $portInUse = $true
} catch {
  $portInUse = $false
} finally {
  if ($client) { $client.Dispose() }
}
if ($portInUse) { $frontendPort = "5174" }

if (-not $env:API_BASE_URL) {
  $env:API_BASE_URL = "http://127.0.0.1:$backendPort"
}

$env:NODE_ENV = "production"
$env:HOST = $frontendHost
$env:PORT = $frontendPort

Write-Host "==> Starting backend (gunicorn) in background and frontend (node) in foreground"
Write-Host ""
Write-Host "Backend:  http://$backendHost`:$backendPort"
Write-Host "Frontend: http://$frontendHost`:$frontendPort"
Write-Host "API Base: $env:API_BASE_URL"
Write-Host ""
Write-Host "Press Ctrl+C to stop."

if ($isWindows) {
  $backendArgs = @(
    "-m", "waitress",
    "--host=$backendHost",
    "--port=$backendPort",
    "wsgi:app"
  )
} else {
  $gunicornArgs = @(
    "wsgi:app",
    "--bind", "$backendHost`:$backendPort",
    "--workers", "3"
  )
  $backendArgs = @("-m", "gunicorn") + $gunicornArgs
}

$backend = Start-Process -WorkingDirectory $root -FilePath $python -ArgumentList $backendArgs -NoNewWindow -PassThru

try {
  Push-Location $frontend
  & node build
} finally {
  Pop-Location
  if ($backend -and -not $backend.HasExited) {
    Stop-Process -Id $backend.Id -Force
  }
}
