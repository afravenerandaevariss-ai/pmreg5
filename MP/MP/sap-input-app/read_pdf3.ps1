$pdfPath = "D:\Eval PM\Monitoring logbook\MP\MP\se-07-06s2-ii-2021-petunjuk-pelaksanaan-input-transaksi-erp-sap-ptpn-vi-final-edisi-1_compress.pdf"

# Read file as bytes then convert to string preserving Latin-1
$stream = [System.IO.File]::OpenRead($pdfPath)
$reader = New-Object System.IO.StreamReader($stream, [System.Text.Encoding]::Latin1)
$text = $reader.ReadToEnd()
$reader.Close()
$stream.Close()

# Find text using multiple patterns
$pattern1 = [regex]::Matches($text, '\(([^\(\)]{3,100})\)\s*Tj')
$pattern2 = [regex]::Matches($text, '\(([^\(\)]{3,100})\)\s*TJ')
$pattern3 = [regex]::Matches($text, '"([A-Za-z][^"]{3,80})"')

$all = @()
foreach ($m in $pattern1) { $all += $m.Groups[1].Value }
foreach ($m in $pattern2) { $all += $m.Groups[1].Value }

# Filter to only printable text with meaningful words
$filtered = $all | Where-Object { $_ -match '[A-Za-z ]{5,}' } | ForEach-Object { $_.Trim() }

$combined = $filtered -join "`n"
# Show first 8000 chars
Write-Output $combined.Substring(0, [Math]::Min(8000, $combined.Length))
