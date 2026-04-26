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
      src: '/icons/icon-192.png',
      sizes: '192x192',
      type: 'image/png',
      purpose: 'any'
    },
    {
      src: '/icons/icon-512.png',
      sizes: '512x512',
      type: 'image/png',
      purpose: 'any'
    },
    {
      src: '/icons/maskable-icon-192.png',
      sizes: '192x192',
      type: 'image/png',
      purpose: 'maskable'
    },
    {
      src: '/icons/maskable-icon-512.png',
      sizes: '512x512',
      type: 'image/png',
      purpose: 'maskable'
    }
  ]
} as const;
