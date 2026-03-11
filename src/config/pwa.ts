import {
  APP_BRAND,
  THEME_COLOR,
  BACKGROUND_COLOR
} from './appConfig';

export const pwaManifest = {
  name: APP_BRAND.appName,
  short_name: APP_BRAND.shortName,
  description: APP_BRAND.description,
  theme_color: APP_BRAND.primaryColor || THEME_COLOR,
  background_color: BACKGROUND_COLOR,
  display: 'standalone',
  start_url: '/',
  id: '/',
  orientation: 'portrait',
  icons: [
    {
      src: '/brand/icon-192.png',
      sizes: '192x192',
      type: 'image/png'
    },
    {
      src: '/brand/icon-512.png',
      sizes: '512x512',
      type: 'image/png'
    }
  ]
} as const;
