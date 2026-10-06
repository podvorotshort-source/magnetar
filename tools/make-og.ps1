# Рисует превью ссылки og.png (1200x630) кодом — без готовых картинок.
# Запуск: powershell -ExecutionPolicy Bypass -File tools\make-og.ps1
Add-Type -AssemblyName System.Drawing

$W = 1200; $H = 630
$bmp = New-Object System.Drawing.Bitmap $W, $H
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = 'AntiAlias'
$g.TextRenderingHint = 'AntiAliasGridFit'

$bg = [System.Drawing.Color]::FromArgb(14, 14, 16)
$fg = [System.Drawing.Color]::FromArgb(242, 240, 235)
$accent = [System.Drawing.Color]::FromArgb(255, 91, 46)
$muted = [System.Drawing.Color]::FromArgb(138, 135, 128)
$g.Clear($bg)

# центр чёрной дыры справа
$cx = 900; $cy = 315

# свечение
$glowPath = New-Object System.Drawing.Drawing2D.GraphicsPath
$glowPath.AddEllipse($cx - 260, $cy - 260, 520, 520)
$glow = New-Object System.Drawing.Drawing2D.PathGradientBrush $glowPath
$glow.CenterColor = [System.Drawing.Color]::FromArgb(150, 255, 91, 46)
$glow.SurroundColors = @([System.Drawing.Color]::FromArgb(0, 255, 91, 46))
$g.FillPath($glow, $glowPath)

# спиральные линии, затягивающиеся в центр
$rnd = New-Object System.Random 7
for ($i = 0; $i -lt 140; $i++) {
  $a = $rnd.NextDouble() * [Math]::PI * 2
  $r = 300 + $rnd.NextDouble() * 500
  $tw = [Math]::PI / 2 + ($rnd.NextDouble() - 0.5) * [Math]::PI / 2
  $p0 = New-Object System.Drawing.PointF ([float]($cx + $r * [Math]::Cos($a))), ([float]($cy + $r * [Math]::Sin($a) * 0.5))
  $p1 = New-Object System.Drawing.PointF ([float]($cx + $r * 0.7 * [Math]::Cos($a - $tw))), ([float]($cy + $r * 0.7 * [Math]::Sin($a - $tw) * 0.6))
  $p2 = New-Object System.Drawing.PointF ([float]($cx + $r * 0.3 * [Math]::Cos($a - $tw / 2))), ([float]($cy + $r * 0.3 * [Math]::Sin($a - $tw / 2) * 0.8))
  $p3 = New-Object System.Drawing.PointF $cx, $cy
  $alpha = [int](25 + $rnd.NextDouble() * 70)
  $col = if ($rnd.NextDouble() -lt 0.2) { [System.Drawing.Color]::FromArgb($alpha, 255, 91, 46) } else { [System.Drawing.Color]::FromArgb($alpha, 242, 240, 235) }
  $pen = New-Object System.Drawing.Pen $col, ([float](0.8 + $rnd.NextDouble() * 1.4))
  $g.DrawBezier($pen, $p0, $p1, $p2, $p3)
  $pen.Dispose()
}

# сама дыра
$corePath = New-Object System.Drawing.Drawing2D.GraphicsPath
$corePath.AddEllipse($cx - 90, $cy - 90, 180, 180)
$core = New-Object System.Drawing.Drawing2D.PathGradientBrush $corePath
$core.CenterColor = [System.Drawing.Color]::Black
$core.SurroundColors = @([System.Drawing.Color]::FromArgb(0, 14, 14, 16))
$g.FillPath($core, $corePath)
$g.FillEllipse((New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::Black)), $cx - 40, $cy - 40, 80, 80)

# текст
$dot = New-Object System.Drawing.SolidBrush $accent
$g.FillEllipse($dot, 80, 98, 22, 22)
$fLogo = New-Object System.Drawing.Font 'Segoe UI Black', 30
$g.DrawString('Магнетар', $fLogo, (New-Object System.Drawing.SolidBrush $fg), 112, 84)

$fTitle = New-Object System.Drawing.Font 'Segoe UI Black', 58
$g.DrawString('Сайты, от которых', $fTitle, (New-Object System.Drawing.SolidBrush $fg), 70, 200)
$g.DrawString('невозможно', $fTitle, $dot, 70, 290)
$g.DrawString('оторваться', $fTitle, (New-Object System.Drawing.SolidBrush $fg), 70, 380)

$fSub = New-Object System.Drawing.Font 'Segoe UI Semibold', 22
$g.DrawString('Лендинги под ключ · оплата после запуска', $fSub, (New-Object System.Drawing.SolidBrush $muted), 80, 520)

$out = Join-Path (Split-Path $PSScriptRoot -Parent) 'og.png'
$bmp.Save($out, [System.Drawing.Imaging.ImageFormat]::Png)
$g.Dispose(); $bmp.Dispose()
"Saved $out"
