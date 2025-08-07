const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs-extra');
const { spawn } = require('child_process');
const PDFConverter = require('./pdf-converter');
const sharp = require('sharp');

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
}).single('pdf');

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
  return parseInt(str.replace(/\s/g, ''), 10) || 0;
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

  // Шаг 2: Извлечь даты (более гибкий подход)
  const dates = [];
  
  // Метод 1: Ищем строки, начинающиеся с "На "
  const dateHeaders = allLines.filter(line => line.startsWith('На '));
  console.log('Найдены заголовки дат (На):', dateHeaders);
  
  // Метод 2: Ищем строки с датами в формате "дд месяц"
  const datePatterns = allLines.filter(line => line.match(/\d{1,2}\s+\w+/));
  console.log('Найдены паттерны дат:', datePatterns);
  
  // Метод 3: Ищем годы
  const yearLines = allLines.filter(line => /^\d{4}[гr.]*$/.test(line));
  console.log('Найдены годы:', yearLines);
  
  // Метод 4: Ищем даты в формате "дд.мм.гггг" или "дд/мм/гггг"
  const dateFormats = allLines.filter(line => 
    line.match(/\d{1,2}[.\/]\d{1,2}[.\/]\d{4}/) ||
    line.match(/\d{1,2}\s+\w+\s+\d{4}/)
  );
  console.log('Найдены даты в форматах:', dateFormats);
  
  // Метод 5: Ищем даты в заголовках таблицы (строки с "На" и годами)
  const tableHeaders = [];
  for (let i = 0; i < allLines.length - 1; i++) {
    const line = allLines[i];
    const nextLine = allLines[i + 1];
    
    // Если текущая строка содержит "На" и следующая содержит год
    if (line.includes('На') && /^\d{4}[гr.]*$/.test(nextLine)) {
      tableHeaders.push(line + ' ' + nextLine);
    }
  }
  console.log('Найдены заголовки таблицы:', tableHeaders);
  
  // Объединяем все найденные даты
  const allDateCandidates = [...dateHeaders, ...datePatterns, ...dateFormats, ...tableHeaders];
  
  // Удаляем дубликаты
  const uniqueCandidates = [...new Set(allDateCandidates)];
  console.log('Уникальные кандидаты дат:', uniqueCandidates);
  
  for (let j = 0; j < columns && j < uniqueCandidates.length; j++) {
    const candidate = uniqueCandidates[j];
    let year = '2023'; // По умолчанию
    
    // Ищем год рядом с датой
    const yearIndex = allLines.findIndex((line, idx) => 
      /^\d{4}[гr.]*$/.test(line) && Math.abs(idx - allLines.indexOf(candidate)) <= 5
    );
    if (yearIndex !== -1) {
      year = allLines[yearIndex].replace(/[^0-9]/g, '');
    }
    
    // Парсим дату - пробуем разные форматы
    let parsed = null;
    
    // Формат "На дд месяц"
    let match = candidate.match(/На (\d{1,2}) (\w+)/);
    if (match) {
      parsed = parseDate(match[1], match[2], year);
    }
    
    // Формат "дд месяц"
    if (!parsed) {
      match = candidate.match(/(\d{1,2}) (\w+)/);
      if (match) {
        parsed = parseDate(match[1], match[2], year);
      }
    }
    
    // Формат "дд.мм.гггг"
    if (!parsed) {
      match = candidate.match(/(\d{1,2})[.\/](\d{1,2})[.\/](\d{4})/);
      if (match) {
        const day = match[1];
        const month = match[2];
        const year = match[3];
        parsed = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      }
    }
    
    // Формат "дд месяц гггг"
    if (!parsed) {
      match = candidate.match(/(\d{1,2})\s+(\w+)\s+(\d{4})/);
      if (match) {
        parsed = parseDate(match[1], match[2], match[3]);
      }
    }
    
    // Формат "На дд месяц гггг" (когда год уже в строке)
    if (!parsed) {
      match = candidate.match(/На (\d{1,2})\s+(\w+)\s+(\d{4})/);
      if (match) {
        parsed = parseDate(match[1], match[2], match[3]);
      }
    }
    
    if (parsed) {
      dates.push(parsed);
      console.log('Добавлена дата:', parsed, 'из строки:', candidate);
    }
  }
  
  // Если даты не найдены, создаем фиктивные даты с разными месяцами
  if (dates.length === 0) {
    console.log('Даты не найдены, создаем фиктивные даты');
    const currentYear = new Date().getFullYear();
    const months = ['03', '06', '09', '12']; // Квартальные даты
    for (let i = 0; i < columns; i++) {
      const month = months[i] || '12';
      dates.push(`${currentYear}-${month}-31`);
    }
  }
  
  // Если найдена только одна дата, создаем дополнительные на основе найденной
  if (dates.length === 1 && columns > 1) {
    console.log('Найдена только одна дата, создаем дополнительные');
    const baseDate = new Date(dates[0]);
    const baseYear = baseDate.getFullYear();
    
    for (let i = 1; i < columns; i++) {
      // Создаем даты с разницей в 3 месяца
      const newDate = new Date(baseYear, baseDate.getMonth() - (i * 3), baseDate.getDate());
      const newDateStr = newDate.toISOString().split('T')[0];
      dates.push(newDateStr);
      console.log('Добавлена дополнительная дата:', newDateStr);
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
  let i = tableStart;
  let currentName = [];
  let processedCodes = 0;
  
  while (i < allLines.length && processedCodes < 50) { // Ограничиваем количество кодов
    const line = allLines[i];

    // Если это код (4-5 цифр, возможно с доп. символами, но в основном цифры)
    if (/^\d{4,5}$/.test(line)) {
      const code = line;
      processedCodes++;
      console.log('Обрабатываем код:', code);

      // Название - предыдущие строки (не используем, но можно добавить если нужно)
      const name = currentName.join(' ').trim();
      currentName = [];

      // Собираем следующие columns сумм
      const sums = [];
      i++;
      let sumBuffer = '';
      let attempts = 0;
      
      while (sums.length < columns && i < allLines.length && attempts < 10) {
        const nextLine = allLines[i];
        attempts++;
        
        if (/^\d{4,5}$/.test(nextLine)) {
          // Следующий код - откат
          i--;
          break;
        } else if (nextLine.match(/^[A-ZА-ЯIV.]+$/i) || nextLine.includes('том числе') || nextLine === 'в') {
          // Начало нового названия или раздела - прервать
          break;
        } else if (/\d/.test(nextLine) || nextLine === '-' || nextLine === '.') {
          // Собираем буфер для суммы (т.к. суммы могут быть разбиты, напр. "37 992")
          sumBuffer += ' ' + nextLine;
          if (sumBuffer.trim().match(/^\d[\d\s]+$/)) {
            // Если буфер выглядит как полная сумма, добавляем
            const sum = cleanSum(sumBuffer.trim());
            sums.push(sum);
            console.log('Добавлена сумма:', sum, 'из буфера:', sumBuffer.trim());
            sumBuffer = '';
          }
        }
        i++;
      }
      
      // Если сумм меньше columns, заполняем 0
      while (sums.length < columns) {
        sums.push(0);
      }
      
      console.log('Суммы для кода', code, ':', sums);

      // Создаем объекты для каждой даты
      for (let j = 0; j < columns; j++) {
        otchetnost.push({
          date: dates[j],
          code,
          sum: sums[j]
        });
      }
    } else {
      // Собираем название
      if (!/^\d{4,5}$/.test(line) && line !== 'Код' && !line.startsWith('На ')) {
        currentName.push(line);
      }
    }
    i++;
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


// API маршруты
app.post('/api/upload', (req, res) => {
  upload(req, res, async (err) => {
    if (err) {
      console.error('Ошибка загрузки файла:', err);
      return res.status(400).json({ 
        error: err.message || 'Ошибка загрузки файла' 
      });
    }
    
    let pdfPath = null;
    let pdfImagesDir = null;
  
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Файл не загружен' });
    }

    pdfPath = req.file.path;
    const pdfName = req.file.filename;
    
    // Проверяем размер файла
    const stats = fs.statSync(pdfPath);
    if (stats.size === 0) {
      return res.status(400).json({ error: 'Загруженный файл пустой' });
    }
    
    // Создаем уникальную директорию для изображений этого PDF
    pdfImagesDir = path.join(imagesDir, pdfName.replace('.pdf', ''));
    await fs.ensureDir(pdfImagesDir);

    console.log(`Начинаем обработку PDF: ${pdfName}, размер: ${stats.size} байт`);

    // Конвертируем PDF в изображения
    const images = await convertPdfToImages(pdfPath, pdfImagesDir);
    
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
          // content: processFinancialReport(textResult.content, image.pageNumber),
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

    // Очищаем временные файлы через минуту
    setTimeout(async () => {
      try {
        const filesToClean = [];
        if (pdfPath) filesToClean.push(pdfPath);
        if (pdfImagesDir) filesToClean.push(pdfImagesDir);
        await pdfConverter.cleanupFiles(filesToClean);
      } catch (cleanupError) {
        console.error('Ошибка очистки временных файлов:', cleanupError);
      }
    }, 60000);
    

    results.sort((a, b) => a.page - b.page);
    const allPageContents = results.map(result => result.content || []);
    const processedData = parsePageContent(allPageContents);
    res.json({
      success: true,
      filename: pdfName,
      content: processedData,
      pages: results.length,
      results: results
    });

  } catch (error) {
    console.error('Ошибка обработки PDF:', error);
    
    // Очищаем временные файлы при ошибке
    try {
      const filesToClean = [];
      if (pdfPath) filesToClean.push(pdfPath);
      if (pdfImagesDir) filesToClean.push(pdfImagesDir);
      await pdfConverter.cleanupFiles(filesToClean);
    } catch (cleanupError) {
      console.error('Ошибка очистки временных файлов при ошибке:', cleanupError);
    }
    
    res.status(500).json({ 
      error: 'Ошибка обработки PDF файла',
      details: error.message 
    });
  }
  });
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