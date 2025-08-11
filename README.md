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

3. `http://localhost:3000`


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


**Пример запроса:**
```bash
curl -X POST http://localhost:3000/api/parse \
  -F "file=@document.pdf" \
  -F "type=otchetnost"
```

**Пример запроса:**
```bash
curl http://localhost:3000/api/result/e00f8d1c-68cb-4918-88b4-835a10143dc3
```

**Возможные ответы:**

1. **В процессе обработки:**
```json
{
  "status": "in_progress"
}
```

2. **Успешное завершение:**
```json
{
  "status": "complete",
  "content": {
    "otchetnost": [
      {
        "date": "2024-03-31",
        "code": "1210",
        "sum": 12345
      },
      {
        "date": "2023-12-31",
        "code": "1220",
        "sum": 23456
      }
    ]
  }
}
```

3. **Ошибка обработки:**
```json
{
  "status": "failed",
  "error": "unsupported",
  "error_msg": "Парсинг данного типа файлов не поддерживается"
}
```

4. **Заявка не найдена:**
```json
{
  "error": "not_found",
  "error_msg": "Заявка не найдена"
}
```