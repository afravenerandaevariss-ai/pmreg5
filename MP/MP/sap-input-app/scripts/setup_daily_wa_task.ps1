# PowerShell Script to register 08:00 AM & 18:13 WIB Daily Task Scheduler
# Uses CMD batch wrapper to avoid path-with-spaces issue in Task Scheduler
# IMPORTANT: WorkingDirectory is NOT set in Action (handled by batch file itself)

$WorkDir = "D:\Eval PM\Monitoring logbook\MP\MP\sap-input-app"
$BatchFile = "$WorkDir\run_wa_report.bat"
$CmdPath = "C:\Windows\System32\cmd.exe"

Write-Host "Setting up Windows Task Scheduler tasks using CMD batch wrapper..." -ForegroundColor Green
Write-Host "Batch File: $BatchFile" -ForegroundColor Yellow

# Common settings: start when available (catches missed runs if PC was off)
$Settings = New-ScheduledTaskSettingsSet `
    -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries `
    -StartWhenAvailable `
    -ExecutionTimeLimit (New-TimeSpan -Minutes 10)

# === Task 1: 08:00 AM Daily ===
$TaskName1 = "PTPN_PM_Logbook_Daily_WA_Report_0800"
# NO -WorkingDirectory to avoid path-with-spaces issue (handled by batch file)
$Action1 = New-ScheduledTaskAction `
    -Execute $CmdPath `
    -Argument "/c `"$BatchFile`""

$Trigger1 = New-ScheduledTaskTrigger -Daily -At 8:00AM

Register-ScheduledTask `
    -TaskName $TaskName1 `
    -Action $Action1 `
    -Trigger $Trigger1 `
    -Settings $Settings `
    -Description "Otomatisasi pengiriman laporan WA Logbook Regional 5 - 08:00 WIB" `
    -Force

Write-Host "Task '$TaskName1' registered for 08:00 AM WIB!" -ForegroundColor Green

# === Clean up old afternoon tasks ===
$oldTasks = @(
    "PTPN_PM_Logbook_Daily_WA_Report_1530",
    "PTPN_PM_Logbook_Daily_WA_Report_1600",
    "PTPN_PM_Logbook_Daily_WA_Report_1610",
    "PTPN_PM_Logbook_Daily_WA_Report_1616",
    "PTPN_PM_Logbook_Daily_WA_Report_1618",
    "PTPN_PM_Logbook_Daily_WA_Report_1620",
    "PTPN_PM_Logbook_Daily_WA_Report_1621",
    "PTPN_PM_Logbook_Daily_WA_Report_1627",
    "PTPN_PM_Logbook_Daily_WA_Report_1650",
    "PTPN_PM_Logbook_Daily_WA_Report_1701",
    "PTPN_PM_Logbook_Daily_WA_Report_1715",
    "PTPN_PM_Logbook_Daily_WA_Report_1728",
    "PTPN_PM_Logbook_Daily_WA_Report_1731",
    "PTPN_PM_Logbook_Daily_WA_Report_1800",
    "PTPN_PM_Logbook_Daily_WA_Report_1813",
    "PTPN_PM_Logbook_Daily_WA_Report_1822",
    "PTPN_PM_Logbook_Daily_WA_Report_1833"
)
foreach ($t in $oldTasks) {
    Unregister-ScheduledTask -TaskName $t -Confirm:$false -ErrorAction SilentlyContinue
}

# === Task 2: 18:33 WIB Daily ===
$TaskName2 = "PTPN_PM_Logbook_Daily_WA_Report_1833"
# NO -WorkingDirectory to avoid path-with-spaces issue (handled by batch file)
$Action2 = New-ScheduledTaskAction `
    -Execute $CmdPath `
    -Argument "/c `"$BatchFile`""

$Trigger2 = New-ScheduledTaskTrigger -Daily -At 6:33PM

Register-ScheduledTask `
    -TaskName $TaskName2 `
    -Action $Action2 `
    -Trigger $Trigger2 `
    -Settings $Settings `
    -Description "Otomatisasi pengiriman laporan WA Logbook Regional 5 - 18:33 WIB" `
    -Force

Write-Host "Task '$TaskName2' registered for 18:33 WIB!" -ForegroundColor Green

Write-Host ""
Write-Host "=== Running immediate test of task 1731 ===" -ForegroundColor Cyan
Start-ScheduledTask -TaskName $TaskName2
Start-Sleep -Seconds 3
$taskInfo = Get-ScheduledTaskInfo -TaskName $TaskName2
Write-Host "Last Run Time : $($taskInfo.LastRunTime)"
Write-Host "Last Result   : $($taskInfo.LastTaskResult)"
Write-Host ""
Write-Host "=== Final Task Status ===" -ForegroundColor Cyan
schtasks /query /tn $TaskName1 /fo TABLE 2>&1
schtasks /query /tn $TaskName2 /fo TABLE 2>&1
