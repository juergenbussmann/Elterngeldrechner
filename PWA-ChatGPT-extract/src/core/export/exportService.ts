/**
 * Export-Service: PDF-Generator und Share/Download.
 */

import type { ExportPayload } from './exportTypes';

/** Text aus Export-Payload extrahieren (MVP). */
function payloadToText(payload: ExportPayload): string {
  const { scope, data } = payload;
  const lines: string[] = [`Export: ${scope}`, '', new Date().toLocaleString('de-DE'), ''];

  if (scope === 'checklists' && data && typeof data === 'object') {
    const d = data as Record<string, unknown>;
    if (d.schwangerschaft && typeof d.schwangerschaft === 'object') {
      const s = d.schwangerschaft as { items?: Record<string, boolean> };
      lines.push('Checkliste Schwangerschaft');
      if (s.items) {
        Object.entries(s.items).forEach(([id, checked]) => {
          lines.push(`  - ${id}: ${checked ? '✓' : '○'}`);
        });
      }
      lines.push('');
    }
    if (d.geburt && typeof d.geburt === 'object') {
      const g = d.geburt as { items?: Record<string, boolean> };
      lines.push('Checkliste Geburt');
      if (g.items) {
        Object.entries(g.items).forEach(([id, checked]) => {
          lines.push(`  - ${id}: ${checked ? '✓' : '○'}`);
        });
      }
      lines.push('');
    }
    if (d.stillen && typeof d.stillen === 'object') {
      const s = d.stillen as { items?: Record<string, boolean> };
      lines.push('Checkliste Stillen');
      if (s.items) {
        Object.entries(s.items).forEach(([id, checked]) => {
          lines.push(`  - ${id}: ${checked ? '✓' : '○'}`);
        });
      }
      lines.push('');
    }
    if (d.custom && typeof d.custom === 'object') {
      const c = d.custom as { title?: string; items?: Array<{ id: string; text: string; done: boolean }> };
      lines.push(c.title ?? 'Checkliste');
      if (c.items && Array.isArray(c.items)) {
        c.items.forEach((item) => {
          lines.push(`  - ${item.text}: ${item.done ? '✓' : '○'}`);
        });
      }
      lines.push('');
    }
  }

  if (scope === 'appointments' && Array.isArray(data)) {
    lines.push('Termine');
    data.forEach((a: unknown, i: number) => {
      const item = a as Record<string, unknown>;
      lines.push(`  ${i + 1}. ${item.title ?? item.name ?? 'Termin'}`);
    });
    lines.push('');
  }

  if (scope === 'contacts' && Array.isArray(data)) {
    lines.push('Kontakte');
    data.forEach((c: unknown, i: number) => {
      const item = c as Record<string, unknown>;
      lines.push(`  ${i + 1}. ${item.name ?? item.title ?? 'Kontakt'}`);
    });
    lines.push('');
  }

  if (lines.length <= 4) {
    lines.push('Keine Daten zum Exportieren.');
  }

  return lines.join('\n');
}

/** PDF-Text escapen: Klammern und Backslash. */
function escapePdfString(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

/** Minimales gültiges PDF mit Text-Inhalt erzeugen (technisch valide, keine externe Library). */
function buildMinimalPdf(text: string): string {
  const lines = text.split('\n');
  const contentParts = lines.map((line) => {
    const escaped = escapePdfString(line || ' ');
    return `(${escaped}) Tj T*`;
  });
  const contentStream = `BT
/F1 12 Tf
12 TL
20 750 Td
${contentParts.join('\n')}
ET`;
  const contentLen = contentStream.length;

  const obj1 = `1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
`;
  const obj2 = `2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
`;
  const obj3 = `3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>
endobj
`;
  const obj4 = `4 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj
`;
  const obj5 = `5 0 obj
<< /Length ${contentLen} >>
stream
${contentStream}
endstream
endobj
`;

  const header = '%PDF-1.4\n';
  const body = obj1 + obj2 + obj3 + obj4 + obj5;
  let offset = header.length;
  const objStarts = [offset];
  offset += obj1.length;
  objStarts.push(offset);
  offset += obj2.length;
  objStarts.push(offset);
  offset += obj3.length;
  objStarts.push(offset);
  offset += obj4.length;
  objStarts.push(offset);
  offset += obj5.length;
  objStarts.push(offset);

  const xrefBody = `0 6
0000000000 65535 f
${objStarts
  .slice(1)
  .map((o) => String(o).padStart(10, '0') + ' 00000 n')
  .join('\n')}
`;
  const xref = `xref
${xrefBody}trailer
<< /Size 6 /Root 1 0 R >>
startxref
${offset}
%%EOF`;

  return header + body + xref;
}

/**
 * Erzeugt ein einfaches PDF als Blob (MVP ohne externe Library).
 */
export async function generatePdf(payload: ExportPayload): Promise<Blob> {
  const text = payloadToText(payload);
  const pdfString = buildMinimalPdf(text);
  const encoder = new TextEncoder();
  const bytes = encoder.encode(pdfString);
  return new Blob([bytes], { type: 'application/pdf' });
}

/**
 * Teilt die Datei via Web Share API oder lädt sie als Fallback herunter.
 */
export async function shareOrDownload(blob: Blob, filename: string): Promise<void> {
  const file = new File([blob], filename, { type: 'application/pdf' });

  if (
    typeof navigator.share === 'function' &&
    typeof navigator.canShare === 'function' &&
    navigator.canShare({ files: [file] })
  ) {
    await navigator.share({
      title: filename.replace(/\.pdf$/i, ''),
      files: [file],
    });
    return;
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
