<template>
  <v-card variant="outlined" class="pa-4">
    <v-card-title class="text-h6">
      <v-icon class="mr-2" color="info">mdi-chart-line</v-icon>
      Статистика распознавания
    </v-card-title>
    
    <v-card-text>
      <v-row>
        <v-col cols="6" md="3">
          <v-card variant="tonal" color="primary" class="text-center pa-3">
            <div class="text-h4 font-weight-bold">{{ totalPages }}</div>
            <div class="text-caption">Страниц</div>
          </v-card>
        </v-col>
        
        <v-col cols="6" md="3">
          <v-card variant="tonal" color="success" class="text-center pa-3">
            <div class="text-h4 font-weight-bold">{{ totalWords }}</div>
            <div class="text-caption">Слов</div>
          </v-card>
        </v-col>
        
        <v-col cols="6" md="3">
          <v-card variant="tonal" color="info" class="text-center pa-3">
            <div class="text-h4 font-weight-bold">{{ totalCharacters }}</div>
            <div class="text-caption">Символов</div>
          </v-card>
        </v-col>
        
        <v-col cols="6" md="3">
          <v-card variant="tonal" :color="avgConfidenceColor" class="text-center pa-3">
            <div class="text-h4 font-weight-bold">{{ avgConfidencePercent }}%</div>
            <div class="text-caption">Средняя уверенность</div>
          </v-card>
        </v-col>
      </v-row>
      
      <v-divider class="my-4"></v-divider>
      
      <v-row>
        <v-col cols="12" md="6">
          <h4 class="text-subtitle-1 mb-3">Распределение уверенности</h4>
          <v-progress-linear
            v-for="(count, range) in confidenceRanges"
            :key="range"
            :model-value="confidenceRangesPercent[range]"
            :color="getConfidenceColor(range)"
            height="20"
            class="mb-2"
          >
            <template v-slot:default>
              <span class="text-caption">{{ range }}% ({{ count }} стр.)</span>
            </template>
          </v-progress-linear>
        </v-col>
        
        <v-col cols="12" md="6">
          <h4 class="text-subtitle-1 mb-3">Страницы с ошибками</h4>
          <div v-if="errorPages.length > 0">
            <v-chip
              v-for="page in errorPages"
              :key="page"
              color="error"
              variant="outlined"
              class="ma-1"
            >
              Страница {{ page }}
            </v-chip>
          </div>
          <div v-else class="text-success">
            <v-icon class="mr-1">mdi-check-circle</v-icon>
            Все страницы обработаны успешно
          </div>
        </v-col>
      </v-row>
    </v-card-text>
  </v-card>
</template>

<script>
export default {
  name: 'Statistics',
  props: {
    results: {
      type: Array,
      required: true
    }
  },
  computed: {
    totalPages() {
      return this.results.length
    },
    
    totalWords() {
      return this.results.reduce((sum, result) => {
        if (result.text) {
          return sum + result.text.split(/\s+/).filter(word => word.length > 0).length
        }
        return sum
      }, 0)
    },
    
    totalCharacters() {
      return this.results.reduce((sum, result) => {
        return sum + (result.text ? result.text.length : 0)
      }, 0)
    },
    
    avgConfidence() {
      const validResults = this.results.filter(result => result.confidence > 0)
      if (validResults.length === 0) return 0
      
      const totalConfidence = validResults.reduce((sum, result) => sum + result.confidence, 0)
      return totalConfidence / validResults.length
    },
    
    avgConfidencePercent() {
      return Math.round(this.avgConfidence * 100)
    },
    
    avgConfidenceColor() {
      if (this.avgConfidence >= 0.8) return 'success'
      if (this.avgConfidence >= 0.6) return 'warning'
      return 'error'
    },
    
    confidenceRanges() {
      const ranges = {
        '90-100': 0,
        '80-89': 0,
        '70-79': 0,
        '60-69': 0,
        '0-59': 0
      }
      
      this.results.forEach(result => {
        const percent = Math.round(result.confidence * 100)
        if (percent >= 90) ranges['90-100']++
        else if (percent >= 80) ranges['80-89']++
        else if (percent >= 70) ranges['70-79']++
        else if (percent >= 60) ranges['60-69']++
        else ranges['0-59']++
      })
      
      return ranges
    },
    
    confidenceRangesPercent() {
      const total = this.results.length
      const percents = {}
      
      Object.keys(this.confidenceRanges).forEach(range => {
        percents[range] = total > 0 ? (this.confidenceRanges[range] / total) * 100 : 0
      })
      
      return percents
    },
    
    errorPages() {
      return this.results
        .filter(result => result.error)
        .map(result => result.page)
    }
  },
  
  methods: {
    getConfidenceColor(range) {
      if (range === '90-100') return 'success'
      if (range === '80-89') return 'success'
      if (range === '70-79') return 'warning'
      if (range === '60-69') return 'warning'
      return 'error'
    }
  }
}
</script>

<style scoped>
.v-card {
  border-radius: 8px;
}
</style> 