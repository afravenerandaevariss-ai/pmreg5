Add-Type -AssemblyName System.IO.Compression.FileSystem
$docx = 'D:\Eval PM\Monitoring logbook\MP\MP\tutorial\zesthlc003pa.docx'
$zip = [System.IO.Compression.ZipFile]::OpenRead($docx)
$entry = $zip.GetEntry('word/document.xml')
$stream = $entry.Open()
$reader = New-Object System.IO.StreamReader($stream)
$xmlString = $reader.ReadToEnd()
$reader.Close()
$stream.Close()
$zip.Dispose()
$xml = [xml]$xmlString
$xml.SelectNodes('//*[local-name()="t"]') | ForEach-Object { $_.InnerText }
