import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  // IMPORTANT:
  // Do NOT force a global esbuild loader of "jsx" for TS/TSX files.
  // That breaks TypeScript syntax like "pageName: string" and causes the
  // "Unexpected token :" / "Expected ) but found :" errors you were seeing.
  esbuild: {
    jsx: 'automatic',
  },
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
    proxy: {
      '/api': 'http://127.0.0.1:5050',
    },
  },
})
