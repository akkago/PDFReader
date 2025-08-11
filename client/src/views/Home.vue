<template>
  <div>
    <v-row justify="center">
      <v-col cols="12" md="8" lg="6">
        <v-card class="mb-6" elevation="3">
          <v-card-title class="text-h5 text-center pa-6">
            <v-icon class="mr-2" color="primary">mdi-upload</v-icon>
            Загрузка PDF файла
          </v-card-title>
          
          <v-card-text>
            <v-file-input
              v-model="selectedFile"
              accept=".pdf"
              label="Выберите PDF файл"
              prepend-icon="mdi-file-pdf-box"
              show-size
              counter
              :rules="fileRules"
              @change="onFileSelect"
            ></v-file-input>
            

            
            <v-alert
              v-if="error"
              type="error"
              variant="tonal"
              class="mt-3"
            >
              {{ error }}
            </v-alert>
            
            <v-btn
              block
              color="primary"
              size="large"
              :loading="loading"
              :disabled="!selectedFile || loading"
              @click="uploadFile"
              class="mt-4"
            >
              <v-icon class="mr-2">mdi-upload</v-icon>
              {{ loading ? 'Обработка...' : 'Загрузить и распознать' }}
            </v-btn>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <div v-if="currentRequestId && requestStatus">
      <v-row justify="center">
        <v-col cols="12" md="8" lg="6">
          <v-card elevation="3" class="mb-6">
            <v-card-title class="text-h6 pa-4">
              <v-icon class="mr-2" :color="getStatusColor(requestStatus.status)">
                {{ getStatusIcon(requestStatus.status) }}
              </v-icon>
              Статус обработки
            </v-card-title>
            
            <v-card-text>
              <v-alert
                :type="getStatusAlertType(requestStatus.status)"
                variant="tonal"
                class="mb-4"
              >
                {{ getStatusMessage(requestStatus.status) }}
              </v-alert>
              
              <div v-if="requestStatus.status === 'in_progress'" class="text-center">
                <v-progress-circular
                  indeterminate
                  color="primary"
                  size="64"
                  class="mb-4"
                ></v-progress-circular>
                <div class="text-body-2 text-muted">
                  Обработка может занять несколько минут...
                </div>
              </div>
              
              <div v-if="requestStatus.error" class="mt-3">
                <v-alert type="error" variant="tonal">
                  <strong>Ошибка:</strong> {{ requestStatus.error_msg }}
                </v-alert>
              </div>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>
    </div>

    <div v-if="results.length > 0">
      <v-row justify="center">
        <v-col cols="12" lg="10">
          <Statistics :results="results" class="mb-6" />
        </v-col>
      </v-row>
    </div>

    <div v-if="content || (results.length > 0 && results.some(r => r.content))">
      <v-row justify="center">
        <v-col cols="12" lg="10">
          <v-card elevation="2" class="mb-4">
            <v-card-text class="pa-4">
              <v-btn-toggle
                v-model="contentViewMode"
                mandatory
                color="primary"
                class="mb-2"
              >
                <v-btn value="processed" prepend-icon="mdi-chart-line">
                  Обработанные данные
                </v-btn>
                <v-btn value="raw" prepend-icon="mdi-text-box">
                  Сырые данные
                </v-btn>
              </v-btn-toggle>
              
              <div class="text-caption text-muted">
                {{ contentViewMode === 'processed' 
                  ? 'Показаны структурированные финансовые данные' 
                  : 'Показаны исходные строки распознанного текста' }}
              </div>
            </v-card-text>
          </v-card>

          <ContentDisplay 
            v-if="contentViewMode === 'processed' && content" 
            :content="content" 
          />

          <RawContentDisplay 
            v-if="contentViewMode === 'raw' && results.length > 0"
            :raw-content="getRawContent()"
          />
        </v-col>
      </v-row>
    </div>
    <div v-if="results.length > 0">
      <v-row justify="center">
        <v-col cols="12" lg="10">
          <v-card elevation="3">
            <v-card-title class="text-h5 pa-6">
              <v-icon class="mr-2" color="success">mdi-text-recognition</v-icon>
              Результаты распознавания
              <v-chip
                class="ml-3"
                color="primary"
                variant="outlined"
              >
                {{ results.length }} {{ results.length === 1 ? 'страница' : 'страниц' }}
              </v-chip>
            </v-card-title>
            
            <v-card-text>
              <v-tabs
                v-model="activeTab"
                color="primary"
                grow
              >
                <v-tab
                  v-for="(result, index) in results"
                  :key="index"
                  :value="index"
                >
                  Страница {{ result.page }}
                </v-tab>
              </v-tabs>
              
              <v-window v-model="activeTab">
                <v-window-item
                  v-for="(result, index) in results"
                  :key="index"
                  :value="index"
                >
                  <v-card flat class="mt-4">
                    <v-row>
                      <v-col cols="12" md="6">
                        <v-card variant="outlined" class="pa-4">
                          <v-card-title class="text-h6">
                            Распознанный текст
                            <v-chip
                              v-if="result.confidence > 0"
                              class="ml-2"
                              :color="getConfidenceColor(result.confidence)"
                              size="small"
                            >
                              {{ Math.round(result.confidence * 100) }}%
                            </v-chip>
                          </v-card-title>
                          <v-card-text>
                            <div
                              v-if="result.text"
                              class="text-body-1"
                              style="white-space: pre-wrap; line-height: 1.6;"
                            >
                              {{ result.text }}
                            </div>
                            <div
                              v-else-if="result.error"
                              class="text-error"
                            >
                              Ошибка: {{ result.error }}
                            </div>
                            <div
                              v-else
                              class="text-muted"
                            >
                              Текст не найден
                            </div>
                          </v-card-text>
                        </v-card>
                      </v-col>
                      
                      <v-col cols="12" md="6">
                        <v-card variant="outlined" class="pa-4">
                          <v-card-title class="text-h6">
                            Детали распознавания
                          </v-card-title>
                          <v-card-text>
                            <v-list density="compact">
                              <v-list-item>
                                <template v-slot:prepend>
                                  <v-icon color="primary">mdi-file-document</v-icon>
                                </template>
                                <v-list-item-title>Страница</v-list-item-title>
                                <v-list-item-subtitle>{{ result.page }}</v-list-item-subtitle>
                              </v-list-item>
                              
                              <v-list-item v-if="result.confidence > 0">
                                <template v-slot:prepend>
                                  <v-icon color="success">mdi-check-circle</v-icon>
                                </template>
                                <v-list-item-title>Уверенность</v-list-item-title>
                                <v-list-item-subtitle>
                                  {{ Math.round(result.confidence * 100) }}%
                                </v-list-item-subtitle>
                              </v-list-item>
                              
                              <v-list-item v-if="result.text">
                                <template v-slot:prepend>
                                  <v-icon color="info">mdi-format-text</v-icon>
                                </template>
                                <v-list-item-title>Символов</v-list-item-title>
                                <v-list-item-subtitle>{{ result.text.length }}</v-list-item-subtitle>
                              </v-list-item>

                            </v-list>
                          </v-card-text>
                        </v-card>
                      </v-col>
                    </v-row>
                  </v-card>
                </v-window-item>
              </v-window>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>
    </div>
  </div>
</template>

<script>
import axios from 'axios'
import Statistics from '../components/Statistics.vue'
import ContentDisplay from '../components/ContentDisplay.vue'
import RawContentDisplay from '../components/RawContentDisplay.vue'

export default {
  name: 'Home',
  components: {
    Statistics,
    ContentDisplay,
    RawContentDisplay
  },
  data() {
    return {
      selectedFile: null,
      loading: false,
      error: '',
      content: '',
      results: [],
      activeTab: 0,
      contentViewMode: 'processed', // 'processed' или 'raw'
      currentRequestId: null,
      requestStatus: null,
      pollingInterval: null,
      fileRules: [
        value => {
          if (!value) return 'Файл обязателен'
          if (value.size > 10 * 1024 * 1024) return 'Файл должен быть меньше 10MB'
          return true
        }
      ],

    }
  },
  methods: {
    onFileSelect(file) {
      this.error = ''
      this.results = []
      this.activeTab = 0
      this.contentViewMode = 'processed'
      this.currentRequestId = null
      this.requestStatus = null
      this.stopPolling()
    },
    
    async uploadFile() {
      if (!this.selectedFile) return
      
      this.loading = true
      this.error = ''
      this.currentRequestId = null
      this.requestStatus = null
      this.stopPolling()
      
      const formData = new FormData()
      formData.append('file', this.selectedFile)
      formData.append('type', 'otchetnost')
      
      try {
        const response = await axios.post('/api/parse', formData, {
          headers: {
            'Content-Type': 'multipart/form-data'
          },
          timeout: 30000 // 30 секунд для создания заявки
        })
        
        this.currentRequestId = response.data.request_id
        this.startPolling()
        
      } catch (error) {
        console.error('Ошибка загрузки:', error)
        if (error.response?.data?.error) {
          this.error = error.response.data.error_msg || error.response.data.error
        } else if (error.code === 'ECONNABORTED') {
          this.error = 'Превышено время ожидания. Попробуйте файл меньшего размера.'
        } else {
          this.error = 'Произошла ошибка при обработке файла'
        }
      } finally {
        this.loading = false
      }
    },
    
    async checkRequestStatus() {
      if (!this.currentRequestId) return
      
      try {
        const response = await axios.get(`/api/result/${this.currentRequestId}`)
        this.requestStatus = response.data
        
        if (response.data.status === 'complete') {
          this.content = response.data.content
          this.results = response.data.results || []
          this.stopPolling()
        } else if (response.data.status === 'failed') {
          this.error = response.data.error_msg || 'Ошибка обработки файла'
          this.stopPolling()
        }
        
      } catch (error) {
        console.error('Ошибка проверки статуса:', error)
        if (error.response?.status === 404) {
          this.error = 'Заявка не найдена'
          this.stopPolling()
        }
      }
    },
    
    startPolling() {
      this.pollingInterval = setInterval(() => {
        this.checkRequestStatus()
      }, 2000) // Проверяем каждые 2 секунды
    },
    
    stopPolling() {
      if (this.pollingInterval) {
        clearInterval(this.pollingInterval)
        this.pollingInterval = null
      }
    },
    
    getStatusColor(status) {
      switch (status) {
        case 'in_progress': return 'warning'
        case 'complete': return 'success'
        case 'failed': return 'error'
        default: return 'grey'
      }
    },
    
    getStatusIcon(status) {
      switch (status) {
        case 'in_progress': return 'mdi-clock-outline'
        case 'complete': return 'mdi-check-circle'
        case 'failed': return 'mdi-alert-circle'
        default: return 'mdi-help-circle'
      }
    },
    
    getStatusAlertType(status) {
      switch (status) {
        case 'in_progress': return 'info'
        case 'complete': return 'success'
        case 'failed': return 'error'
        default: return 'warning'
      }
    },
    
    getStatusMessage(status) {
      switch (status) {
        case 'in_progress': return 'Файл обрабатывается...'
        case 'complete': return 'Обработка завершена успешно'
        case 'failed': return 'Ошибка обработки файла'
        default: return 'Неизвестный статус'
      }
    },
    
    getConfidenceColor(confidence) {
      if (confidence >= 0.8) return 'success'
      if (confidence >= 0.6) return 'warning'
      return 'error'
    },
    
    getRawContent() {
      if (!this.results || this.results.length === 0) return []
      
      // Собираем все content из всех страниц
      const allContent = []
      this.results.forEach(result => {
        if (result.content && Array.isArray(result.content)) {
          allContent.push(...result.content)
        }
      })
      
      return allContent
    }
  },
  
  beforeUnmount() {
    this.stopPolling()
  }
}
</script>

<style scoped>
.v-card {
  border-radius: 12px;
}

.v-tabs {
  border-bottom: 1px solid #e0e0e0;
}
</style> 