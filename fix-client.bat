@echo off
echo ========================================
echo Исправление проблем с Vue клиентом
echo ========================================

echo.
echo 1. Удаление node_modules клиента...
cd client
if exist node_modules rmdir /s /q node_modules
if exist package-lock.json del package-lock.json

echo.
echo 2. Очистка кэша npm...
npm cache clean --force

echo.
echo 3. Переустановка зависимостей клиента...
npm install

echo.
echo 4. Возврат в корневую директорию...
cd ..

echo.
echo ========================================
echo Исправление завершено!
echo ========================================
echo.
echo Теперь запустите:
echo npm run client
echo.
pause 