# Руководство по API

## Обзор

API переработан в соответствии с новой структурой, которая поддерживает:
- Асинхронную обработку файлов
- Типизацию документов
- Валидацию содержимого
- Отслеживание статуса обработки

## Эндпоинты

### POST /api/parse

Создает заявку на обработку файла.

**Параметры:**
- `file` (multipart/form-data) - PDF файл для обработки
- `type` (string) - Тип документа (обязательно)

**Поддерживаемые типы:**
- `otchetnost` - Финансовая отчетность

**Пример запроса:**
```bash
curl -X POST http://localhost:3000/api/parse \
  -F "file=@document.pdf" \
  -F "type=otchetnost"
```

**Успешный ответ:**
```json
{
  "request_id": "e00f8d1c-68cb-4918-88b4-835a10143dc3"
}
```

**Возможные ошибки:**
- `400` - Файл не загружен
- `400` - Тип файла обязателен
- `400` - Парсинг данного типа файлов не поддерживается

### GET /api/result/:id

Получает статус и результаты обработки заявки.

**Параметры:**
- `id` (string) - ID заявки

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

## Типы ошибок

### Коды ошибок

- `unsupported` - Неподдерживаемый тип файла
- `invalid_type` - Содержимое файла не соответствует указанному типу
- `processing_error` - Ошибка обработки файла
- `not_found` - Заявка не найдена

### Валидация типов

#### otchetnost (Отчетность)

Проверяется наличие ключевых слов в содержимом:
- "баланс"
- "отчет"
- "форма"
- "окуд"
- "актив"
- "пассив"
- "код"

Если файл не содержит этих слов, возвращается ошибка `invalid_type`.

## Примеры использования

### JavaScript (Axios)

```javascript
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

async function processDocument(filePath, type) {
  try {
    // 1. Загружаем файл
    const formData = new FormData();
    formData.append('file', fs.createReadStream(filePath));
    formData.append('type', type);
    
    const uploadResponse = await axios.post('http://localhost:3000/api/parse', formData, {
      headers: formData.getHeaders()
    });
    
    const requestId = uploadResponse.data.request_id;
    console.log('Заявка создана:', requestId);
    
    // 2. Проверяем статус
    let status = 'in_progress';
    while (status === 'in_progress') {
      await new Promise(resolve => setTimeout(resolve, 2000)); // Ждем 2 секунды
      
      const statusResponse = await axios.get(`http://localhost:3000/api/result/${requestId}`);
      status = statusResponse.data.status;
      
      if (status === 'complete') {
        console.log('Результат:', statusResponse.data.content);
        return statusResponse.data.content;
      } else if (status === 'failed') {
        throw new Error(statusResponse.data.error_msg);
      }
    }
    
  } catch (error) {
    console.error('Ошибка:', error.message);
  }
}

// Использование
processDocument('document.pdf', 'otchetnost');
```

### Python (requests)

```python
import requests
import time

def process_document(file_path, doc_type):
    try:
        # 1. Загружаем файл
        with open(file_path, 'rb') as f:
            files = {'file': f}
            data = {'type': doc_type}
            
            response = requests.post('http://localhost:3000/api/parse', 
                                   files=files, data=data)
            response.raise_for_status()
            
        request_id = response.json()['request_id']
        print(f'Заявка создана: {request_id}')
        
        # 2. Проверяем статус
        while True:
            time.sleep(2)  # Ждем 2 секунды
            
            status_response = requests.get(f'http://localhost:3000/api/result/{request_id}')
            status_response.raise_for_status()
            
            data = status_response.json()
            status = data['status']
            
            if status == 'complete':
                print('Результат:', data['content'])
                return data['content']
            elif status == 'failed':
                raise Exception(data['error_msg'])
                
    except Exception as e:
        print(f'Ошибка: {e}')

# Использование
process_document('document.pdf', 'otchetnost')
```

## Ограничения

- Максимальный размер файла: 10MB
- Поддерживаемые форматы: PDF
- Таймаут создания заявки: 30 секунд
- Интервал проверки статуса: 2 секунды (рекомендуется)

## Тестирование

Для тестирования API используйте файл `test-api.js`:

```bash
node test-api.js
```

Этот скрипт проверит основные сценарии работы API.
