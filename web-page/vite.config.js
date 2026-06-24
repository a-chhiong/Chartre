import { defineConfig } from 'vite';
import terser from '@rollup/plugin-terser';

export default defineConfig({
  base: '/Chartre/',
  server: {
    port: 3000,
    open: true
  },
  build: {
    // 1. Turn OFF Vite's default global "all-or-nothing" minifier
    minify: false, 

    rollupOptions: {
      // 2. Force the problematic Graphviz engine into its own predictable file
      output: {
        manualChunks: {
          'viz-engine': ['@plantuml/core/viz-global.js']
        }
      },
      // 3. Apply minification manually, explicitly excluding our new 'viz-engine' chunk
      plugins: [
        terser({
          exclude: [/viz-engine/] // This tells Terser: "Minify everything EXCEPT this file"
        })
      ]
    }
  }
});
