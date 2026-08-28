$ErrorActionPreference = "Stop"

$Script = Join-Path (Split-Path -Parent $MyInvocation.MyCommand.Path) "update.ps1"
$Action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$Script`""
$Trigger = New-ScheduledTaskTrigger -Once -At (Get-Date) -RepetitionInterval (New-TimeSpan -Minutes 45) -RepetitionDuration ([TimeSpan]::MaxValue)

Register-ScheduledTask -TaskName "campus-rain-update" -Action $Action -Trigger $Trigger -Description "雨否天气数据每45分钟更新" -Force
Write-Host "已注册任务 campus-rain-update，每 45 分钟运行一次"
Write-Host "卸载：Unregister-ScheduledTask -TaskName campus-rain-update -Confirm:`$false"
