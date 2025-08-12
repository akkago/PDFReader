const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs-extra');
const { spawn } = require('child_process');
const PDFConverter = require('./pdf-converter');
const { v4: uuidv4 } = require('uuid');
const { parsePageContent } = require('./parsePageContent');
const QueueManager = require('./queueManager');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../client/dist')));

const uploadsDir = path.join(__dirname, '../uploads');
const imagesDir = path.join(__dirname, '../uploads/images');
fs.ensureDirSync(uploadsDir);
fs.ensureDirSync(imagesDir);

const queueManager = new QueueManager();

setInterval(async () => {
  await queueManager.cleanupOldRequests(24);
}, 60 * 60 * 1000);

const SUPPORTED_TYPES = ['otchetnost'];
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
    fileSize: 10 * 1024 * 1024,
    files: 1
  }
}).single('file');

const pdfConverter = new PDFConverter();
async function convertPdfToImages(pdfPath, outputDir) {
  return await pdfConverter.convertPDFToImages(pdfPath, outputDir);
}

function recognizeTextWithPaddleOCR(imagePath) {
  return new Promise((resolve, reject) => {
    const pythonProcess = spawn('python', [
      path.join(__dirname, 'paddleocr_script.py'),
      imagePath
    ], {
      env: { ...process.env, PYTHONIOENCODING: 'utf-8' }
    });

    let result = '';
    let error = '';

    pythonProcess.stdout.on('data', (data) => {
      result += data.toString('utf-8');
    });

    pythonProcess.stderr.on('data', (data) => {
      error += data.toString('utf-8');
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

function validateFileType(fileType, content) {
  if (!SUPPORTED_TYPES.includes(fileType)) {
    return { valid: false, error: 'unsupported', error_msg: 'Парсинг данного типа файлов не поддерживается' };
  }

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

async function processRequest(requestId, filePath, fileType) {
  try {
    await queueManager.setRequest(requestId, { status: 'in_progress' });

    const pdfName = path.basename(filePath);
    
    const pdfImagesDir = path.join(imagesDir, pdfName.replace('.pdf', ''));
    await fs.ensureDir(pdfImagesDir);

    console.log(`Начинаем обработку PDF: ${pdfName}, тип: ${fileType}`);

    const images = await convertPdfToImages(filePath, pdfImagesDir);
    
    if (!images || images.length === 0) {
      throw new Error('Не удалось конвертировать PDF в изображения');
    }

    console.log(`Конвертировано ${images.length} страниц`);
    
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

    const allContent = results.map(result => result.content || []).flat();
    
    const validation = validateFileType(fileType, allContent);
    if (!validation.valid) {
      await queueManager.setRequest(requestId, { 
        status: 'failed', 
        error: validation.error, 
        error_msg: validation.error_msg 
      });
      return;
    }

    const allPageContents = results.map(result => result.content || []);
    const processedData = parsePageContent(allPageContents);

    await queueManager.setRequest(requestId, { 
      status: 'complete', 
      content: processedData 
    });

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
    await queueManager.setRequest(requestId, { 
      status: 'failed', 
      error: 'processing_error', 
      error_msg: error.message 
    });
  }
}

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

      const { type = 'otchetnost' } = req.body;
      
      if (!SUPPORTED_TYPES.includes(type)) {
        return res.status(400).json({ 
          error: 'unsupported', 
          error_msg: 'Парсинг данного типа файлов не поддерживается' 
        });
      }

      const stats = fs.statSync(req.file.path);
      if (stats.size === 0) {
        return res.status(400).json({ error: 'Загруженный файл пустой' });
      }

      const requestId = uuidv4();
      
      await queueManager.setRequest(requestId, { 
        status: 'in_progress',
        filePath: req.file.path,
        fileType: type,
        createdAt: new Date().toISOString()
      });

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

app.get('/api/result/:id', async (req, res) => {
  const requestId = req.params.id;
  
  const request = await queueManager.getRequest(requestId);

  if (!request) {
    return res.status(404).json({ 
      error: 'not_found', 
      error_msg: 'Заявка не найдена' 
    });
  }

  res.json(request);
});

app.get('/api/queue/stats', async (req, res) => {
  try {
    const stats = await queueManager.getQueueStats();
    res.json(stats);
  } catch (error) {
    console.error('Ошибка получения статистики очереди:', error);
    res.status(500).json({ 
      error: 'Ошибка получения статистики очереди',
      details: error.message 
    });
  }
});

app.get('/api/queue/requests', async (req, res) => {
  try {
    const requests = await queueManager.getAllRequests();
    res.json(requests);
  } catch (error) {
    console.error('Ошибка получения всех запросов:', error);
    res.status(500).json({ 
      error: 'Ошибка получения всех запросов',
      details: error.message 
    });
  }
});

app.delete('/api/queue/requests/:id', async (req, res) => {
  const requestId = req.params.id;
  
  try {
    const deleted = await queueManager.deleteRequest(requestId);
    if (deleted) {
      res.json({ message: 'Запрос успешно удален' });
    } else {
      res.status(404).json({ 
        error: 'not_found', 
        error_msg: 'Запрос не найден' 
      });
    }
  } catch (error) {
    console.error('Ошибка удаления запроса:', error);
    res.status(500).json({ 
      error: 'Ошибка удаления запроса',
      details: error.message 
    });
  }
});

app.post('/api/queue/cleanup', async (req, res) => {
  try {
    const { maxAgeHours = 24 } = req.body;
    const cleanedCount = await queueManager.cleanupOldRequests(maxAgeHours);
    res.json({ 
      message: `Очищено ${cleanedCount} устаревших запросов`,
      cleanedCount 
    });
  } catch (error) {
    console.error('Ошибка очистки очереди:', error);
    res.status(500).json({ 
      error: 'Ошибка очистки очереди',
      details: error.message 
    });
  }
});

app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'Файл слишком большой. Максимальный размер: 10MB' });
    }
  }
  res.status(400).json({ error: error.message });
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/dist/index.html'));
});

app.listen(PORT, () => {
  console.log(`Сервер запущен на порту ${PORT}`);
  console.log(`Откройте http://localhost:${PORT} в браузере`);
}); 