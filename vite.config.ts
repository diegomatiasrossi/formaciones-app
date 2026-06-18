import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Resolve the src alias without requiring @types/node.
// import.meta.url gives file:///C:/.../ on Windows; pathname includes a leading slash.
function srcAlias() {
  const url = new URL('./src', import.meta.url)
  // On Windows: /C:/path/src  → strip the leading slash so Windows paths work correctly
  const p = url.pathname
  return /^\/[A-Za-z]:\//.test(p) ? p.slice(1) : p
}

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
  resolve: {
    alias: {
      '@': srcAlias(),
    },
  },
  build: {
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output: {
        manualChunks: {
          konva: ['konva', 'react-konva'],
          vendor: ['react', 'react-dom', 'react-router-dom'],
          i18n: ['react-i18next', 'i18next'],
          zustand: ['zustand'],
        },
      },
    },
  },
})
