import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
  },
  build: {
    // Performance: minify with terser for smallest bundle
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.info'],
      },
    },
    // Performance: chunk splitting for better caching
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
        },
      },
    },
    // Performance: inline small assets
    assetsInlineLimit: 4096,
    // Performance: enable source maps only in dev
    sourcemap: false,
    // Performance: target modern browsers
    target: 'es2020',
    // Performance: CSS code splitting
    cssCodeSplit: true,
  },
})
