import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { pwaOptions } from './src/core/pwa/config';

// PWA/Service Worker: für Web-Deploy aktiv. Für Android-Embed setzt `scripts/npm-run-build-with-embed-android.mjs`
// VITE_EMBED_FOR_CAPACITOR=1 vor `npm run build` (gleicher Vite-Lauf wie Web, ohne PWA im Bundle).
const embedForCapacitor = process.env.VITE_EMBED_FOR_CAPACITOR === '1';

export default defineConfig(() => ({
  base: '/',
  server: {
    port: 5173,
    strictPort: true,
  },
  plugins: [
    react(),
    ...(embedForCapacitor
      ? []
      : [
          VitePWA({
            ...pwaOptions,
            devOptions: { enabled: false },
          }),
        ]),
  ],
}));
