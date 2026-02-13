import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  base: process.env.GITHUB_PAGES ? '/Simulador-de-Mercados/' : '/',
  root: '.',
  publicDir: 'public',
  resolve: {
    alias: {
      '@engine': resolve(__dirname, 'src/engine'),
      '@ui': resolve(__dirname, 'src/ui'),
      '@tests': resolve(__dirname, 'src/__tests__'),
    },
  },
  build: {
    outDir: 'dist',
    target: 'esnext',
  },
  worker: {
    format: 'es',
  },
  server: {
    port: 5173,
    open: true,
  },
});
