/**
 * Robuste PDF-/Blob-Aktionen: Öffnen, Herunterladen, Teilen.
 * Nutzt Blob-URL mit sauberer Freigabe, keine window.open-Hacks.
 */

/**
 * Öffnet einen Blob in neuem Tab (z. B. PDF).
 * Erzeugt temporäre Blob-URL, öffnet per Anchor mit target="_blank", gibt URL frei.
 */
export function openBlobInNewTab(blob: Blob, filename?: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.target = '_blank';
  a.rel = 'noopener noreferrer';
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Löst einen Download des Blobs aus.
 * Erzeugt Blob-URL, triggert Download per Anchor, gibt URL frei.
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename || 'document.pdf';
  a.rel = 'noopener noreferrer';
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Nutzt die Web Share API, falls verfügbar.
 * Gibt true zurück, wenn geteilt wurde, sonst false.
 */
export async function shareBlob(blob: Blob, title: string, filename: string): Promise<boolean> {
  if (!navigator.share) return false;
  try {
    const file = new File([blob], filename, { type: blob.type });
    await navigator.share({
      title,
      files: [file],
    });
    return true;
  } catch {
    return false;
  }
}
