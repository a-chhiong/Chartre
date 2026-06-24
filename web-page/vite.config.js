import { defineConfig } from 'vite';

export default defineConfig({
  base: '/Chartre/',
  server: {
    port: 3000,
    open: true
  },
  build: {
    // 1. Tell Vite to use Terser instead of esbuild.
    // Terser safely compresses the Graphviz C++ loops without breaking them!
    minify: 'terser',
    
    // 2. (Optional but recommended) Keep the manual chunk so your 
    // initial app load is still lightning fast, and Graphviz loads separately.
    rollupOptions: {
      output: {
        manualChunks: {
          'viz-engine': ['@plantuml/core/viz-global.js']
        }
      }
    }
  }
});