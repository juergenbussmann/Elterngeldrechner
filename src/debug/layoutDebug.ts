export function logLayoutMetrics() {
  if (typeof window === 'undefined') {
    return;
  }

  const docEl = document.documentElement;
  const body = document.body;

  // Scroll- und Viewport-Metriken
  // Nur in der Dev-Console sichtbar
  console.groupCollapsed('[layout-debug] scroll metrics');
  console.log({
    docScrollHeight: docEl.scrollHeight,
    docClientHeight: docEl.clientHeight,
    bodyScrollHeight: body.scrollHeight,
    bodyClientHeight: body.clientHeight,
    windowInnerHeight: window.innerHeight,
    visualViewportHeight: window.visualViewport?.height,
  });

  const appShell = document.querySelector<HTMLElement>('.app-shell');
  const main = document.querySelector<HTMLElement>('.app-shell__main');
  const start = document.querySelector<HTMLElement>('.start');
  const footer = document.querySelector<HTMLElement>('.app-shell__footer');

  const logRect = (label: string, el: HTMLElement | null) => {
    if (!el) {
      console.log(`${label}: <not found>`);
      return;
    }
    const rect = el.getBoundingClientRect();
    console.log(label, {
      top: rect.top,
      bottom: rect.bottom,
      height: rect.height,
    });
  };

  logRect('.app-shell', appShell);
  logRect('.app-shell__main', main);
  logRect('.start', start);
  logRect('.app-shell__footer', footer);

  console.groupEnd();
}

