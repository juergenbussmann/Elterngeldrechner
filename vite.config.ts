import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { pwaOptions } from './src/core/pwa/config';

// Skeleton v1 – Vite basisconfiguratie met PWA-ondersteuning
export default defineConfig({
  base: '/',
  server: {
    port: 5173,
    strictPort: true,
  },
  plugins: [
    react(),
    VitePWA({
      ...pwaOptions,
      // In dev: disable service worker to avoid caching/localhost port confusion
      devOptions: { enabled: false },
    }),
  ],
});
