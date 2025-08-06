const { defineConfig } = require('@vue/cli-service')

module.exports = defineConfig({
  transpileDependencies: true,
  lintOnSave: false, // Отключаем ESLint при сохранении
  devServer: {
    port: 8080,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true
      }
    }
  },
  outputDir: 'dist',
  publicPath: process.env.NODE_ENV === 'production' ? './' : '/'
}) 