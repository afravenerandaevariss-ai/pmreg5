# PowerShell Script to register 08:00 AM & 05:15 PM Daily Task Scheduler for WhatsApp Logbook Report
$WorkDir = Get-Location
$NodePath = (Get-Command node).Source
$ScriptPath = "$WorkDir\scripts\send_wa_daily.js"

Write-Host "Setting up Windows Task Scheduler tasks with quoted paths..." -ForegroundColor Green
Write-Host "Working Directory: $WorkDir" -ForegroundColor Yellow
Write-Host "Node Path: $NodePath" -ForegroundColor Yellow
Write-Host "Script Path: $ScriptPath" -ForegroundColor Yellow

# Task 1: 08:00 AM Daily Task
$TaskName1 = "PTPN_PM_Logbook_Daily_WA_Report_0800"
$Action1 = New-ScheduledTaskAction -Execute $NodePath -Argument "`"$ScriptPath`"" -WorkingDirectory $WorkDir
$Trigger1 = New-ScheduledTaskTrigger -Daily -At 8:00AM
$Settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable

Register-ScheduledTask -TaskName $TaskName1 -Action $Action1 -Trigger $Trigger1 -Settings $Settings -Description "Otomatisasi pengiriman laporan WhatsApp Logbook Kendaraan Regional 5 via GoWA setiap jam 08:00 AM WIB." -Force
Write-Host "Task '$TaskName1' successfully registered for 08:00 AM WIB!" -ForegroundColor Green

# Task 2: 05:15 PM (17:15 WIB) Daily Task
$TaskName2 = "PTPN_PM_Logbook_Daily_WA_Report_1715"
# Unregister old afternoon tasks if present
Unregister-ScheduledTask -TaskName "PTPN_PM_Logbook_Daily_WA_Report_1530" -Confirm:$false -ErrorAction SilentlyContinue
Unregister-ScheduledTask -TaskName "PTPN_PM_Logbook_Daily_WA_Report_1600" -Confirm:$false -ErrorAction SilentlyContinue
Unregister-ScheduledTask -TaskName "PTPN_PM_Logbook_Daily_WA_Report_1610" -Confirm:$false -ErrorAction SilentlyContinue
Unregister-ScheduledTask -TaskName "PTPN_PM_Logbook_Daily_WA_Report_1616" -Confirm:$false -ErrorAction SilentlyContinue
Unregister-ScheduledTask -TaskName "PTPN_PM_Logbook_Daily_WA_Report_1618" -Confirm:$false -ErrorAction SilentlyContinue
Unregister-ScheduledTask -TaskName "PTPN_PM_Logbook_Daily_WA_Report_1620" -Confirm:$false -ErrorAction SilentlyContinue
Unregister-ScheduledTask -TaskName "PTPN_PM_Logbook_Daily_WA_Report_1621" -Confirm:$false -ErrorAction SilentlyContinue
Unregister-ScheduledTask -TaskName "PTPN_PM_Logbook_Daily_WA_Report_1627" -Confirm:$false -ErrorAction SilentlyContinue
Unregister-ScheduledTask -TaskName "PTPN_PM_Logbook_Daily_WA_Report_1650" -Confirm:$false -ErrorAction SilentlyContinue
Unregister-ScheduledTask -TaskName "PTPN_PM_Logbook_Daily_WA_Report_1701" -Confirm:$false -ErrorAction SilentlyContinue

$Action2 = New-ScheduledTaskAction -Execute $NodePath -Argument "`"$ScriptPath`"" -WorkingDirectory $WorkDir
$Trigger2 = New-ScheduledTaskTrigger -Daily -At 5:15PM
Register-ScheduledTask -TaskName $TaskName2 -Action $Action2 -Trigger $Trigger2 -Settings $Settings -Description "Otomatisasi pengiriman laporan WhatsApp Logbook Kendaraan Regional 5 via GoWA setiap jam 05:15 PM (17:15 WIB)." -Force
Write-Host "Task '$TaskName2' successfully registered for 05:15 PM (17:15 WIB)!" -ForegroundColor Green
