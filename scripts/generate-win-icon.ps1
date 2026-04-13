Add-Type -AssemblyName System.Drawing

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = Resolve-Path (Join-Path $scriptDir "..")
$sourcePng = Join-Path $projectRoot "public\logo-tekoga.png"
$outputDir = Join-Path $projectRoot "build"
$outputIco = Join-Path $outputDir "tekoga.ico"

if (!(Test-Path $sourcePng)) {
  throw "No se encontro el archivo de icono fuente: $sourcePng"
}

if (!(Test-Path $outputDir)) {
  New-Item -ItemType Directory -Path $outputDir | Out-Null
}

$bmp = [System.Drawing.Bitmap]::FromFile($sourcePng)
$size = [Math]::Max([Math]::Max($bmp.Width, $bmp.Height), 256)
$square = New-Object System.Drawing.Bitmap($size, $size)
$graphics = [System.Drawing.Graphics]::FromImage($square)
$graphics.Clear([System.Drawing.Color]::Transparent)

$x = [int](($size - $bmp.Width) / 2)
$y = [int](($size - $bmp.Height) / 2)
$graphics.DrawImage($bmp, $x, $y, $bmp.Width, $bmp.Height)

$iconHandle = $square.GetHicon()
$icon = [System.Drawing.Icon]::FromHandle($iconHandle)
$fileStream = [System.IO.File]::Open($outputIco, [System.IO.FileMode]::Create)
$icon.Save($fileStream)

$fileStream.Close()
$icon.Dispose()
$graphics.Dispose()
$square.Dispose()
$bmp.Dispose()

Write-Output "Icono generado en $outputIco"
