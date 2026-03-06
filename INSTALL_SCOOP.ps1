# Установка Scoop и Supabase CLI для Windows
# Запустите этот скрипт в PowerShell

Write-Host "=== Installing Scoop ===" -ForegroundColor Cyan

# Разрешаем выполнение скриптов
Set-ExecutionPolicy RemoteSigned -Scope CurrentUser -Force

# Устанавливаем Scoop
irm get.scoop.sh | iex

Write-Host "`n=== Installing Supabase CLI ===" -ForegroundColor Cyan

# Добавляем bucket для Supabase
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git

# Устанавливаем Supabase CLI
scoop install supabase

Write-Host "`n=== Verification ===" -ForegroundColor Cyan
scoop --version
supabase --version

Write-Host "`n✓ Installation complete!" -ForegroundColor Green
Write-Host "Now you can run: supabase login" -ForegroundColor Yellow
