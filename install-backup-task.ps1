param(
  [string]$TaskName = "PerFinPy Daily Backup",
  [string]$BackupDir = "G:\\My Drive\\Personal Finance\\PerFin_2025_26\\PerFin_Backup",
  [int]$KeepDays = 5,
  [string]$Time = "02:00"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$scriptPath = Join-Path $root "backup-db.ps1"

if (-not (Test-Path $scriptPath)) {
  throw "backup-db.ps1 not found at $scriptPath"
}

$action = New-ScheduledTaskAction `
  -Execute "powershell.exe" `
  -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$scriptPath`" -BackupDir `"$BackupDir`" -KeepDays $KeepDays" `
  -WorkingDirectory $root

$trigger = New-ScheduledTaskTrigger -Daily -At $Time
$principal = New-ScheduledTaskPrincipal -UserId "$env:USERNAME" -RunLevel Highest

$task = New-ScheduledTask -Action $action -Trigger $trigger -Principal $principal

Register-ScheduledTask -TaskName $TaskName -InputObject $task -Force | Out-Null

Write-Host "==> Installed scheduled task: $TaskName"
Write-Host "==> Daily backup at $Time to $BackupDir (keep last $KeepDays files)"
