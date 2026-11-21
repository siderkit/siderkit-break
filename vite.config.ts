import { svelte } from '@sveltejs/vite-plugin-svelte';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [svelte()],
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
  },
  build: {
    target: 'es2022',
    rollupOptions: {
      input: {
        main: 'index.html',
        overlay: 'overlay.html',
        break: 'break.html',
        locate: 'locate.html',
      },
    },
  },
});
