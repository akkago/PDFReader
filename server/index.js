const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs-extra');
const { spawn } = require('child_process');
const PDFConverter = require('./pdf-converter');
const sharp = require('sharp');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../client/dist')));

// Создание директорий
const uploadsDir = path.join(__dirname, '../uploads');
const imagesDir = path.join(__dirname, '../uploads/images');
fs.ensureDirSync(uploadsDir);
fs.ensureDirSync(imagesDir);

// Хранилище заявок (в продакшене использовать Redis или базу данных)
const requests = new Map();

// Поддерживаемые типы файлов
const SUPPORTED_TYPES = ['otchetnost'];

// Настройка multer для загрузки файлов
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + '.pdf');
  }
});

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Только PDF файлы разрешены'), false);
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
    files: 1 // Только один файл
  }
}).single('file');

// Создаем экземпляр конвертера PDF
const pdfConverter = new PDFConverter();

// Функция для конвертации PDF в изображения
async function convertPdfToImages(pdfPath, outputDir) {
  return await pdfConverter.convertPDFToImages(pdfPath, outputDir);
}

// Функция для распознавания текста с помощью PaddleOCR
function recognizeTextWithPaddleOCR(imagePath) {
  return new Promise((resolve, reject) => {
    const pythonProcess = spawn('python', [
      path.join(__dirname, 'paddleocr_script.py'),
      imagePath
    ]);

    let result = '';
    let error = '';

    pythonProcess.stdout.on('data', (data) => {
      result += data.toString();
    });

    pythonProcess.stderr.on('data', (data) => {
      error += data.toString();
    });

    pythonProcess.on('close', (code) => {
      if (code === 0) {
        try {
          const parsedResult = JSON.parse(result);
          resolve(parsedResult);
        } catch (e) {
          reject(new Error('Ошибка парсинга результата PaddleOCR'));
        }
      } else {
        reject(new Error(`PaddleOCR завершился с кодом ${code}: ${error}`));
      }
    });
  });
}

const monthsMap = {
  'января': '01',
  'февраля': '02',
  'марта': '03',
  'апреля': '04',
  'мая': '05',
  'июня': '06',
  'июля': '07',
  'августа': '08',
  'сентября': '09',
  'октября': '10',
  'ноября': '11',
  'декабря': '12',
  // Сокращенные названия
  'янв': '01',
  'фев': '02',
  'мар': '03',
  'апр': '04',
  'май': '05',
  'июн': '06',
  'июл': '07',
  'авг': '08',
  'сен': '09',
  'окт': '10',
  'ноя': '11',
  'дек': '12',
  // Английские названия (на случай)
  'january': '01',
  'february': '02',
  'march': '03',
  'april': '04',
  'may': '05',
  'june': '06',
  'july': '07',
  'august': '08',
  'september': '09',
  'october': '10',
  'november': '11',
  'december': '12'
};

function parseDate(day, monthName, year) {
  // Очищаем название месяца от лишних символов
  const cleanMonthName = monthName.toLowerCase().replace(/[.,]/g, '').trim();
  const month = monthsMap[cleanMonthName];
  
  if (!month) {
    console.log('Не удалось распарсить месяц:', monthName, 'очищенное:', cleanMonthName);
    return null;
  }
  
  const result = `${year}-${month}-${day.padStart(2, '0')}`;
  console.log('Распарсена дата:', result, 'из:', day, monthName, year);
  return result;
}

function extractDates(allLines, columns) {
  const dates = [];
  const headerIndex = allLines.findIndex(line => line === 'На 30 сентября' || line === 'На 31 декабря');
  if (headerIndex !== -1) {
    for (let j = 0; j < columns; j++) {
      const header = allLines[headerIndex + j];
      const yearLine = allLines.find((l, idx) => idx > headerIndex && /^\d{4}[гr.]*$/.test(l));
      const match = header.match(/На (\d{1,2}) (\w+)/);
      if (match) {
        const day = match[1];
        const month = match[2];
        const year = yearLine ? yearLine.replace(/[^0-9]/g, '') : '0000';
        const parsed = parseDate(day, month, year);
        if (parsed) dates.push(parsed);
      }
    }
  }
  return dates;
}

function cleanSum(str) {
  if (!str || str.trim() === '-' || str.trim() === '' || str.trim() === '.') return 0;
  
  // Очищаем строку от всех символов кроме цифр
  const cleanStr = str.replace(/[^\d]/g, '');
  
  // Если после очистки ничего не осталось, возвращаем 0
  if (!cleanStr) return 0;
  
  // Преобразуем в число
  const num = parseInt(cleanStr, 10);
  
  // Проверяем, что это валидное число
  if (isNaN(num)) return 0;
  
  return num;
}

function parsePageContent(pageContents) {
  // pageContents - массив массивов строк, где каждый подмассив - content одной страницы (страница 1, 2, 3)
  // Объединяем все страницы в один массив
  const allLines = pageContents.flat().map(line => line.trim()).filter(line => line.length > 0);

  console.log('=== DEBUG: parsePageContent ===');
  console.log('Всего строк:', allLines.length);
  console.log('Первые 20 строк:', allLines.slice(0, 20));

  // Шаг 1: Определить тип формы и количество колонок
  let formType = null;
  let columns = 0;
  const formIndex = allLines.findIndex(line => line === 'Форма по ОКУД');
  if (formIndex !== -1) {
    formType = allLines[formIndex + 1];
    console.log('Найдена форма:', formType);
  } else {
    console.log('Форма по ОКУД не найдена, ищем альтернативы...');
    // Ищем альтернативные индикаторы формы
    const balanceIndex = allLines.findIndex(line => line.includes('БАЛАНС') || line.includes('баланс'));
    const ofrIndex = allLines.findIndex(line => line.includes('ОТЧЕТ') || line.includes('отчет'));
    
    if (balanceIndex !== -1) {
      formType = '0710001'; // Предполагаем бух. баланс
      console.log('Найден баланс, предполагаем форму 0710001');
    } else if (ofrIndex !== -1) {
      formType = '0710002'; // Предполагаем ОФР
      console.log('Найден отчет, предполагаем форму 0710002');
    }
  }
  
  if (formType === '0710001') {
    columns = 3; // Бух. баланс
  } else if (formType === '0710002') {
    columns = 2; // ОФР
  } else {
    // Если не можем определить форму, используем эвристику
    console.log('Не удалось определить форму, используем эвристику');
    const dateHeaders = allLines.filter(line => line.startsWith('На ') || line.match(/\d{1,2}\s+\w+/));
    columns = Math.min(dateHeaders.length, 3); // Максимум 3 колонки
    console.log('Предполагаем колонок:', columns);
  }

  // Шаг 2: Извлечь даты из заголовков таблицы
  const dates = [];
  
  // Ищем строки с датами в заголовках таблицы
  const datePatterns = [
    /На (\d{1,2}) (\w+)/,           // "На 30 сентября"
    /(\d{1,2}) (\w+)/,              // "30 сентября"
    /(\d{1,2})\.(\d{1,2})\.(\d{4})/, // "30.09.2024"
    /(\d{1,2})\/(\d{1,2})\/(\d{4})/  // "30/09/2024"
  ];
  
  // Ищем годы в документе
  const yearLines = allLines.filter(line => /^\d{4}[гr.]*$/.test(line));
  console.log('Найдены годы:', yearLines);
  
  // Ищем строки с датами
  const foundDates = [];
  for (let i = 0; i < allLines.length; i++) {
    const line = allLines[i];
    
    // Проверяем все паттерны дат
    for (const pattern of datePatterns) {
      const match = line.match(pattern);
      if (match) {
        let day, month, year;
        
        if (pattern.source.includes('\\d{4}')) {
          // Формат с годом в строке
          day = match[1];
          month = match[2];
          year = match[3];
        } else {
          // Формат без года, ищем год рядом
          day = match[1];
          month = match[2];
          
          // Ищем год в следующих 5 строках
          for (let j = i + 1; j < Math.min(i + 6, allLines.length); j++) {
            const yearMatch = allLines[j].match(/^(\d{4})[гr.]*$/);
            if (yearMatch) {
              year = yearMatch[1];
              break;
            }
          }
          
          // Если год не найден, используем 2024 по умолчанию
          if (!year) {
            year = '2024';
          }
        }
        
        const parsed = parseDate(day, month, year);
        if (parsed) {
          foundDates.push({
            date: parsed,
            line: line,
            index: i
          });
        }
        break;
      }
    }
  }
  
  console.log('Найденные даты:', foundDates);
  
  // Берем первые columns уникальных дат
  const uniqueDates = [];
  for (const foundDate of foundDates) {
    if (!uniqueDates.some(d => d.date === foundDate.date)) {
      uniqueDates.push(foundDate);
      if (uniqueDates.length >= columns) break;
    }
  }
  
  // Добавляем найденные даты
  for (const uniqueDate of uniqueDates) {
    dates.push(uniqueDate.date);
    console.log('Добавлена дата:', uniqueDate.date, 'из строки:', uniqueDate.line);
  }
  
  // Если дат не хватает, создаем дополнительные
  while (dates.length < columns) {
    if (dates.length > 0) {
      // Создаем дату на 3 месяца раньше последней
      const lastDate = new Date(dates[dates.length - 1]);
      const newDate = new Date(lastDate.getFullYear(), lastDate.getMonth() - 3, lastDate.getDate());
      const newDateStr = newDate.toISOString().split('T')[0];
      dates.push(newDateStr);
      console.log('Добавлена дополнительная дата:', newDateStr);
    } else {
      // Если нет дат вообще, создаем фиктивные
      const currentYear = new Date().getFullYear();
      const months = ['09', '12', '03']; // Сентябрь, декабрь, март
      const month = months[dates.length] || '12';
      const day = month === '02' ? '28' : '31';
      dates.push(`${currentYear}-${month}-${day}`);
      console.log('Добавлена фиктивная дата:', `${currentYear}-${month}-${day}`);
    }
  }
  
  console.log('Итоговые даты:', dates);
  console.log('Количество колонок:', columns);

  // Шаг 3: Парсинг таблицы
  // Находим начало таблицы (после "Пояснения" или "АКТИВ"/"ПАССИВ")
  let tableStart = allLines.findIndex(line => 
    line === 'Пояснения' || 
    line === 'АКТИВ' || 
    line === 'ПАССИВ' ||
    line.includes('Код') ||
    line.includes('код')
  );
  if (tableStart === -1) {
    // Если не нашли стандартные маркеры, ищем первую строку с кодом
    tableStart = allLines.findIndex(line => /^\d{4,5}$/.test(line));
    if (tableStart === -1) tableStart = 0;
  }
  
  console.log('Начало таблицы:', tableStart);

  const otchetnost = [];
  let processedCodes = 0;
  
  // Функция для проверки, является ли строка кодом
  function isCode(line, allLines, lineIndex) {
    // Код должен быть 4-5 цифр
    if (!/^\d{4,5}$/.test(line)) return false;
    
    const num = parseInt(line, 10);
    if (num < 1000 || num > 99999) return false;
    
    // Проверяем, есть ли русский текст слева от кода (в предыдущих строках)
    let hasRussianTextBefore = false;
    
    // Ищем в предыдущих 10 строках
    for (let j = Math.max(0, lineIndex - 10); j < lineIndex; j++) {
      const prevLine = allLines[j];
      if (prevLine && prevLine.trim()) {
        // Проверяем, содержит ли строка русские буквы
        if (/[а-яё]/i.test(prevLine)) {
          // Исключаем строки, которые не являются описанием
          if (!prevLine.match(/^\d+$/) && 
              !prevLine.includes('Код') && 
              !prevLine.includes('код') &&
              !prevLine.includes('АКТИВ') &&
              !prevLine.includes('ПАССИВ') &&
              !prevLine.startsWith('На ') &&
              !prevLine.match(/^\d{4}[гr.]*$/)) {
            hasRussianTextBefore = true;
            break;
          }
        }
      }
    }
    
    // Кодом считается только число, если слева есть русский текст
    return hasRussianTextBefore;
  }
  
  // Функция для извлечения сумм из строки
  function extractSumsFromLine(line) {
    const sums = [];
    
    // Ищем числа в строке (включая числа с пробелами)
    const numberMatches = line.match(/\d[\d\s]*/g);
    
    if (numberMatches) {
      for (const match of numberMatches) {
        // Очищаем от пробелов и других символов
        const cleanNumber = match.replace(/\s/g, '').replace(/[^\d]/g, '');
        
        if (cleanNumber && cleanNumber.length > 0) {
          const sum = parseInt(cleanNumber, 10);
          if (!isNaN(sum) && sum > 0) {
            sums.push(sum);
          }
        }
      }
    }
    
    return sums;
  }
  
  // Новый алгоритм парсинга таблицы с правильной логикой
  let currentCode = null;
  let currentSums = [];
  
  // Создаем структуру для хранения данных по кодам
  const codeData = new Map();
  
  for (let i = tableStart; i < allLines.length && processedCodes < 50; i++) {
    const line = allLines[i];
    
    // Проверяем, является ли строка кодом (4-5 цифр)
    if (/^\d{4,5}$/.test(line)) {
      const num = parseInt(line, 10);
      if (num >= 1000 && num <= 99999) {
        // Проверяем, есть ли русский текст перед кодом
        let hasRussianTextBefore = false;
        for (let j = Math.max(0, i - 10); j < i; j++) {
          const prevLine = allLines[j];
          if (prevLine && /[а-яё]/i.test(prevLine) && 
              !prevLine.match(/^\d+$/) && 
              !prevLine.includes('Код') && 
              !prevLine.includes('код') &&
              !prevLine.includes('АКТИВ') &&
              !prevLine.includes('ПАССИВ') &&
              !prevLine.startsWith('На ') &&
              !prevLine.match(/^\d{4}[гr.]*$/)) {
            hasRussianTextBefore = true;
            break;
          }
        }
        
        if (hasRussianTextBefore) {
          // Сохраняем предыдущий код
          if (currentCode && currentSums.length > 0) {
            codeData.set(currentCode, [...currentSums]);
            console.log('Сохранены данные для кода:', currentCode, 'суммы:', currentSums);
          }
          
          // Начинаем новый код
          currentCode = line;
          currentSums = [];
          console.log('Найден код:', currentCode);
        }
      }
    } else if (currentCode && (/\d/.test(line) || line === '-' || line === '.')) {
      // Извлекаем числа из строки
      const numberMatches = line.match(/\d[\d\s]*/g);
      if (numberMatches) {
        for (const match of numberMatches) {
          const cleanNumber = match.replace(/\s/g, '').replace(/[^\d]/g, '');
          if (cleanNumber && cleanNumber.length > 0) {
            const sum = parseInt(cleanNumber, 10);
            if (!isNaN(sum) && sum > 0) {
              currentSums.push(sum);
            }
          }
        }
      }
    }
  }
  
  // Сохраняем последний код
  if (currentCode && currentSums.length > 0) {
    codeData.set(currentCode, [...currentSums]);
    console.log('Сохранены данные для последнего кода:', currentCode, 'суммы:', currentSums);
  }
  
  // Создаем итоговые записи
  for (const [code, sums] of codeData) {
    for (let j = 0; j < columns; j++) {
      const sum = sums[j] || 0;
      otchetnost.push({
        date: dates[j],
        code: code,
        sum: sum
      });
    }
    processedCodes++;
  }
  
  console.log('Обработано кодов:', processedCodes);
  console.log('Создано записей:', otchetnost.length);

  // Возвращаем JSON
  console.log('=== КОНЕЦ parsePageContent ===');
  
  if (otchetnost.length === 0) {
    console.log('Не удалось извлечь структурированные данные');
    return { 
      error: 'Не удалось извлечь структурированные данные из документа',
      otchetnost: [],
      rawLines: allLines.slice(0, 50) // Возвращаем первые 50 строк для отладки
    };
  }
  
  return { otchetnost };
}

// Экспортируем функцию для тестирования
module.exports = { parsePageContent };

// Пример использования в вашем коде:
// Предполагаем, что вы собираете все pageContents в массив
// Например, в цикле по страницам:
// const allPageContents = []; // Массив для всех страниц: [contentPage1, contentPage2, contentPage3]

// // В вашем цикле:
// const textResult = await recognizeTextWithPaddleOCR(image.path);
// allPageContents.push(textResult.content); // Накапливаем content каждой страницы

// // После обработки всех страниц:
// const processed = мояФункцияОбработки(allPageContents); // Передаем массив contents

// // Затем добавьте в results или куда нужно
// results.push({
//   // ... ваши поля
//   content: processed, // Это будет { otchetnost: [...] }
// });


// Функция для валидации типа файла
function validateFileType(fileType, content) {
  if (!SUPPORTED_TYPES.includes(fileType)) {
    return { valid: false, error: 'unsupported', error_msg: 'Парсинг данного типа файлов не поддерживается' };
  }

  // Для типа 'otchetnost' проверяем наличие ключевых слов
  if (fileType === 'otchetnost') {
    const allText = content.join(' ').toLowerCase();
    const keywords = ['баланс', 'отчет', 'форма', 'окуд', 'актив', 'пассив', 'код'];
    const hasKeywords = keywords.some(keyword => allText.includes(keyword));
    
    if (!hasKeywords) {
      return { valid: false, error: 'invalid_type', error_msg: 'Содержимое файла не соответствует типу "otchetnost"' };
    }
  }

  return { valid: true };
}

// Функция для обработки заявки
async function processRequest(requestId, filePath, fileType) {
  try {
    // Обновляем статус
    requests.set(requestId, { status: 'in_progress' });

    const pdfName = path.basename(filePath);
    
    // Создаем уникальную директорию для изображений этого PDF
    const pdfImagesDir = path.join(imagesDir, pdfName.replace('.pdf', ''));
    await fs.ensureDir(pdfImagesDir);

    console.log(`Начинаем обработку PDF: ${pdfName}, тип: ${fileType}`);

    // Конвертируем PDF в изображения
    const images = await convertPdfToImages(filePath, pdfImagesDir);
    
    if (!images || images.length === 0) {
      throw new Error('Не удалось конвертировать PDF в изображения');
    }

    console.log(`Конвертировано ${images.length} страниц`);
    
    // Распознаем текст с каждого изображения
    const results = [];
    
    for (const image of images) {
      try {
        console.log(`Обрабатываем страницу ${image.pageNumber}`);
        const textResult = await recognizeTextWithPaddleOCR(image.path);
        results.push({
          page: image.pageNumber,
          text: textResult.text,
          confidence: textResult.confidence,
          content: textResult.content,
          imagePath: image.path
        });
      } catch (error) {
        console.error(`Ошибка распознавания страницы ${image.pageNumber}:`, error);
        results.push({
          page: image.pageNumber,
          text: '',
          confidence: 0,
          content: '',
          error: error.message
        });
      }
    }

    console.log(`Обработка завершена. Распознано ${results.length} страниц`);

    // Собираем весь контент для валидации типа
    const allContent = results.map(result => result.content || []).flat();
    
    // Валидируем тип файла
    const validation = validateFileType(fileType, allContent);
    if (!validation.valid) {
      requests.set(requestId, { 
        status: 'failed', 
        error: validation.error, 
        error_msg: validation.error_msg 
      });
      return;
    }

    // Парсим контент
    const allPageContents = results.map(result => result.content || []);
    const processedData = parsePageContent(allPageContents);

    // Обновляем статус на завершенный
    requests.set(requestId, { 
      status: 'complete', 
      content: processedData 
    });

    // Очищаем временные файлы через минуту
    setTimeout(async () => {
      try {
        const filesToClean = [filePath, pdfImagesDir];
        await pdfConverter.cleanupFiles(filesToClean);
      } catch (cleanupError) {
        console.error('Ошибка очистки временных файлов:', cleanupError);
      }
    }, 60000);

  } catch (error) {
    console.error('Ошибка обработки заявки:', error);
    requests.set(requestId, { 
      status: 'failed', 
      error: 'processing_error', 
      error_msg: error.message 
    });
  }
}

// API маршруты

// POST /parse - принимает файл, отдает id заявки
app.post('/api/parse', (req, res) => {
  upload(req, res, async (err) => {
    if (err) {
      console.error('Ошибка загрузки файла:', err);
      return res.status(400).json({ 
        error: err.message || 'Ошибка загрузки файла' 
      });
    }
    
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'Файл не загружен' });
      }

      const { type } = req.body;
      
      if (!type) {
        return res.status(400).json({ error: 'Тип файла обязателен' });
      }

      if (!SUPPORTED_TYPES.includes(type)) {
        return res.status(400).json({ 
          error: 'unsupported', 
          error_msg: 'Парсинг данного типа файлов не поддерживается' 
        });
      }

      // Проверяем размер файла
      const stats = fs.statSync(req.file.path);
      if (stats.size === 0) {
        return res.status(400).json({ error: 'Загруженный файл пустой' });
      }

      // Генерируем уникальный ID заявки
      const requestId = uuidv4();
      
      // Создаем запись о заявке
      requests.set(requestId, { 
        status: 'in_progress',
        filePath: req.file.path,
        fileType: type,
        createdAt: new Date()
      });

      // Запускаем обработку в фоне
      processRequest(requestId, req.file.path, type);

      res.json({
        request_id: requestId
      });

    } catch (error) {
      console.error('Ошибка создания заявки:', error);
      res.status(500).json({ 
        error: 'Ошибка создания заявки',
        details: error.message 
      });
    }
  });
});

// GET /result/$id - возвращает статус парсинга и содержимое документа
app.get('/api/result/:id', (req, res) => {
  const requestId = req.params.id;
  
  if (!requests.has(requestId)) {
    return res.status(404).json({ 
      error: 'not_found', 
      error_msg: 'Заявка не найдена' 
    });
  }

  const request = requests.get(requestId);
  res.json(request);
});

// Обработка ошибок multer
app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'Файл слишком большой. Максимальный размер: 10MB' });
    }
  }
  res.status(400).json({ error: error.message });
});

// Serve Vue app
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/dist/index.html'));
});

app.listen(PORT, () => {
  console.log(`Сервер запущен на порту ${PORT}`);
  console.log(`Откройте http://localhost:${PORT} в браузере`);
}); 