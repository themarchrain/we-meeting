import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  },
  server: {
    host: '0.0.0.0', // 监听所有网卡
    port: 7749,
    proxy: {
      '/api': {
        target: 'http://localhost:6060',
        changeOrigin: true
      },
      '/ws': {
        target: 'ws://localhost:6061',
        ws: true,
        changeOrigin: true
      }
    }
  }
})
