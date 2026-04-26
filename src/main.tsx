import { Capacitor } from '@capacitor/core';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { AppRoot } from './core';
import { initIntegrations } from './core/integrations/integrationHost';
import { initJobs, stopJobs } from './core/jobs/jobHost';

let bootstrapped = false;

const bootstrap = (): void => {
  if (bootstrapped) {
    return;
  }

  initIntegrations();
  initJobs();
  bootstrapped = true;
};

/** Frühere APK-Builds mit PWA-Service-Worker: abmelden, damit keine alten gecachten Bundles mehr greifen. */
async function unregisterServiceWorkersOnNative(): Promise<void> {
  if (!Capacitor.isNativePlatform() || !('serviceWorker' in navigator)) return;
  const timeoutMs = 5000;
  try {
    const regs = await Promise.race([
      navigator.serviceWorker.getRegistrations(),
      new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('getRegistrations timeout')), timeoutMs);
      }),
    ]);
    await Promise.all(regs.map((r) => r.unregister()));
  } catch {
    /* Timeout/Fehler: App darf nicht blockieren */
  }
}

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    stopJobs();
    bootstrapped = false;
  });
}

const container = document.getElementById('root');

if (!container) {
  throw new Error('Root container missing in index.html');
}

void unregisterServiceWorkersOnNative().finally(() => {
  bootstrap();
  ReactDOM.createRoot(container).render(<AppRoot />);
});
