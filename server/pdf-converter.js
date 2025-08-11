const fs = require('fs-extra');
const path = require('path');
const { spawn } = require('child_process');
const PDFConverterFallback = require('./pdf-converter-fallback');

class PDFConverter {
  constructor() {
  }

  async convertPDFToImages(pdfPath, outputDir) {
    try {
      if (!await fs.pathExists(pdfPath)) {
        throw new Error(`PDF файл не найден: ${pdfPath}`);
      }

      const stats = await fs.stat(pdfPath);
      if (stats.size === 0) {
        throw new Error('PDF файл пустой');
      }

      await fs.ensureDir(outputDir);

      console.log(`Начинаем конвертацию PDF: ${pdfPath}`);

      const results = await this.convertWithPdfToPpm(pdfPath, outputDir);
      
      if (!results || results.length === 0) {
        throw new Error('Не удалось конвертировать PDF в изображения');
      }

      console.log(`Конвертировано ${results.length} страниц`);
      return results;

    } catch (error) {
      console.error('Ошибка конвертации PDF:', error);
      
      try {
        console.log('Пробуем альтернативный метод конвертации...');
        return await this.convertWithPdfToCairo(pdfPath, outputDir);
      } catch (altError) {
        console.error('Альтернативный метод также не удался:', altError);
        
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
        '-png',
        '-r', '150',
        '-f', '1',
        '-l', '999',
        pdfPath,
        outputPrefix
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
        '-png',
        '-r', '150',
        pdfPath,
        outputPrefix
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