import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    allowedHosts: ['.ngrok-free.dev'],
    watch: {
      ignored: [
        '**/server/**',
        '**/*.db*',
        '**/*.db-wal',
        '**/*.db-shm',
        '**/.quota_cache.json',
      ],
    },
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
})