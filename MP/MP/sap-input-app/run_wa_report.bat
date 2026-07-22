@echo off
REM Batch wrapper untuk Windows Task Scheduler - menghindari masalah path spasi
REM PTPN Regional 5 - WhatsApp Logbook Daily Report

cd /d "D:\Eval PM\Monitoring logbook\MP\MP\sap-input-app"

REM Log start time
echo [%date% %time%] Starting WA Logbook Report... >> logs\wa_task.log 2>&1

REM Run node script
"C:\Program Files\nodejs\node.exe" "D:\Eval PM\Monitoring logbook\MP\MP\sap-input-app\scripts\send_wa_daily.js" >> logs\wa_task.log 2>&1

REM Log result
echo [%date% %time%] WA Logbook Report finished. Exit code: %ERRORLEVEL% >> logs\wa_task.log 2>&1
