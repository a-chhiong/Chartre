import { defineConfig } from 'vite';
import { readFileSync } from 'fs';
import { execSync } from 'child_process';

// Dynamically read PlantUML engine package metadata
const plantumlPkg = JSON.parse(readFileSync(new URL('./node_modules/@plantuml/core/package.json', import.meta.url), 'utf-8'));

// Dynamically resolve the Git commit hash and build time of the `@plantuml/core` package
let plantumlCommit = 'unknown';
let plantumlBuildTime = 'unknown';
try {
  const metadata = JSON.parse(execSync(`npm show @plantuml/core@${plantumlPkg.version} --json`, {
    timeout: 2000,
    stdio: ['ignore', 'pipe', 'ignore']
  }).toString());
  if (metadata.gitHead) {
    plantumlCommit = metadata.gitHead.slice(0, 7);
  }
  if (metadata.time && metadata.time[plantumlPkg.version]) {
    const date = new Date(metadata.time[plantumlPkg.version]);
    if (!isNaN(date.getTime())) {
      plantumlBuildTime = date.toISOString().replace('T', ' ').substring(0, 19) + ' UTC';
    }
  }
} catch (e) {
  // Fallback if npm registry is not reachable or command fails
}

export default defineConfig({
  base: '/Chartre/',
  define: {
    __PLANTUML_VERSION__: JSON.stringify(plantumlPkg.version),
    __PLANTUML_COMMIT__: JSON.stringify(plantumlCommit || 'unknown'),
    __PLANTUML_BUILD_TIME__: JSON.stringify(plantumlBuildTime || 'unknown')
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