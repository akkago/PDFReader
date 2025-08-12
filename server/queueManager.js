const fs = require('fs-extra');
const path = require('path');

class QueueManager {
  constructor() {
    this.queueFile = path.join(__dirname, '../data/requests_queue.json');
    this.ensureQueueFile();
  }

  async ensureQueueFile() {
    try {
      await fs.ensureDir(path.dirname(this.queueFile));
      const exists = await fs.pathExists(this.queueFile);
      if (!exists) {
        await fs.writeJson(this.queueFile, {}, { spaces: 2 });
      } else {
        try {
          await fs.readJson(this.queueFile);
        } catch (jsonError) {
          console.log('Файл содержит невалидный JSON, пересоздаю');
          await fs.writeJson(this.queueFile, {}, { spaces: 2 });
        }
      }
    } catch (error) {
      console.error('Ошибка создания файла очереди:', error);
    }
  }

  async loadQueue() {
    try {
      await this.ensureQueueFile();
      const data = await fs.readJson(this.queueFile);
      return data || {};
    } catch (error) {
      console.error('Ошибка загрузки очереди:', error);
      try {
        const fileContent = await fs.readFile(this.queueFile, 'utf8');
        console.log('Содержимое файла:', fileContent);
        console.log('Длина файла:', fileContent.length);
        console.log('Последние 100 символов:', fileContent.slice(-100));
        
        if (!fileContent || fileContent.trim() === '') {
          console.log('Файл пустой, создаю новый');
          await fs.writeJson(this.queueFile, {}, { spaces: 2 });
          return {};
        }
        
        // Попытка исправить поврежденный JSON
        const trimmedContent = fileContent.trim();
        if (trimmedContent === '{}' || trimmedContent === '[]') {
          console.log('Файл содержит только пустые скобки, исправляю');
          await fs.writeJson(this.queueFile, {}, { spaces: 2 });
          return {};
        }
        
        if (trimmedContent.startsWith('{') && !trimmedContent.endsWith('}')) {
          console.log('JSON обрывается, пытаюсь восстановить');
          let braceCount = 0;
          let lastValidPosition = -1;
          
          for (let i = 0; i < trimmedContent.length; i++) {
            if (trimmedContent[i] === '{') {
              braceCount++;
            } else if (trimmedContent[i] === '}') {
              braceCount--;
              if (braceCount === 0) {
                lastValidPosition = i;
                break;
              }
            }
          }
          
          if (lastValidPosition > 0) {
            const validJson = trimmedContent.substring(0, lastValidPosition + 1);
            try {
              JSON.parse(validJson);
              console.log('Восстановлен валидный JSON');
              await fs.writeFile(this.queueFile, validJson, 'utf8');
              return JSON.parse(validJson);
            } catch (parseError) {
              console.log('Не удалось восстановить JSON');
            }
          }
        }
        
        console.log('Файл поврежден, создаю новый');
        await fs.writeJson(this.queueFile, {}, { spaces: 2 });
        return {};
      } catch (readError) {
        console.error('Ошибка чтения файла:', readError);
        await fs.writeJson(this.queueFile, {}, { spaces: 2 });
        return {};
      }
    }
  }

  async saveQueue(queue) {
    try {
      const tempFile = this.queueFile + '.tmp';
      
      await fs.writeJson(tempFile, queue, { spaces: 2 });
      
      await fs.readJson(tempFile);
      
      await fs.move(tempFile, this.queueFile, { overwrite: true });
    } catch (error) {
      console.error('Ошибка сохранения очереди:', error);
      try {
        await fs.remove(this.queueFile + '.tmp');
      } catch (removeError) {
      }
    }
  }

  async setRequest(requestId, requestData) {
    try {
      const queue = await this.loadQueue();
      
      const limitedData = { ...requestData };
      
      if (limitedData.content && JSON.stringify(limitedData.content).length > 1000000) {
        console.log('Content слишком большой, сохраняю только метаданные');
        limitedData.content = {
          message: 'Content слишком большой для сохранения в очереди',
          pages: limitedData.content.pages || 0
        };
      }
      
      queue[requestId] = {
        ...limitedData,
        updatedAt: new Date().toISOString()
      };
      
      await this.saveQueue(queue);
    } catch (error) {
      console.error('Ошибка установки запроса:', error);
    }
  }

  async getRequest(requestId) {
    try {
      const queue = await this.loadQueue();
      return queue[requestId] || null;
    } catch (error) {
      console.error('Ошибка получения запроса:', error);
      return null;
    }
  }

  async deleteRequest(requestId) {
    try {
      const queue = await this.loadQueue();
      if (requestId in queue) {
        delete queue[requestId];
        await this.saveQueue(queue);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Ошибка удаления запроса:', error);
      return false;
    }
  }

  async getAllRequests() {
    try {
      return await this.loadQueue();
    } catch (error) {
      console.error('Ошибка получения всех запросов:', error);
      return {};
    }
  }

  async cleanupOldRequests(maxAgeHours = 24) {
    try {
      const queue = await this.loadQueue();
      const now = new Date();
      const maxAgeMs = maxAgeHours * 60 * 60 * 1000;
      
      let cleanedCount = 0;
      for (const [requestId, request] of Object.entries(queue)) {
        if (request.updatedAt) {
          const requestDate = new Date(request.updatedAt);
          if (now - requestDate > maxAgeMs) {
            delete queue[requestId];
            cleanedCount++;
          }
        }
      }
      
      if (cleanedCount > 0) {
        await this.saveQueue(queue);
        console.log(`Очищено ${cleanedCount} устаревших запросов`);
      }
      
      return cleanedCount;
    } catch (error) {
      console.error('Ошибка очистки устаревших запросов:', error);
      return 0;
    }
  }

  async getQueueStats() {
    try {
      const queue = await this.loadQueue();
      const total = Object.keys(queue).length;
      const statuses = {};
      
      for (const request of Object.values(queue)) {
        const status = request.status || 'unknown';
        statuses[status] = (statuses[status] || 0) + 1;
      }
      
      return {
        total,
        statuses,
        queueFile: this.queueFile
      };
    } catch (error) {
      console.error('Ошибка получения статистики очереди:', error);
      return { total: 0, statuses: {}, queueFile: this.queueFile };
    }
  }
}

module.exports = QueueManager;
