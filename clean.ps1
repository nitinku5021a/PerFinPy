Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path

$targets = @(
  (Join-Path $root "venv"),
  (Join-Path $root "__pycache__"),
  (Join-Path $root "logs"),
  (Join-Path $root "tmp"),
  (Join-Path $root "debug.log"),
  (Join-Path $root ".env"),
  (Join-Path $root "frontend\\node_modules"),
  (Join-Path $root "frontend\\build"),
  (Join-Path $root "frontend\\.svelte-kit")
)

Write-Host "==> Cleaning generated files (keeping accounting.db)"

foreach ($t in $targets) {
  if (Test-Path $t) {
    Remove-Item -LiteralPath $t -Recurse -Force
    Write-Host "Removed: $t"
  }
}

Write-Host "Done."

