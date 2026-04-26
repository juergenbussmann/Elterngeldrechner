import { pwaManifest } from '../../config/pwa';

export const pwaOptions = {
  registerType: 'autoUpdate',
  manifest: pwaManifest,
  includeAssets: [
    'icons/icon-192.png',
    'icons/icon-512.png',
    'icons/maskable-icon-192.png',
    'icons/maskable-icon-512.png',
    'brand/baby-fade.png'
  ],
  workbox: {
    globPatterns: ['**/*.{js,css,html,ico,png,svg,webmanifest,jpg,jpeg,webp}'],
    navigateFallback: 'index.html', // Offline UI handled in React (AppShell + OfflineScreen)
  },
  devOptions: {
    enabled: true
  }
} as const;
