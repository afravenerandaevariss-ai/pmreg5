param([string]$pdfPath, [int]$maxPages = 50)

Add-Type -AssemblyName System.IO

$bytes = [System.IO.File]::ReadAllBytes($pdfPath)
$text = [System.Text.Encoding]::Latin1.GetString($bytes)

# Extract text between BT and ET markers (PDF text objects)
$pattern = '(?s)BT(.*?)ET'
$matches = [regex]::Matches($text, $pattern)

$output = @()
foreach ($m in $matches) {
    $inner = $m.Groups[1].Value
    # Extract text from Tj and TJ operators
    $tjMatches = [regex]::Matches($inner, '\(((?:[^()\\]|\\.)*)\)\s*Tj')
    foreach ($tj in $tjMatches) {
        $t = $tj.Groups[1].Value -replace '\\[0-9]{3}', ' ' -replace '\\n', ' ' -replace '\\r', ''
        if ($t.Trim().Length -gt 0) { $output += $t.Trim() }
    }
    $tjMatches2 = [regex]::Matches($inner, '\[((?:[^\[\]]|\[(?:[^\[\]]|\[[^\[\]]*\])*\])*)\]\s*TJ')
    foreach ($tj in $tjMatches2) {
        $inner2 = $tj.Groups[1].Value
        $parts = [regex]::Matches($inner2, '\(((?:[^()\\]|\\.)*)\)')
        foreach ($p in $parts) {
            $t = $p.Groups[1].Value -replace '\\[0-9]{3}', ' ' -replace '\\n', ' '
            if ($t.Trim().Length -gt 0) { $output += $t.Trim() }
        }
    }
}

$result = ($output -join ' ') -replace '\s+', ' '
# Show first 5000 chars
Write-Output $result.Substring(0, [Math]::Min($result.Length, 5000))
