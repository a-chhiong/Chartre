import { defineConfig } from 'vite';
import { readFileSync } from 'fs';
import { execSync } from 'child_process';

// Dynamically read PlantUML engine package metadata
const plantumlPkg = JSON.parse(readFileSync(new URL('./node_modules/@plantuml/core/package.json', import.meta.url), 'utf-8'));

// Dynamically resolve the Git commit hash of the repository
let gitCommit = 'release';
try {
  gitCommit = execSync('git rev-parse --short HEAD').toString().trim();
} catch (e) {
  // Fallback to release if git is not available or initialized
}

export default defineConfig({
  base: '/Chartre/',
  define: {
    __PLANTUML_VERSION__: JSON.stringify(plantumlPkg.version),
    __PLANTUML_COMMIT__: JSON.stringify(gitCommit)
  },
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