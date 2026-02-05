param(
  [string]$BackupDir = "G:\\My Drive\\Personal Finance\\PerFin_2025_26\\PerFin_Backup",
  [int]$KeepDays = 5
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$dbPath = Join-Path $root "accounting.db"
$venvPath = Join-Path $root "venv"
$python = Join-Path $venvPath "Scripts\\python.exe"

if (-not (Test-Path $dbPath)) {
  throw "Database file not found: $dbPath"
}

if (-not (Test-Path $BackupDir)) {
  New-Item -ItemType Directory -Path $BackupDir | Out-Null
}

$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$backupPath = Join-Path $BackupDir "PerFinPy-$timestamp.db"

if (-not (Test-Path $python)) {
  throw "Python venv not found: $python (run dev/prod once to create venv)"
}

$py = @"
import sqlite3, sys
src = r'''$dbPath'''
dst = r'''$backupPath'''
con = sqlite3.connect(src)
try:
    with sqlite3.connect(dst) as out:
        con.backup(out)
finally:
    con.close()
"@

& $python - <<PYCODE
$py
PYCODE

Get-ChildItem -Path $BackupDir -Filter "PerFinPy-*.db" |
  Sort-Object LastWriteTime -Descending |
  Select-Object -Skip $KeepDays |
  Remove-Item -Force

Write-Host "==> Backup created: $backupPath"
