import React from 'react';
import ReactDOM from 'react-dom/client';
import { AppRoot } from './core';
import { initIntegrations } from './core/integrations/integrationHost';
import { initJobs, stopJobs } from './core/jobs/jobHost';
import { syncEntitlementsFromStore } from './core/billing';

let bootstrapped = false;

const bootstrap = (): void => {
  if (bootstrapped) {
    return;
  }

  initIntegrations();
  initJobs();
  syncEntitlementsFromStore();
  bootstrapped = true;
};

bootstrap();

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

ReactDOM.createRoot(container).render(<AppRoot />);
