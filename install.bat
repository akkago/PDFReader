@echo off
echo ========================================
echo Установка PaddleOCR PDF Reader
echo ========================================

echo.
echo 1. Установка Node.js зависимостей...
npm install --force

echo.
echo 2. Установка Python зависимостей...
pip install -r requirements.txt

echo.
echo 3. Установка Vue.js зависимостей...
cd client
npm install
cd ..
echo.
echo 4. Очистка кэша npm...
npm cache clean --force

echo.
echo ========================================
echo Установка завершена!
echo ========================================
echo.
echo Для запуска в режиме разработки:
echo 1. npm run dev (в одном терминале)
echo 2. npm run client (в другом терминале)
echo.
echo Для запуска в продакшн режиме:
echo 1. npm run client:build
echo 2. npm start
echo.
pause 