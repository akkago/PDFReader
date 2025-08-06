<template>
  <v-app>
    <v-app-bar
      app
      color="primary"
      dark
      elevation="2"
    >
      <v-app-bar-title>
        <v-icon class="mr-2">mdi-file-pdf-box</v-icon>
        PaddleOCR PDF Reader
      </v-app-bar-title>
    </v-app-bar>

    <v-main>
      <v-container fluid>
        <router-view />
      </v-container>
    </v-main>

    <v-footer
      app
      color="grey lighten-3"
      class="text-center"
    >
      <v-container>
        <span class="text-caption">
          © 2024 PaddleOCR PDF Reader. Распознавание текста с помощью PaddleOCR.
        </span>
      </v-container>
    </v-footer>
  </v-app>
</template>

<script>
export default {
  name: 'App'
}
</script>

<style>
#app {
  font-family: 'Roboto', sans-serif;
}

.v-main {
  background-color: #f5f5f5;
}
</style> 