import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'de.elterngeldrechner.app',
  appName: 'Elterngeldrechner',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
};

export default config;
