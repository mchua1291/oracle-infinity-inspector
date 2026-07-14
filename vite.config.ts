import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const rootDirectory = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        devtools: resolve(rootDirectory, 'devtools.html'),
        panel: resolve(rootDirectory, 'panel.html'),
        popup: resolve(rootDirectory, 'popup.html'),
        serviceWorker: resolve(rootDirectory, 'src/background/serviceWorker.ts'),
      },
      output: {
        entryFileNames: 'assets/[name].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setupTests.ts'],
    css: true,
    coverage: { reporter: ['text', 'html'] },
  },
});
