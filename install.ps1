Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

param(
  [ValidateSet("dev", "prod")]
  [string]$Mode = "dev",

  [switch]$InstallPrereqs
)

function Test-CommandAvailable {
  param([Parameter(Mandatory = $true)][string]$Name)
  return [bool](Get-Command $Name -ErrorAction SilentlyContinue)
}

function Assert-Prereq {
  param(
    [Parameter(Mandatory = $true)][string]$Name,
    [Parameter(Mandatory = $true)][string]$InstallHint
  )
  if (-not (Test-CommandAvailable $Name)) {
    Write-Host ""
    Write-Host "Missing prerequisite: $Name"
    Write-Host $InstallHint
    Write-Host ""
    throw "Prerequisite missing: $Name"
  }
}

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $root

Write-Host "==> PerFinPy one-click install ($Mode)"

$envExample = Join-Path $root ".env.example"
$envFile = Join-Path $root ".env"
if ((Test-Path $envExample) -and -not (Test-Path $envFile)) {
  Copy-Item -LiteralPath $envExample -Destination $envFile
  Write-Host "==> Created .env from .env.example (edit it if needed)"
}

if ($InstallPrereqs) {
  if (-not (Test-CommandAvailable "winget")) {
    throw "winget not found. Install App Installer from Microsoft Store (or install Python + Node.js manually), then re-run with -InstallPrereqs."
  }

  if (-not (Test-CommandAvailable "python")) {
    Write-Host "==> Installing Python via winget"
    & winget install -e --id Python.Python.3.11 --accept-package-agreements --accept-source-agreements
  }

  if (-not (Test-CommandAvailable "npm")) {
    Write-Host "==> Installing Node.js LTS via winget"
    & winget install -e --id OpenJS.NodeJS.LTS --accept-package-agreements --accept-source-agreements
  }
}

Assert-Prereq -Name "python" -InstallHint "Install Python 3.10+ (or run: winget install -e --id Python.Python.3.11)"
Assert-Prereq -Name "npm" -InstallHint "Install Node.js 18+ (or run: winget install -e --id OpenJS.NodeJS.LTS)"

$script = if ($Mode -eq "prod") { "prod.ps1" } else { "dev.ps1" }
$scriptPath = Join-Path $root $script
if (-not (Test-Path $scriptPath)) {
  throw "Missing script: $scriptPath"
}

& powershell -NoProfile -ExecutionPolicy Bypass -File $scriptPath

