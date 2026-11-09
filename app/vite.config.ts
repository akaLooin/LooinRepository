import { defineConfig } from 'vite';
import { resolve } from 'node:path';

export default defineConfig({
  base: './',
  build: {
    rollupOptions: {
      // dev pages (design/art/icon) only when PAGES=all, so the app bundle stays small
      // admin panel only when PAGES=all or VITE_ADMIN=1 (debug/test builds), never in store builds
      input: process.env.PAGES === 'all'
        ? { main: resolve(__dirname, 'index.html'), admin: resolve(__dirname, 'admin.html'), design: resolve(__dirname, 'design.html'), art: resolve(__dirname, 'art.html'), icon: resolve(__dirname, 'icon.html') }
        : process.env.VITE_ADMIN === '1'
          ? { main: resolve(__dirname, 'index.html'), admin: resolve(__dirname, 'admin.html') }
          : { main: resolve(__dirname, 'index.html') },
    },
  },
});
