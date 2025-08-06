const PDFConverter = require('./server/pdf-converter');
const PDFConverterFallback = require('./server/pdf-converter-fallback');
const path = require('path');

async function testPDFConversion() {
  console.log('=== Тестирование конвертации PDF ===\n');
  
  // Путь к тестовому PDF файлу (замените на свой)
  const testPdfPath = path.join(__dirname, 'test.pdf');
  const outputDir = path.join(__dirname, 'uploads', 'test-output');
  
  // Проверяем существование тестового файла
  const fs = require('fs-extra');
  if (!await fs.pathExists(testPdfPath)) {
    console.error('❌ Тестовый файл test.pdf не найден!');
    console.log('Поместите PDF файл в корень проекта как test.pdf');
    return;
  }
  
  try {
    console.log('📄 PDF файл:', testPdfPath);
    console.log('📁 Выходная директория:', outputDir);
    console.log('');
    
    // Тестируем основной конвертер
    console.log('🔄 Тестируем основной конвертер...');
    const converter = new PDFConverter();
    const results = await converter.convertPDFToImages(testPdfPath, outputDir);
    
    console.log('✅ Конвертация завершена успешно!');
    console.log(`📊 Конвертировано страниц: ${results.length}`);
    
    results.forEach((result, index) => {
      console.log(`   Страница ${result.pageNumber}: ${result.path}`);
    });
    
  } catch (error) {
    console.error('❌ Ошибка основного конвертера:', error.message);
    
    try {
      console.log('\n🔄 Тестируем fallback конвертер...');
      const fallbackConverter = new PDFConverterFallback();
      const fallbackResults = await fallbackConverter.convertPDFToImages(testPdfPath, outputDir);
      
      console.log('✅ Fallback конвертация завершена успешно!');
      console.log(`📊 Конвертировано страниц: ${fallbackResults.length}`);
      
      fallbackResults.forEach((result, index) => {
        console.log(`   Страница ${result.pageNumber}: ${result.path}`);
      });
      
    } catch (fallbackError) {
      console.error('❌ Ошибка fallback конвертера:', fallbackError.message);
      console.log('\n💡 Рекомендации:');
      console.log('1. Установите Poppler Utils');
      console.log('2. Проверьте PDF файл на повреждения');
      console.log('3. Попробуйте другой PDF файл');
    }
  }
}

// Запускаем тест только если файл запущен напрямую
if (require.main === module) {
  testPDFConversion();
}

module.exports = testPDFConversion; 