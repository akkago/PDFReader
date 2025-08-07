<template>
  <v-card elevation="3" class="mb-6">
    <v-card-title class="text-h5 pa-6">
      <v-icon class="mr-2" color="secondary">mdi-text-box</v-icon>
      Сырые данные распознавания
      <v-chip
        v-if="rawContent && Array.isArray(rawContent)"
        class="ml-3"
        color="secondary"
        variant="outlined"
      >
        {{ rawContent.length }} строк
      </v-chip>
      
      <v-spacer></v-spacer>
      
      <v-btn
        v-if="rawContent && Array.isArray(rawContent) && rawContent.length > 0"
        color="success"
        variant="outlined"
        prepend-icon="mdi-download"
        @click="exportToTXT"
      >
        Экспорт TXT
      </v-btn>
    </v-card-title>
    
    <v-card-text>
      <!-- Поиск -->
      <v-text-field
        v-model="searchQuery"
        prepend-inner-icon="mdi-magnify"
        label="Поиск в тексте"
        variant="outlined"
        density="compact"
        class="mb-4"
        clearable
      ></v-text-field>

      <!-- Фильтры -->
      <v-row class="mb-4">
        <v-col cols="12" md="4">
          <v-select
            v-model="sortBy"
            :items="sortOptions"
            label="Сортировка"
            variant="outlined"
            density="compact"
          ></v-select>
        </v-col>
        <v-col cols="12" md="4">
          <v-text-field
            v-model="minLength"
            type="number"
            label="Мин. длина строки"
            variant="outlined"
            density="compact"
            min="0"
          ></v-text-field>
        </v-col>
        <v-col cols="12" md="4">
          <v-switch
            v-model="showEmptyLines"
            label="Показать пустые строки"
            color="primary"
          ></v-switch>
        </v-col>
      </v-row>

      <!-- Данные -->
      <div v-if="filteredContent.length > 0">
        <v-list class="elevation-1 rounded">
          <v-list-item
            v-for="(line, index) in paginatedContent"
            :key="(currentPage - 1) * itemsPerPage + index"
            :class="{ 'highlighted': isHighlighted(line) }"
          >
            <template v-slot:prepend>
              <v-chip
                size="small"
                color="primary"
                variant="outlined"
                class="mr-2"
              >
                {{ (currentPage - 1) * itemsPerPage + index + 1 }}
              </v-chip>
            </template>
            
            <v-list-item-title
              class="text-body-1"
              :class="{ 'text-highlight': isHighlighted(line) }"
            >
              {{ line }}
            </v-list-item-title>
            
            <template v-slot:append>
              <v-chip
                size="small"
                :color="getLineColor(line)"
                variant="tonal"
              >
                {{ line.length }} симв.
              </v-chip>
            </template>
          </v-list-item>
        </v-list>

        <!-- Пагинация -->
        <v-pagination
          v-model="currentPage"
          :length="totalPages"
          :total-visible="7"
          class="mt-4"
        ></v-pagination>
      </div>

      <!-- Пустое состояние -->
      <v-alert
        v-else
        type="info"
        variant="tonal"
        class="text-center"
      >
        <v-icon class="mb-2" size="large">mdi-information</v-icon>
        <div>Нет данных для отображения</div>
        <div class="text-caption">
          {{ searchQuery ? 'Попробуйте изменить параметры поиска' : 'Данные не загружены' }}
        </div>
      </v-alert>
    </v-card-text>
  </v-card>
</template>

<script>
export default {
  name: 'RawContentDisplay',
  props: {
    rawContent: {
      type: [Array, String],
      default: null
    }
  },
  data() {
    return {
      searchQuery: '',
      sortBy: 'original',
      minLength: 0,
      showEmptyLines: true,
      currentPage: 1,
      itemsPerPage: 20
    }
  },
  computed: {
    sortOptions() {
      return [
        { title: 'По порядку', value: 'original' },
        { title: 'По длине (возр.)', value: 'length-asc' },
        { title: 'По длине (убыв.)', value: 'length-desc' },
        { title: 'По алфавиту', value: 'alphabetical' }
      ]
    },
    
    processedContent() {
      if (!this.rawContent) return []
      
      let content = Array.isArray(this.rawContent) ? this.rawContent : [this.rawContent]
      
      // Фильтрация по длине
      if (this.minLength > 0) {
        content = content.filter(line => line.length >= this.minLength)
      }
      
      // Фильтрация пустых строк
      if (!this.showEmptyLines) {
        content = content.filter(line => line.trim().length > 0)
      }
      
      // Сортировка
      switch (this.sortBy) {
        case 'length-asc':
          content = [...content].sort((a, b) => a.length - b.length)
          break
        case 'length-desc':
          content = [...content].sort((a, b) => b.length - a.length)
          break
        case 'alphabetical':
          content = [...content].sort((a, b) => a.localeCompare(b, 'ru'))
          break
        default:
          // original - оставляем как есть
          break
      }
      
      return content
    },
    
    filteredContent() {
      if (!this.searchQuery) {
        return this.processedContent
      }
      
      const query = this.searchQuery.toLowerCase()
      return this.processedContent.filter(line => 
        line.toLowerCase().includes(query)
      )
    },
    
    totalPages() {
      return Math.ceil(this.filteredContent.length / this.itemsPerPage)
    },
    
    paginatedContent() {
      const start = (this.currentPage - 1) * this.itemsPerPage
      const end = start + this.itemsPerPage
      return this.filteredContent.slice(start, end)
    }
  },
  
  watch: {
    searchQuery() {
      this.currentPage = 1
    },
    sortBy() {
      this.currentPage = 1
    },
    minLength() {
      this.currentPage = 1
    },
    showEmptyLines() {
      this.currentPage = 1
    }
  },
  
  methods: {
    isHighlighted(line) {
      if (!this.searchQuery) return false
      return line.toLowerCase().includes(this.searchQuery.toLowerCase())
    },
    
    getLineColor(line) {
      if (line.length === 0) return 'grey'
      if (line.length < 10) return 'warning'
      if (line.length < 50) return 'info'
      if (line.length < 100) return 'primary'
      return 'success'
    },
    
    exportToTXT() {
      if (!this.rawContent || !Array.isArray(this.rawContent)) return
      
      const content = this.rawContent.join('\n')
      const blob = new Blob([content], { type: 'text/plain;charset=utf-8;' })
      const link = document.createElement('a')
      const url = URL.createObjectURL(blob)
      link.setAttribute('href', url)
      link.setAttribute('download', `raw_text_${new Date().toISOString().split('T')[0]}.txt`)
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    }
  }
}
</script>

<style scoped>
.highlighted {
  background-color: rgba(255, 193, 7, 0.1);
}

.text-highlight {
  background-color: rgba(255, 193, 7, 0.3);
  padding: 2px 4px;
  border-radius: 4px;
}

.v-list-item {
  border-bottom: 1px solid #e0e0e0;
}

.v-list-item:last-child {
  border-bottom: none;
}
</style>
