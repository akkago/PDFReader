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
          imagePath: image.path
        });
      } catch (error) {
        console.error(`Ошибка распознавания страницы ${image.pageNumber}:`, error);
        results.push({
          page: image.pageNumber,
          text: '',
          confidence: 0,
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

    res.json({
      success: true,
      filename: pdfName,
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