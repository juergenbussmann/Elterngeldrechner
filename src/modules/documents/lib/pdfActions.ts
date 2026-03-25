/**
 * Robuste PDF-/Blob-Aktionen: Öffnen, Herunterladen, Teilen.
 * Nutzt Blob-URL mit sauberer Freigabe, keine window.open-Hacks.
 */

import { FileOpener } from '@capacitor-community/file-opener';
import { Directory, Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

/** Schmale Viewports: PDF „Öffnen“ per Share/Download statt _blank (plattformüblich auf Mobilgeräten). */
export function isMobilePdfOpenHeuristic(): boolean {
  if (typeof window === 'undefined') return false;
  return window.innerWidth <= 768;
}

let pdfDiagnosticContextLogged = false;

async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const data = reader.result;
      if (typeof data !== 'string') {
        reject(new Error('FileReader: unexpected result type'));
        return;
      }
      const comma = data.indexOf(',');
      const base64 = comma >= 0 ? data.slice(comma + 1) : data;
      resolve(base64);
    };
    reader.onerror = () => reject(reader.error ?? new Error('FileReader error'));
    reader.readAsDataURL(blob);
  });
}

/**
 * APK/Capacitor: PDF im Cache speichern und mit installierter App öffnen (IntentVIEW), nicht Share-Link.
 */
export async function openPdfNative(blob: Blob, filename: string): Promise<void> {
  console.info('[pdf] native:open:start', { filename });

  const base64 = await blobToBase64(blob);
  const safeName = filename.replace(/[/\\]/g, '_').trim() || 'document.pdf';
  const path = `${Date.now()}-${safeName}`;

  await Filesystem.writeFile({
    path,
    data: base64,
    directory: Directory.Cache,
    recursive: true,
  });

  const { uri } = await Filesystem.getUri({
    path,
    directory: Directory.Cache,
  });

  console.info('[pdf] native:open:uri', { uri });

  await FileOpener.open({
    filePath: uri,
    contentType: 'application/pdf',
  });

  console.info('[pdf] native:open:success');
}

/**
 * APK/Capacitor: PDF als Datei im nativen Cache schreiben und System-Share öffnen (kein WebView-Blob-Download).
 */
export async function sharePdfNative(blob: Blob, filename: string): Promise<void> {
  console.info('[pdf] native:start', { filename });

  const base64 = await blobToBase64(blob);
  const safeName = filename.replace(/[/\\]/g, '_').trim() || 'document.pdf';
  const filePath = `${Date.now()}-${safeName}`;

  console.info('[pdf] native:write:start', { filePath });

  await Filesystem.writeFile({
    path: filePath,
    data: base64,
    directory: Directory.Cache,
    recursive: true,
  });

  console.info('[pdf] native:write:success', { filePath });

  const { uri } = await Filesystem.getUri({
    path: filePath,
    directory: Directory.Cache,
  });

  console.info('[pdf] native:share:invoke', { uri });

  await Share.share({
    title: safeName,
    url: uri,
  });

  console.info('[pdf] native:share:success');
}

function logPdfDiagnosticContextOnce(): void {
  if (pdfDiagnosticContextLogged || typeof window === 'undefined' || typeof navigator === 'undefined') return;
  pdfDiagnosticContextLogged = true;
  console.info('[pdf] context', {
    userAgent: navigator.userAgent,
    width: window.innerWidth,
    isSecureContext: window.isSecureContext,
  });
}

/** WebViews (u. a. Android) ignorieren programmatische Klicks oft, wenn das <a> nicht im Dokument hängt. */
function clickAnchorInDocument(a: HTMLAnchorElement): void {
  const body = typeof document !== 'undefined' ? document.body : null;
  if (!body) {
    throw new Error('document.body missing');
  }
  a.style.display = 'none';
  body.appendChild(a);
  try {
    a.click();
  } finally {
    body.removeChild(a);
  }
}

/**
 * Öffnet einen Blob in neuem Tab (z. B. PDF).
 * Erzeugt temporäre Blob-URL, öffnet per Anchor mit target="_blank", gibt URL frei.
 */
export function openBlobInNewTab(blob: Blob, filename?: string): void {
  logPdfDiagnosticContextOnce();
  let url: string | undefined;
  try {
    console.info('[pdf] url:create:start', { op: 'open' });
    url = URL.createObjectURL(blob);
    console.info('[pdf] url:create:success', { url, op: 'open' });
    const a = document.createElement('a');
    a.href = url;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    console.info('[pdf] download-link:create', { op: 'open-tab' });
    console.info('[pdf] download-link:click', { op: 'open-tab' });
    clickAnchorInDocument(a);
    console.info('[pdf] link:click', { href: url, op: 'open-tab' });
  } catch (error) {
    console.error('[pdf] download-link:error', error);
    throw error;
  } finally {
    if (url) {
      console.info('[pdf] url:revoke', { op: 'open' });
      URL.revokeObjectURL(url);
    }
  }
}

/**
 * Löst einen Download des Blobs aus.
 * Erzeugt Blob-URL, triggert Download per Anchor, gibt URL frei.
 */
export function downloadBlob(blob: Blob, filename: string): void {
  logPdfDiagnosticContextOnce();
  let url: string | undefined;
  try {
    console.info('[pdf] download-link:create', { op: 'download', filename });
    url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || 'document.pdf';
    a.rel = 'noopener noreferrer';
    console.info('[pdf] download-link:click', { op: 'download' });
    clickAnchorInDocument(a);
    console.info('[pdf] link:click', { href: url, op: 'download' });
  } catch (error) {
    console.error('[pdf] download-link:error', error);
    throw error;
  } finally {
    if (url) {
      console.info('[pdf] url:revoke', { op: 'download' });
      URL.revokeObjectURL(url);
    }
  }
}

/**
 * Nutzt die Web Share API, falls verfügbar.
 * Gibt true zurück, wenn geteilt wurde, sonst false.
 */
export async function shareBlob(blob: Blob, title: string, filename: string): Promise<boolean> {
  logPdfDiagnosticContextOnce();
  console.info('[pdf] share:available', Boolean(typeof navigator !== 'undefined' && navigator.share));
  if (!navigator.share) return false;
  console.info('[pdf] share:invoke', { title, filename });
  try {
    const file = new File([blob], filename, { type: blob.type });
    await navigator.share({
      title,
      files: [file],
    });
    return true;
  } catch (error) {
    console.error('[pdf] share:error', error);
    return false;
  }
}

/**
 * Einheitlicher mobiler PDF-Übergabepfad: `navigator.share` mit File, sonst Download.
 * Kein `_blank`, kein Blob-Tab – nur native Share/Download.
 * (Wird auf Desktop zusätzlich für den „Teilen“-Button wiederverwendet – gleiche Sequenz.)
 */
export async function shareOrDownloadPdfMobile(
  blob: Blob,
  title: string,
  filename: string
): Promise<void> {
  console.info('[pdf] mobile:share-or-download:start', { title, filename });
  const ok = await shareBlob(blob, title, filename);
  if (!ok) {
    console.info('[pdf] mobile:share-or-download:fallback');
    downloadBlob(blob, filename);
  }
  console.info('[pdf] mobile:share-or-download:end');
}
