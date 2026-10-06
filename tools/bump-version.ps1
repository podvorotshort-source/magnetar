# Ставит новую метку версии ?v=… у своих CSS и JS в index.html.
# Запускать перед каждой публикацией: браузеры (и встроенный браузер Telegram)
# увидят новый адрес файла и не возьмут старую копию из памяти.
# Запуск: powershell -ExecutionPolicy Bypass -File tools\bump-version.ps1
$file = Join-Path (Split-Path $PSScriptRoot -Parent) 'index.html'
$v = Get-Date -Format 'yyyyMMddHHmm'
$html = [IO.File]::ReadAllText($file, [Text.Encoding]::UTF8)
$html = [regex]::Replace($html, '((?:href|src)="(?:css|js)/[\w.-]+\.(?:css|js))(?:\?v=\w+)?"', "`$1?v=$v`"")
[IO.File]::WriteAllText($file, $html, (New-Object Text.UTF8Encoding $false))
"Версия файлов: $v"
