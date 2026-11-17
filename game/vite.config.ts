import { defineConfig } from 'vite';

// base './' : Capacitor(안드로이드 WebView)에서 file 경로로도 로드되도록 상대 경로 사용
export default defineConfig({ base: './', build: { chunkSizeWarningLimit: 2000, rollupOptions: { input: { main: 'index.html', design: 'design.html' } } } });
