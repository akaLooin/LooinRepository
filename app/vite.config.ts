import { defineConfig } from 'vite';
import { resolve } from 'node:path';

export default defineConfig({
  base: './',
  build: {
    rollupOptions: {
      // dev pages (design/art/icon) only when PAGES=all, so the app bundle stays small
      input: process.env.PAGES === 'all'
        ? { main: resolve(__dirname, 'index.html'), design: resolve(__dirname, 'design.html'), art: resolve(__dirname, 'art.html'), icon: resolve(__dirname, 'icon.html') }
        : { main: resolve(__dirname, 'index.html') },
    },
  },
});
