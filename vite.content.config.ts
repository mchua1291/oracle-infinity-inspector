import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

const rootDirectory = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  build: {
    outDir: 'dist',
    emptyOutDir: false,
    rollupOptions: {
      input: resolve(rootDirectory, 'src/content/domScannerContentScript.ts'),
      output: {
        format: 'iife',
        entryFileNames: 'assets/contentScript.js',
        inlineDynamicImports: true,
      },
    },
  },
});
