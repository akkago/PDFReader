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

    <!-- Статистика -->
    <div v-if="results.length > 0">
      <v-row justify="center">
        <v-col cols="12" lg="10">
          <Statistics :results="results" class="mb-6" />
        </v-col>
      </v-row>
    </div>

    <!-- Результаты распознавания -->
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

export default {
  name: 'Home',
  components: {
    Statistics
  },
  data() {
    return {
      selectedFile: null,
      loading: false,
      error: '',
      results: [],
      activeTab: 0,
      fileRules: [
        value => {
          if (!value) return 'Файл обязателен'
          if (value.size > 10 * 1024 * 1024) return 'Файл должен быть меньше 10MB'
          return true
        }
      ]
    }
  },
  methods: {
    onFileSelect(file) {
      this.error = ''
      this.results = []
      this.activeTab = 0
    },
    
    async uploadFile() {
      if (!this.selectedFile) return
      
      this.loading = true
      this.error = ''
      
      const formData = new FormData()
      formData.append('pdf', this.selectedFile)
      
      try {
        const response = await axios.post('/api/upload', formData, {
          headers: {
            'Content-Type': 'multipart/form-data'
          },
          timeout: 300000 // 5 минут
        })
        
        this.results = response.data.results
        console.log('console.log' +this.results)

        this.activeTab = 0
        
      } catch (error) {
        console.error('Ошибка загрузки:', error)
        if (error.response?.data?.error) {
          this.error = error.response.data.error
        } else if (error.code === 'ECONNABORTED') {
          this.error = 'Превышено время ожидания. Попробуйте файл меньшего размера.'
        } else {
          this.error = 'Произошла ошибка при обработке файла'
        }
      } finally {
        this.loading = false
      }
    },
    
    getConfidenceColor(confidence) {
      if (confidence >= 0.8) return 'success'
      if (confidence >= 0.6) return 'warning'
      return 'error'
    }
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