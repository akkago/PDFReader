@echo off
echo ========================================
echo Полная переустановка зависимостей
echo ========================================

echo.
echo 1. Удаление node_modules...
if exist node_modules rmdir /s /q node_modules
if exist package-lock.json del package-lock.json

echo.
echo 2. Удаление node_modules клиента...
cd client
if exist node_modules rmdir /s /q node_modules
if exist package-lock.json del package-lock.json
cd ..

echo.
echo 3. Очистка кэша npm...
npm cache clean --force

echo.
echo 4. Переустановка основных зависимостей...
npm install --force

echo.
echo 5. Переустановка зависимостей клиента...
cd client
npm install --force
cd ..

echo.
echo 6. Очистка кэша npm...
npm cache clean --force

echo.
echo ========================================
echo Переустановка завершена!
echo ========================================
echo.
echo Теперь запустите:
echo npm run dev (в одном терминале)
echo npm run client (в другом терминале)
echo.
pause 