const fs = require('fs-extra');
const path = require('path');
const { spawn } = require('child_process');
const sharp = require('sharp');
const PDFConverterFallback = require('./pdf-converter-fallback');

class PDFConverter {
  constructor() {
    this.maxRetries = 3;
    this.retryDelay = 1000; // 1 секунда
  }

  async convertPDFToImages(pdfPath, outputDir) {
    try {
      // Проверяем существование файла
      if (!await fs.pathExists(pdfPath)) {
        throw new Error(`PDF файл не найден: ${pdfPath}`);
      }

      // Проверяем размер файла
      const stats = await fs.stat(pdfPath);
      if (stats.size === 0) {
        throw new Error('PDF файл пустой');
      }

      // Создаем директорию для изображений
      await fs.ensureDir(outputDir);

      console.log(`Начинаем конвертацию PDF: ${pdfPath}`);

      // Используем pdftoppm (часть poppler-utils) для конвертации
      const results = await this.convertWithPdfToPpm(pdfPath, outputDir);
      
      if (!results || results.length === 0) {
        throw new Error('Не удалось конвертировать PDF в изображения');
      }

      console.log(`Конвертировано ${results.length} страниц`);
      return results;

    } catch (error) {
      console.error('Ошибка конвертации PDF:', error);
      
      // Попробуем альтернативный метод
      try {
        console.log('Пробуем альтернативный метод конвертации...');
        return await this.convertWithPdfToCairo(pdfPath, outputDir);
      } catch (altError) {
        console.error('Альтернативный метод также не удался:', altError);
        
        // Используем fallback конвертер
        try {
          console.log('Используем fallback конвертер...');
          const fallbackConverter = new PDFConverterFallback();
          return await fallbackConverter.convertPDFToImages(pdfPath, outputDir);
        } catch (fallbackError) {
          console.error('Fallback конвертер также не удался:', fallbackError);
          throw new Error(`Ошибка конвертации PDF: ${error.message}`);
        }
      }
    }
  }

  async convertWithPdfToPpm(pdfPath, outputDir) {
    return new Promise((resolve, reject) => {
      const outputPrefix = path.join(outputDir, 'page');
      const args = [
        '-png',           // Формат PNG
        '-r', '150',      // Разрешение 150 DPI
        '-f', '1',        // Первая страница
        '-l', '999',      // Последняя страница (большое число)
        pdfPath,          // Входной файл
        outputPrefix      // Префикс выходных файлов
      ];

      console.log('Запуск pdftoppm с аргументами:', args.join(' '));

      const process = spawn('pdftoppm', args, {
        stdio: ['ignore', 'pipe', 'pipe']
      });

      let stdout = '';
      let stderr = '';

      process.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      process.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      process.on('close', async (code) => {
        if (code === 0) {
          try {
            const results = await this.processConvertedFiles(outputDir, 'page');
            resolve(results);
          } catch (error) {
            reject(error);
          }
        } else {
          console.error('pdftoppm завершился с ошибкой:', stderr);
          reject(new Error(`pdftoppm завершился с кодом ${code}: ${stderr}`));
        }
      });

      process.on('error', (error) => {
        console.error('Ошибка запуска pdftoppm:', error);
        reject(new Error(`Не удалось запустить pdftoppm: ${error.message}`));
      });
    });
  }

  async convertWithPdfToCairo(pdfPath, outputDir) {
    return new Promise((resolve, reject) => {
      const outputPrefix = path.join(outputDir, 'page');
      const args = [
        '-png',           // Формат PNG
        '-r', '150',      // Разрешение 150 DPI
        pdfPath,          // Входной файл
        outputPrefix      // Префикс выходных файлов
      ];

      console.log('Запуск pdftocairo с аргументами:', args.join(' '));

      const process = spawn('pdftocairo', args, {
        stdio: ['ignore', 'pipe', 'pipe']
      });

      let stdout = '';
      let stderr = '';

      process.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      process.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      process.on('close', async (code) => {
        if (code === 0) {
          try {
            const results = await this.processConvertedFiles(outputDir, 'page');
            resolve(results);
          } catch (error) {
            reject(error);
          }
        } else {
          console.error('pdftocairo завершился с ошибкой:', stderr);
          reject(new Error(`pdftocairo завершился с кодом ${code}: ${stderr}`));
        }
      });

      process.on('error', (error) => {
        console.error('Ошибка запуска pdftocairo:', error);
        reject(new Error(`Не удалось запустить pdftocairo: ${error.message}`));
      });
    });
  }

  async processConvertedFiles(outputDir, prefix) {
    try {
      const files = await fs.readdir(outputDir);
      const pngFiles = files.filter(file => 
        file.startsWith(prefix) && file.endsWith('.png')
      ).sort();

      const results = [];
      for (let i = 0; i < pngFiles.length; i++) {
        const fileName = pngFiles[i];
        const filePath = path.join(outputDir, fileName);
        
        // Проверяем, что файл существует и не пустой
        const stats = await fs.stat(filePath);
        if (stats.size > 0) {
          results.push({
            path: filePath,
            pageNumber: i + 1
          });
          console.log(`Обработан файл: ${fileName} (страница ${i + 1})`);
        }
      }

      return results;
    } catch (error) {
      console.error('Ошибка обработки конвертированных файлов:', error);
      throw error;
    }
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async cleanupFiles(files) {
    for (const file of files) {
      try {
        if (await fs.pathExists(file)) {
          await fs.remove(file);
          console.log(`Файл удален: ${file}`);
        }
      } catch (error) {
        console.error(`Ошибка удаления файла ${file}:`, error);
      }
    }
  }
}

module.exports = PDFConverter; 