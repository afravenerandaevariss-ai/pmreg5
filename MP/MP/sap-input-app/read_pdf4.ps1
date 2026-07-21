$pdfPath = "D:\Eval PM\Monitoring logbook\MP\MP\se-07-06s2-ii-2021-petunjuk-pelaksanaan-input-transaksi-erp-sap-ptpn-vi-final-edisi-1_compress.pdf"

$enc = [System.Text.Encoding]::GetEncoding(1252)
$bytes = [System.IO.File]::ReadAllBytes($pdfPath)
$text = $enc.GetString($bytes)

# Find text using Tj operator pattern
$matches = [regex]::Matches($text, '\(([^\(\)\r\n]{3,120})\)\s*Tj')

$out = @()
foreach ($m in $matches) {
    $val = $m.Groups[1].Value.Trim()
    if ($val -match '[A-Za-z]{4,}') {
        $out += $val
    }
}

$combined = $out -join "`n"
Write-Output $combined.Substring(0, [Math]::Min(10000, $combined.Length))
