$pdfPath = "D:\Eval PM\Monitoring logbook\MP\MP\se-07-06s2-ii-2021-petunjuk-pelaksanaan-input-transaksi-erp-sap-ptpn-vi-final-edisi-1_compress.pdf"

$bytes = [System.IO.File]::ReadAllBytes($pdfPath)
$text = [System.Text.Encoding]::ASCII.GetString($bytes)

# Extract all text inside (...) Tj - PDF text objects
$matches = [regex]::Matches($text, '\(([^\)]{3,80})\)\s*Tj')
$out = $matches | ForEach-Object { $_.Groups[1].Value.Trim() } | Where-Object { $_ -match '[A-Za-z0-9]' }

$combined = $out -join ' '
Write-Output $combined.Substring(0, [Math]::Min(10000, $combined.Length))
