$WorkDir = "D:\Eval PM\Monitoring logbook\MP\MP\sap-input-app"
$BatchFile = "$WorkDir\run_wa_report.bat"
$CmdPath = "C:\Windows\System32\cmd.exe"

$Settings = New-ScheduledTaskSettingsSet `
    -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries `
    -StartWhenAvailable `
    -ExecutionTimeLimit (New-TimeSpan -Minutes 10)

# Remove old afternoon tasks
@("PTPN_PM_Logbook_Daily_WA_Report_1813","PTPN_PM_Logbook_Daily_WA_Report_1731",
  "PTPN_PM_Logbook_Daily_WA_Report_1800","PTPN_PM_Logbook_Daily_WA_Report_1822") | ForEach-Object {
    Unregister-ScheduledTask -TaskName $_ -Confirm:$false -ErrorAction SilentlyContinue
}

# Register 18:22 WIB task
$Action = New-ScheduledTaskAction -Execute $CmdPath -Argument "/c `"$BatchFile`""
$Trigger = New-ScheduledTaskTrigger -Daily -At 6:22PM

Register-ScheduledTask `
    -TaskName "PTPN_PM_Logbook_Daily_WA_Report_1822" `
    -Action $Action `
    -Trigger $Trigger `
    -Settings $Settings `
    -Description "WA Logbook Regional 5 - 18:22 WIB" `
    -Force

Write-Host "Task 1822 registered!" -ForegroundColor Green
schtasks /query /tn "PTPN_PM_Logbook_Daily_WA_Report_1822" /fo TABLE 2>&1
