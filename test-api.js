const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

// Конфигурация
const API_BASE_URL = 'http://localhost:3000/api';

// Функция для тестирования API
async function testAPI() {
  try {
    console.log('🧪 Тестирование нового API...\n');

    // Тест 1: Проверка эндпоинта /parse без файла
    console.log('1. Тест /parse без файла:');
    try {
      const formData = new FormData();
      formData.append('type', 'otchetnost');
      
      await axios.post(`${API_BASE_URL}/parse`, formData, {
        headers: formData.getHeaders()
      });
    } catch (error) {
      if (error.response?.status === 400) {
        console.log('✅ Ожидаемая ошибка: Файл не загружен');
      } else {
        console.log('❌ Неожиданная ошибка:', error.response?.data);
      }
    }

    // Тест 2: Проверка эндпоинта /parse без типа
    console.log('\n2. Тест /parse без типа:');
    try {
      const formData = new FormData();
      // Создаем пустой файл для теста
      const testFile = Buffer.from('test content');
      formData.append('file', testFile, { filename: 'test.pdf' });
      
      await axios.post(`${API_BASE_URL}/parse`, formData, {
        headers: formData.getHeaders()
      });
    } catch (error) {
      if (error.response?.status === 400) {
        console.log('✅ Ожидаемая ошибка: Тип файла обязателен');
      } else {
        console.log('❌ Неожиданная ошибка:', error.response?.data);
      }
    }

    // Тест 3: Проверка эндпоинта /parse с неподдерживаемым типом
    console.log('\n3. Тест /parse с неподдерживаемым типом:');
    try {
      const formData = new FormData();
      const testFile = Buffer.from('test content');
      formData.append('file', testFile, { filename: 'test.pdf' });
      formData.append('type', 'unsupported_type');
      
      await axios.post(`${API_BASE_URL}/parse`, formData, {
        headers: formData.getHeaders()
      });
    } catch (error) {
      if (error.response?.status === 400 && error.response?.data?.error === 'unsupported') {
        console.log('✅ Ожидаемая ошибка: Парсинг данного типа файлов не поддерживается');
      } else {
        console.log('❌ Неожиданная ошибка:', error.response?.data);
      }
    }

    // Тест 4: Проверка эндпоинта /result с несуществующим ID
    console.log('\n4. Тест /result с несуществующим ID:');
    try {
      await axios.get(`${API_BASE_URL}/result/non-existent-id`);
    } catch (error) {
      if (error.response?.status === 404) {
        console.log('✅ Ожидаемая ошибка: Заявка не найдена');
      } else {
        console.log('❌ Неожиданная ошибка:', error.response?.data);
      }
    }

    console.log('\n🎉 Все тесты завершены!');
    console.log('\n📝 Для полного тестирования:');
    console.log('1. Запустите сервер: npm start');
    console.log('2. Откройте http://localhost:3000 в браузере');
    console.log('3. Загрузите PDF файл с отчетностью');

  } catch (error) {
    console.error('❌ Ошибка тестирования:', error.message);
  }
}

// Запуск тестов
testAPI();
