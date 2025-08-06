@echo off
echo ========================================
echo Проверка установки Poppler Utils
echo ========================================

echo.
echo 1. Проверка директории Poppler...
set "POPPLER_PATH=C:\poppler\Library\bin"

if exist "%POPPLER_PATH%" (
    echo ✓ Директория найдена: %POPPLER_PATH%
) else (
    echo ✗ Директория не найдена: %POPPLER_PATH%
    echo.
    echo РЕШЕНИЕ:
    echo 1. Скачайте Poppler с https://github.com/oschwartz10612/poppler-windows/releases/
    echo 2. Распакуйте в C:\poppler
    echo 3. Запустите install-poppler.bat
    echo.
    pause
    exit /b 1
)

echo.
echo 2. Проверка файлов Poppler...
set "FILES_FOUND=0"
if exist "%POPPLER_PATH%\pdftoppm.exe" (
    echo ✓ pdftoppm.exe найден
    set /a FILES_FOUND+=1
) else (
    echo ✗ pdftoppm.exe не найден
)

if exist "%POPPLER_PATH%\pdftocairo.exe" (
    echo ✓ pdftocairo.exe найден
    set /a FILES_FOUND+=1
) else (
    echo ✗ pdftocairo.exe не найден
)

if exist "%POPPLER_PATH%\pdftotext.exe" (
    echo ✓ pdftotext.exe найден
    set /a FILES_FOUND+=1
) else (
    echo ✗ pdftotext.exe не найден
)

echo.
echo Найдено файлов: %FILES_FOUND% из 3

echo.
echo 3. Проверка PATH...
echo Текущий PATH:
echo %PATH% | findstr /i "poppler"

echo.
echo 4. Тестирование команд...
echo Тестируем pdftoppm...
"%POPPLER_PATH%\pdftoppm.exe" -h >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo ✓ pdftoppm работает
) else (
    echo ✗ pdftoppm не работает
)

echo Тестируем pdftocairo...
"%POPPLER_PATH%\pdftocairo.exe" -h >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo ✓ pdftocairo работает
) else (
    echo ✗ pdftocairo не работает
)

echo.
echo 5. Проверка глобальной доступности...
where pdftoppm >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo ✓ pdftoppm доступен глобально
) else (
    echo ✗ pdftoppm недоступен глобально
    echo.
    echo РЕШЕНИЕ:
    echo 1. Запустите install-poppler.bat от имени администратора
    echo 2. Перезапустите терминал/IDE
    echo 3. Или добавьте вручную в PATH: %POPPLER_PATH%
)

echo.
echo ========================================
echo Диагностика завершена
echo ========================================
echo.
pause 