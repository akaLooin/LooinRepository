import { defineConfig } from 'vite';
import { resolve } from 'node:path';

export default defineConfig({
  base: './',
  build: {
    rollupOptions: {
      input: { main: resolve(__dirname, 'index.html'), design: resolve(__dirname, 'design.html'), art: resolve(__dirname, 'art.html') },
    },
  },
});
