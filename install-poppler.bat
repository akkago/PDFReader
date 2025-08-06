@echo off
echo ========================================
echo Установка Poppler Utils для Windows
echo ========================================

echo.
echo 1. Скачивание Poppler Utils...
echo Пожалуйста, скачайте Poppler Utils вручную:
echo https://github.com/oschwartz10612/poppler-windows/releases/
echo.
echo 2. Распакуйте архив в C:\poppler
echo.
echo 3. Добавление в PATH...
set "POPPLER_PATH=C:\poppler\Library\bin"

REM Проверяем существование директории
if not exist "%POPPLER_PATH%" (
    echo ОШИБКА: Директория %POPPLER_PATH% не найдена!
    echo Убедитесь, что вы распаковали Poppler в C:\poppler
    echo.
    pause
    exit /b 1
)

REM Добавляем в PATH для текущей сессии
set "PATH=%PATH%;%POPPLER_PATH%"

REM Добавляем в системную переменную PATH
echo Добавляем Poppler в системную переменную PATH...
powershell -Command "& {[Environment]::SetEnvironmentVariable('PATH', [Environment]::GetEnvironmentVariable('PATH', 'Machine') + ';%POPPLER_PATH%', 'Machine')}"

if %ERRORLEVEL% EQU 0 (
    echo УСПЕХ: Poppler добавлен в PATH!
) else (
    echo ПРЕДУПРЕЖДЕНИЕ: Не удалось добавить в системный PATH.
    echo Попробуйте запустить скрипт от имени администратора.
)

echo.
echo 4. Проверка установки...
echo Текущий PATH содержит Poppler: %PATH% | findstr /i "poppler" >nul
if %ERRORLEVEL% EQU 0 (
    echo Poppler найден в PATH!
) else (
    echo Poppler не найден в PATH. Перезапустите терминал.
)

echo.
echo 5. Тестирование pdftoppm...
"%POPPLER_PATH%\pdftoppm.exe" -h >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo pdftoppm работает корректно!
) else (
    echo ОШИБКА: pdftoppm не найден или не работает!
    echo Проверьте, что файл pdftoppm.exe существует в %POPPLER_PATH%
)

echo.
echo После установки запустите:
echo npm run dev
echo.
echo ПРИМЕЧАНИЕ: Если команды не работают, перезапустите терминал/IDE
echo.
pause 