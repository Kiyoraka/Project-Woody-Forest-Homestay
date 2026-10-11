# ============================================================
# render-images.ps1 - Woody Forest Homestay photo set
# ============================================================
# Renders the eight homestay photos with gpt-image-2 through the
# Invoke-AliceImageGen.ps1 helper, then converts each PNG master to a
# web-ready JPG in assets/img/. PNG masters stay in tools/out/ (gitignored).
#
# Usage (from the repo root or anywhere):
#   powershell -File tools\render-images.ps1              # render missing + convert
#   powershell -File tools\render-images.ps1 -Force       # re-render everything
#   powershell -File tools\render-images.ps1 -Only deck   # one shot by name
#   powershell -File tools\render-images.ps1 -ConvertOnly # skip the API, just PNG -> JPG
#
# Developer tool - not needed to run the site.
# ============================================================
param(
    [switch]$Force,
    [switch]$ConvertOnly,
    [string]$Only = "",
    [int]$JpegQuality = 85
)

$ErrorActionPreference = "Stop"

$helper  = "C:\Users\User\bin\Invoke-AliceImageGen.ps1"
$root    = Split-Path -Parent $PSScriptRoot
$outDir  = Join-Path $PSScriptRoot "out"
$imgDir  = Join-Path $root "assets\img"
New-Item -ItemType Directory -Path $outDir -Force | Out-Null
New-Item -ItemType Directory -Path $imgDir -Force | Out-Null

# One cabin, one light, one camera - every prompt shares this so the set reads as one place.
$cabin = "a private three-bedroom timber homestay cabin in the Malaysian rainforest: dark-stained tropical hardwood walls, wide covered veranda with slim timber railings, low-pitched roof softened by moss, surrounded by tall dipterocarp trees, tree ferns and hanging vines"
$style = "editorial travel photography, 35mm full-frame look, natural light, soft shadows, rich greens and warm wood tones, high detail, photorealistic, no people, no text, no watermark, no logos"

$shots = @(
    @{ name = "hero-exterior";  quality = "high";   prompt = "Wide establishing shot of $cabin, seen from a mossy path at golden hour, sunbeams breaking through the canopy, mist low over the undergrowth, warm lamp light glowing from the veranda. $style" },
    @{ name = "exterior-night"; quality = "medium"; prompt = "The same $cabin at blue hour after sunset, warm amber light spilling from every window onto the veranda, deep indigo sky through the trees, a few fireflies, long exposure calm. $style" },
    @{ name = "living-room";    quality = "medium"; prompt = "Interior of $cabin - open-plan living room with polished timber floors, a deep linen sofa, rattan armchairs, woven pendant lamp, floor-to-ceiling windows looking straight into dense green jungle, morning light. $style" },
    @{ name = "bedroom-main";   quality = "medium"; prompt = "Interior of $cabin - master bedroom with a low platform bed in crisp white linen, soft cream throw, timber headboard, sheer curtains glowing with morning light, a window framing the rainforest canopy. $style" },
    @{ name = "bedroom-second"; quality = "medium"; prompt = "Interior of $cabin - cosy second bedroom with two single beds in white linen, rattan bedside tables, a woven rug, a small round window onto the forest, soft diffused afternoon light. $style" },
    @{ name = "bathroom";       quality = "medium"; prompt = "Interior of $cabin - bathroom with river-stone feature wall, timber vanity, matte black rain shower, a potted fern, a slatted window letting in filtered green light and steam. $style" },
    @{ name = "deck";           quality = "medium"; prompt = "Wooden canopy deck of $cabin - a cream hammock strung between timber posts, two low chairs, view straight across treetops drifting with morning mist, dappled sunlight on the boards. $style" },
    @{ name = "breakfast";      quality = "medium"; prompt = "Breakfast laid out on the timber deck table of $cabin - nasi lemak in banana leaf, a plate of colourful Malay kuih, sliced papaya, two cups of kopi, soft morning light and jungle leaves blurred behind. $style" }
)

if ($Only) {
    $shots = $shots | Where-Object { $_.name -eq $Only }
    if (-not $shots) { throw "No shot named '$Only'. Names: hero-exterior, exterior-night, living-room, bedroom-main, bedroom-second, bathroom, deck, breakfast" }
}

Add-Type -AssemblyName System.Drawing

function Convert-PngToJpg {
    param([string]$PngPath, [string]$JpgPath, [int]$Quality)
    $img = [System.Drawing.Image]::FromFile($PngPath)
    try {
        $codec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq "image/jpeg" }
        $params = New-Object System.Drawing.Imaging.EncoderParameters(1)
        $params.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter([System.Drawing.Imaging.Encoder]::Quality, [long]$Quality)
        # Re-draw onto an RGB bitmap so any alpha channel is flattened to white
        $bmp = New-Object System.Drawing.Bitmap($img.Width, $img.Height, [System.Drawing.Imaging.PixelFormat]::Format24bppRgb)
        $g = [System.Drawing.Graphics]::FromImage($bmp)
        $g.Clear([System.Drawing.Color]::White)
        $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $g.DrawImage($img, 0, 0, $img.Width, $img.Height)
        $bmp.Save($JpgPath, $codec, $params)
        $g.Dispose(); $bmp.Dispose()
    } finally {
        $img.Dispose()
    }
}

$results = @()
foreach ($shot in $shots) {
    $png = Join-Path $outDir ($shot.name + ".png")
    $jpg = Join-Path $imgDir ($shot.name + ".jpg")

    if (-not $ConvertOnly -and ($Force -or -not (Test-Path $png))) {
        Write-Host ("[render] {0} ({1})" -f $shot.name, $shot.quality)
        $sw = [System.Diagnostics.Stopwatch]::StartNew()
        & $helper -Prompt $shot.prompt -OutFile $png -Size "1536x1024" -Quality $shot.quality -Model "gpt-image-2" | Out-Null
        $sw.Stop()
        Write-Host ("         done in {0:n0}s" -f $sw.Elapsed.TotalSeconds)
    } elseif (-not (Test-Path $png)) {
        Write-Host ("[skip]   {0} - no PNG master to convert" -f $shot.name)
        continue
    }

    Convert-PngToJpg -PngPath $png -JpgPath $jpg -Quality $JpegQuality
    $kb = [math]::Round((Get-Item $jpg).Length / 1KB)
    Write-Host ("[jpg]    {0}.jpg {1} KB" -f $shot.name, $kb)
    $results += [pscustomobject]@{ name = $shot.name; jpgKB = $kb }
}

Write-Host ""
Write-Host "Done. assets/img now holds:"
$results | Format-Table -AutoSize | Out-String | Write-Host
