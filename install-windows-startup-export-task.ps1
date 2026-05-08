param(
  [string]$TaskName = "PerFinPy Startup Excel Backup",
  [string]$BackupDir = "$env:USERPROFILE\Documents\PerFinPyBackups",
  [int]$KeepLatest = 5,
  [string]$ExportUrl = "",
  [string]$Delay = "PT2M"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$batPath = Join-Path $root "startup-export-excel.bat"

if (-not (Test-Path $batPath)) {
  throw "startup-export-excel.bat not found at $batPath"
}

$envParts = @(
  "set `"PERFINPY_BACKUP_DIR=$BackupDir`"",
  "set `"PERFINPY_BACKUP_KEEP_LATEST=$KeepLatest`""
)
if ($ExportUrl) {
  $envParts += "set `"PERFINPY_EXPORT_URL=$ExportUrl`""
}
$argument = "/c " + ($envParts -join " && ") + " && `"$batPath`""

$action = New-ScheduledTaskAction `
  -Execute "cmd.exe" `
  -Argument $argument `
  -WorkingDirectory $root

$trigger = New-ScheduledTaskTrigger -AtLogOn
$trigger.Delay = $Delay
$principal = New-ScheduledTaskPrincipal -UserId "$env:USERNAME" -RunLevel Highest

$task = New-ScheduledTask -Action $action -Trigger $trigger -Principal $principal

Register-ScheduledTask -TaskName $TaskName -InputObject $task -Force | Out-Null

Write-Host "==> Installed scheduled task: $TaskName"
Write-Host "==> It will export Excel at logon after delay $Delay"
Write-Host "==> Backup directory: $BackupDir"
if ($ExportUrl) {
  Write-Host "==> Remote export URL: $ExportUrl"
}
