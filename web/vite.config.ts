import path from 'node:path';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': path.resolve(import.meta.dirname, './src') },
  },
  server: {
    // The worker (wrangler dev) serves /api on 8787, WebSockets included.
    proxy: { '/api': { target: 'http://localhost:8787', ws: true } },
  },
});
