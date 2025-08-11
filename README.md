Запуск в режиме разработки

**Терминал 1 (Backend):**
```bash
npm run dev
```

**Терминал 2 (Frontend):**
```bash
npm run client

## 🛠️ Установка

### Автоматическая установка (Windows)

Запустите файл `install.bat` для автоматической установки всех зависимостей:

```bash
install.bat
```

### Ручная установка

#### 1. Клонирование репозитория

```bash
git clone <repository-url>
cd paddleocr-pdf-reader
```

#### 2. Установка Node.js зависимостей

```bash
npm install
```

#### 3. Установка Python зависимостей

```bash
pip install -r requirements.txt
```

#### 4. Установка Vue.js зависимостей

```bash
cd client
npm install
cd ..
```

## 🚀 Запуск

### Режим разработки

1. **Запуск backend сервера** (в первом терминале):
```bash
npm run dev
```

2. **Запуск Vue клиента** (во втором терминале):
```bash
npm run client
```

3. Откройте браузер и перейдите на `http://localhost:8080`

### Продакшн режим

1. **Сборка клиента**:
```bash
npm run client:build
```

2. **Запуск сервера**:
```bash
npm start
```

3. Откройте браузер и перейдите на `http://localhost:3000`

## 📖 Использование

1. **Загрузка файла**: Выберите PDF файл через интерфейс (максимум 10MB)
2. **Выбор типа**: Укажите тип документа (отчетность)
3. **Обработка**: Дождитесь завершения конвертации и распознавания
4. **Отслеживание статуса**: Следите за прогрессом обработки в реальном времени
5. **Просмотр результатов**: 
   - Изучите общую статистику
   - Переключайтесь между страницами
   - Просматривайте распознанный текст с уровнем уверенности

## 🏗️ Структура проекта

```
paddleocr-pdf-reader/
├── server/                    # Node.js backend
│   ├── index.js              # Основной сервер
│   └── paddleocr_script.py   # Python скрипт для PaddleOCR
├── client/                    # Vue.js frontend
│   ├── src/
│   │   ├── components/       # Vue компоненты
│   │   ├── views/           # Страницы приложения
│   │   └── router/          # Маршрутизация
│   ├── public/              # Статические файлы
│   └── package.json         # Зависимости клиента
├── uploads/                  # Временные файлы загрузок
├── requirements.txt          # Python зависимости
├── package.json             # Основные зависимости
├── test-api.js              # Тесты API
└── README.md               # Документация
```

## 🔌 API

### Эндпоинты

#### POST /api/parse
Загружает файл и создает заявку на обработку.

**Запрос:**
```json
{
  "file": "<PDF файл>",
  "type": "otchetnost"
}
```

**Ответ:**
```json
{
  "request_id": "e00f8d1c-68cb-4918-88b4-835a10143dc3"
}
```

#### GET /api/result/:id
Возвращает статус обработки и результаты.

**Ответы:**

В процессе обработки:
```json
{
  "status": "in_progress"
}
```

Успешное завершение:
```json
{
  "status": "complete",
  "content": {
    "otchetnost": [
      {
        "date": "2024-03-31",
        "code": "1210",
        "sum": 12345
      }
    ]
  }
}
```

Ошибка:
```json
{
  "status": "failed",
  "error": "unsupported",
  "error_msg": "Парсинг данного типа файлов не поддерживается"
}
```

### Поддерживаемые типы файлов

- `otchetnost` - Финансовая отчетность (баланс, ОФР)

### Валидация

Система проверяет соответствие содержимого файла указанному типу:
- Для типа `otchetnost` проверяется наличие ключевых слов: "баланс", "отчет", "форма", "окуд", "актив", "пассив", "код"
- Если содержимое не соответствует типу, возвращается ошибка

## 🔧 Технологии

### Backend
- **Node.js** + **Express** - веб-сервер
- **Multer** - обработка загрузки файлов
- **pdf2pic** - конвертация PDF в изображения
- **PaddleOCR** - распознавание текста

### Frontend
- **Vue.js 3** - фреймворк
- **Vuetify 3** - UI компоненты
- **Axios** - HTTP клиент
- **Vue Router** - маршрутизация

## ⚙️ Конфигурация

### Настройки сервера

Основные настройки можно изменить в `server/index.js`:

- Порт сервера: `PORT` (по умолчанию 3000)
- Максимальный размер файла: `fileSize` (по умолчанию 10MB)
- Таймаут обработки: `timeout` (по умолчанию 5 минут)

### Настройки PaddleOCR

Параметры распознавания в `server/paddleocr_script.py`:

- Язык: `lang='ru'` (русский)
- Использование GPU: `use_gpu=False`
- Классификация углов: `use_angle_cls=True`

## 🐛 Устранение неполадок

### Ошибки ESLint

Если появляется ошибка "No ESLint configuration found":

**Windows:**
```bash
fix-client.bat
```

**Linux/Mac:**
```bash
cd client
rm -rf node_modules package-lock.json
npm cache clean --force
npm install
cd ..
```

### Ошибки установки PaddleOCR

```bash
# Обновление pip
pip install --upgrade pip

# Установка с дополнительными зависимостями
pip install paddlepaddle -i https://mirror.baidu.com/pypi/simple
pip install paddleocr -i https://mirror.baidu.com/pypi/simple
```

### Проблемы с портами

Если порт 3000 занят, измените в `server/index.js`:
```javascript
const PORT = process.env.PORT || 3001;
```

### Ошибки обработки файлов

#### Ошибка "write EOF"

Если появляется ошибка `Error: write EOF`:

1. **Установите Poppler Utils (рекомендуется):**
   
   **Windows:**
   ```bash
   # Автоматическая установка (запустите от имени администратора)
   install-poppler.bat
   
   # Проверка установки
   check-poppler.bat
   
   # Ручная настройка (см. MANUAL_PATH_SETUP.md)
   ```
   
   **Linux:**
   ```bash
   sudo apt-get install poppler-utils
   ```
   
   **Mac:**
   ```bash
   brew install poppler
   ```

2. **Переустановите зависимости:**
   ```bash
   reinstall.bat
   ```

3. **Проверьте PDF файл:**
   - Убедитесь, что файл не поврежден
   - Попробуйте открыть файл в PDF читалке
   - Проверьте размер файла (максимум 10MB)

4. **Перезапустите сервер:**
   ```bash
   # Остановите сервер (Ctrl+C)
   # Затем запустите заново
   npm run dev
   ```

5. **Очистите временные файлы:**
   ```bash
   # Удалите папку uploads
   rm -rf uploads/
   # Создайте заново
   mkdir uploads
   ```

6. **Протестируйте конвертацию:**
   ```bash
   # Поместите тестовый PDF в корень проекта как test.pdf
   node test-pdf.js
   ```

#### Общие рекомендации:

- Убедитесь, что PDF файл не поврежден
- Проверьте размер файла (максимум 10MB)
- Убедитесь, что в PDF есть текст или четкие изображения
- Попробуйте файл меньшего размера
- Убедитесь, что на диске достаточно свободного места

### Проблемы с Vue CLI

Если возникают проблемы с Vue CLI:

```bash
# Переустановка Vue CLI глобально
npm uninstall -g @vue/cli
npm install -g @vue/cli

# Очистка кэша
npm cache clean --force
```

### Предупреждения о deprecated API

Если появляются предупреждения типа `[DEP0060] DeprecationWarning`:

**Windows:**
```bash
reinstall.bat
```

**Linux/Mac:**
```bash
# Удаление node_modules
rm -rf node_modules client/node_modules
rm package-lock.json client/package-lock.json

# Очистка кэша и переустановка
npm cache clean --force
npm install --force
cd client && npm install --force && cd ..
```