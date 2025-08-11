<template>
  <v-card elevation="3" class="mb-6">
    <v-card-title class="text-h5 pa-6">
      <v-icon class="mr-2" color="info">mdi-chart-line</v-icon>
      Обработанные данные
      <v-chip
        v-if="content && content.otchetnost"
        class="ml-3"
        color="info"
        variant="outlined"
      >
        {{ content.otchetnost.length }} записей
      </v-chip>
      
      <v-spacer></v-spacer>
      
      <v-btn
        v-if="content && content.otchetnost && content.otchetnost.length > 0"
        color="success"
        variant="outlined"
        prepend-icon="mdi-download"
        @click="exportToCSV"
      >
        Экспорт CSV
      </v-btn>
    </v-card-title>
    
    <v-card-text>
      <v-alert
        v-if="content && content.error"
        type="error"
        variant="tonal"
        class="mb-4"
      >
        <strong>Ошибка обработки:</strong> {{ content.error }}
      </v-alert>

      <div v-if="content && content.otchetnost && content.otchetnost.length > 0">
        <v-data-table
          :headers="headers"
          :items="content.otchetnost"
          :items-per-page="10"
          :items-per-page-options="[5, 10, 25, 50]"
          class="elevation-1"
          density="compact"
        >
          <template v-slot:item.date="{ item }">
            <v-chip
              :color="getDateColor(item.date)"
              variant="outlined"
              size="small"
            >
              {{ formatDate(item.date) }}
            </v-chip>
          </template>
          
          <template v-slot:item.code="{ item }">
            <v-chip
              color="primary"
              variant="tonal"
              size="small"
            >
              {{ item.code }}
            </v-chip>
          </template>
          
          <template v-slot:item.sum="{ item }">
            <span
              :class="getSumClass(item.sum)"
              class="font-weight-medium"
            >
              {{ formatSum(item.sum) }}
            </span>
          </template>
        </v-data-table>

        <v-row class="mt-6">
          <v-col cols="12" md="4">
            <v-card variant="outlined" class="pa-4">
              <v-card-title class="text-h6">
                <v-icon class="mr-2" color="success">mdi-calendar</v-icon>
                Уникальные даты
              </v-card-title>
              <v-card-text>
                <div class="text-h4 text-success">{{ uniqueDates.length }}</div>
                <div class="text-caption text-muted">
                  {{ uniqueDates.join(', ') }}
                </div>
              </v-card-text>
            </v-card>
          </v-col>
          
          <v-col cols="12" md="4">
            <v-card variant="outlined" class="pa-4">
              <v-card-title class="text-h6">
                <v-icon class="mr-2" color="info">mdi-tag</v-icon>
                Уникальные коды
              </v-card-title>
              <v-card-text>
                <div class="text-h4 text-info">{{ uniqueCodes.length }}</div>
                <div class="text-caption text-muted">
                  {{ uniqueCodes.join(', ') }}
                </div>
              </v-card-text>
            </v-card>
          </v-col>
          
          <v-col cols="12" md="4">
            <v-card variant="outlined" class="pa-4">
              <v-card-title class="text-h6">
                <v-icon class="mr-2" color="warning">mdi-calculator</v-icon>
                Общая сумма
              </v-card-title>
              <v-card-text>
                <div class="text-h4 text-warning">{{ formatSum(totalSum) }}</div>
                <div class="text-caption text-muted">
                  Среднее: {{ formatSum(averageSum) }}
                </div>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>

        <v-card variant="outlined" class="mt-6 pa-4">
          <v-card-title class="text-h6">
            <v-icon class="mr-2" color="primary">mdi-chart-bar</v-icon>
            Суммы по датам
          </v-card-title>
          <v-card-text>
            <div class="d-flex align-center justify-space-between mb-4">
              <div
                v-for="(sum, date) in sumsByDate"
                :key="date"
                class="text-center"
                style="flex: 1;"
              >
                <div class="text-caption text-muted mb-1">{{ formatDate(date) }}</div>
                <div class="text-h6 text-primary">{{ formatSum(sum) }}</div>
                <v-progress-linear
                  :model-value="(sum / maxSum) * 100"
                  color="primary"
                  height="8"
                  class="mt-2"
                ></v-progress-linear>
              </div>
            </div>
          </v-card-text>
        </v-card>
      </div>

      <v-alert
        v-else-if="content && (!content.otchetnost || content.otchetnost.length === 0)"
        type="info"
        variant="tonal"
        class="text-center"
      >
        <v-icon class="mb-2" size="large">mdi-information</v-icon>
        <div>Данные для отображения отсутствуют</div>
        <div class="text-caption">Возможно, документ не содержит финансовых данных или произошла ошибка при обработке</div>
        
        <div v-if="content.error" class="mt-3">
          <v-alert type="warning" variant="tonal" class="mb-3">
            <strong>Ошибка обработки:</strong> {{ content.error }}
          </v-alert>
          
          <v-expansion-panels v-if="content.rawLines">
            <v-expansion-panel>
              <v-expansion-panel-title>
                <v-icon class="mr-2">mdi-bug</v-icon>
                Отладочная информация (первые 50 строк)
              </v-expansion-panel-title>
              <v-expansion-panel-text>
                <v-list density="compact">
                  <v-list-item
                    v-for="(line, index) in content.rawLines"
                    :key="index"
                  >
                    <template v-slot:prepend>
                      <v-chip size="small" color="primary" variant="outlined">
                        {{ index + 1 }}
                      </v-chip>
                    </template>
                    <v-list-item-title class="text-body-2">
                      {{ line }}
                    </v-list-item-title>
                  </v-list-item>
                </v-list>
              </v-expansion-panel-text>
            </v-expansion-panel>
          </v-expansion-panels>
        </div>
      </v-alert>

      <v-alert
        v-else
        type="info"
        variant="tonal"
        class="text-center"
      >
        <v-progress-circular
          indeterminate
          color="primary"
          class="mb-2"
        ></v-progress-circular>
        <div>Ожидание данных...</div>
      </v-alert>
    </v-card-text>
  </v-card>
</template>

<script>
export default {
  name: 'ContentDisplay',
  props: {
    content: {
      type: Object,
      default: null
    }
  },
  computed: {
    headers() {
      return [
        {
          title: 'Дата',
          key: 'date',
          sortable: true,
          align: 'start'
        },
        {
          title: 'Код',
          key: 'code',
          sortable: true,
          align: 'start'
        },
        {
          title: 'Сумма',
          key: 'sum',
          sortable: true,
          align: 'end'
        }
      ]
    },
    
    uniqueDates() {
      if (!this.content?.otchetnost) return []
      return [...new Set(this.content.otchetnost.map(item => item.date))].sort()
    },
    
    uniqueCodes() {
      if (!this.content?.otchetnost) return []
      return [...new Set(this.content.otchetnost.map(item => item.code))].sort()
    },
    
    totalSum() {
      if (!this.content?.otchetnost) return 0
      return this.content.otchetnost.reduce((sum, item) => sum + item.sum, 0)
    },
    
    averageSum() {
      if (!this.content?.otchetnost || this.content.otchetnost.length === 0) return 0
      return Math.round(this.totalSum / this.content.otchetnost.length)
    },
    
    sumsByDate() {
      if (!this.content?.otchetnost) return {}
      const sums = {}
      this.content.otchetnost.forEach(item => {
        sums[item.date] = (sums[item.date] || 0) + item.sum
      })
      return sums
    },
    
    maxSum() {
      if (!this.content?.otchetnost) return 0
      return Math.max(...Object.values(this.sumsByDate))
    }
  },
  
  methods: {
    formatDate(dateString) {
      if (!dateString) return 'Неизвестно'
      const date = new Date(dateString)
      return date.toLocaleDateString('ru-RU', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      })
    },
    
    formatSum(sum) {
      if (sum === 0) return '0'
      return new Intl.NumberFormat('ru-RU').format(sum)
    },
    
    getDateColor(date) {
      const today = new Date()
      const itemDate = new Date(date)
      const diffTime = Math.abs(today - itemDate)
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
      
      if (diffDays <= 30) return 'success'
      if (diffDays <= 90) return 'warning'
      return 'error'
    },
    
    getSumClass(sum) {
      if (sum === 0) return 'text-muted'
      if (sum > 1000000) return 'text-success'
      if (sum > 100000) return 'text-info'
      return 'text-primary'
    },
    
    exportToCSV() {
      if (!this.content?.otchetnost) return
      
      const headers = ['Дата', 'Код', 'Сумма']
      const csvContent = [
        headers.join(','),
        ...this.content.otchetnost.map(item => [
          this.formatDate(item.date),
          item.code,
          item.sum
        ].join(','))
      ].join('\n')
      
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      const url = URL.createObjectURL(blob)
      link.setAttribute('href', url)
      link.setAttribute('download', `financial_data_${new Date().toISOString().split('T')[0]}.csv`)
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    }
  }
}
</script>

<style scoped>
.v-data-table {
  border-radius: 8px;
}

.v-card {
  border-radius: 12px;
}
</style>
