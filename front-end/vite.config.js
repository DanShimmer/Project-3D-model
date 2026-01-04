import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  esbuild: {
    loader: 'jsx',
    include: /src\/.*\.jsx?$/,
    exclude: [],
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom', 'framer-motion', 'axios'],
    esbuildOptions: {
      loader: {
        '.js': 'jsx',
      },
    },
  },
  server: {
    port: 3000,
    hmr: { overlay: false },  // Disable error overlay for better performance
    watch: {
      usePolling: false      // Disable polling for better performance
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: false,        // Disable source maps in production
    minify: 'esbuild',       // Use faster esbuild minifier
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          ui: ['framer-motion', 'lucide-react']
        }
      }
    }
  }
})