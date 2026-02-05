import path from 'path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react-router')) return 'router'
            if (id.includes('@supabase')) return 'supabase'
            if (id.includes('react-day-picker') || id.includes('date-fns')) return 'date'
            if (id.includes('radix-ui') || id.includes('lucide-react') || id.includes('class-variance') || id.includes('clsx') || id.includes('tailwind-merge')) return 'ui'
            return 'vendor'
          }
        },
      },
    },
    chunkSizeWarningLimit: 600,
  },
})
