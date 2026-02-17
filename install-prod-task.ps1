param(
  [string]$TaskName = "PerFinPy Production"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$cmdPath = Join-Path $root "prod.cmd"

if (-not (Test-Path $cmdPath)) {
  throw "prod.cmd not found at $cmdPath"
}

$action = New-ScheduledTaskAction `
  -Execute "cmd.exe" `
  -Argument "/c `"$cmdPath`"" `
  -WorkingDirectory $root

$trigger = New-ScheduledTaskTrigger -AtLogOn
$principal = New-ScheduledTaskPrincipal -UserId "$env:USERNAME" -RunLevel Highest

$task = New-ScheduledTask -Action $action -Trigger $trigger -Principal $principal

Register-ScheduledTask -TaskName $TaskName -InputObject $task -Force | Out-Null

Write-Host "==> Installed scheduled task: $TaskName"
Write-Host "==> It will start PerFinPy at user logon using $cmdPath"
