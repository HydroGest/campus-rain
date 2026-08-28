$ErrorActionPreference = "Stop"

$Script = Join-Path (Split-Path -Parent $MyInvocation.MyCommand.Path) "update.ps1"
$Action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$Script`""
$Trigger = New-ScheduledTaskTrigger -Once -At (Get-Date) -RepetitionInterval (New-TimeSpan -Minutes 45) -RepetitionDuration ([TimeSpan]::MaxValue)

Register-ScheduledTask -TaskName "campus-rain-update" -Action $Action -Trigger $Trigger -Description "campus rain weather data updater" -Force
Write-Host "Registered task campus-rain-update, runs every 45 minutes"
Write-Host "Uninstall: Unregister-ScheduledTask -TaskName campus-rain-update -Confirm:`$false"
