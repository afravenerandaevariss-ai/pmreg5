$tutorialDir = "D:\Eval PM\Monitoring logbook\MP\MP\tutorial"
$publicImagesDir = "D:\Eval PM\Monitoring logbook\MP\MP\sap-input-app\public\images"

# Map of docx keywords to target folders
$docxMapping = @{
    "zesthlp16pa" = "zesthlp16pa"
    "TUTORIAL BUAT WO PM" = "iw31"
    "CARA TECO" = "iw32"
    "CARA GI MM" = "migo"
    "ZESTHLC003PA" = "zesthlc003pa"
}

# Create base public images dir if not exists
if (!(Test-Path $publicImagesDir)) {
    New-Item -ItemType Directory -Path $publicImagesDir -Force | Out-Null
}

# Get all docx files in tutorial dir
$docxFiles = Get-ChildItem -Path $tutorialDir -Filter "*.docx"

foreach ($file in $docxFiles) {
    Write-Host "Processing file: $($file.Name)"
    
    # Determine target folder
    $targetFolder = $null
    foreach ($key in $docxMapping.Keys) {
        if ($file.Name -like "*$key*") {
            $targetFolder = $docxMapping[$key]
            break
        }
    }
    
    if ($null -eq $targetFolder) {
        $targetFolder = $file.BaseName.Replace(" ", "_").ToLower()
    }
    
    $destDir = Join-Path $publicImagesDir $targetFolder
    if (!(Test-Path $destDir)) {
        New-Item -ItemType Directory -Path $destDir -Force | Out-Null
    } else {
        # Clear existing images in target folder
        Remove-Item -Path (Join-Path $destDir "*") -Force -ErrorAction SilentlyContinue
    }
    
    # Copy to temporary zip file
    $tempZip = Join-Path $env:TEMP "$($file.BaseName).zip"
    Copy-Item -Path $file.FullName -Destination $tempZip -Force
    
    # Create temp extraction folder
    $tempExtract = Join-Path $env:TEMP $file.BaseName
    if (Test-Path $tempExtract) {
        Remove-Item -Path $tempExtract -Recurse -Force -ErrorAction SilentlyContinue
    }
    New-Item -ItemType Directory -Path $tempExtract -Force | Out-Null
    
    Write-Host "  Extracting archive to temporary folder..."
    try {
        Expand-Archive -Path $tempZip -DestinationPath $tempExtract -Force
        
        $mediaPath = Join-Path $tempExtract "word\media"
        if (Test-Path $mediaPath) {
            $images = Get-ChildItem -Path $mediaPath
            Write-Host "  Found $($images.Count) images. Copying and renaming..."
            
            # Sort images numerically to keep document order
            $sortedImages = $images | Sort-Object { 
                # Extract numbers from name to sort correctly (e.g. image2 before image10)
                [int]($_.BaseName -replace '[^\d]') 
            }
            
            $idx = 1
            foreach ($img in $sortedImages) {
                $newFilename = "step_$idx$($img.Extension)"
                $destPath = Join-Path $destDir $newFilename
                Copy-Item -Path $img.FullName -Destination $destPath -Force
                Write-Host "    Copied: $($img.Name) -> $newFilename"
                $idx++
            }
            Write-Host "  Successfully extracted images to $destDir"
        } else {
            Write-Host "  No word/media folder found in this docx."
        }
    } catch {
        Write-Host "  Error processing zip extraction: $_"
    } finally {
        # Cleanup temporary files
        Remove-Item -Path $tempZip -Force -ErrorAction SilentlyContinue
        Remove-Item -Path $tempExtract -Recurse -Force -ErrorAction SilentlyContinue
    }
    Write-Host ""
}
