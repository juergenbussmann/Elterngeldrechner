/**
 * ICS-Export für Kalender-Einträge (Erinnerungen via Kalender-Import).
 * Ohne Backend, keine Push-Notification.
 */

export interface CreateIcsForAppointmentArgs {
  id: string;
  title: string;
  startAt: string;
  endAt?: string;
  location?: string;
  description?: string;
  alarmMinutesBefore?: number;
}

const MIME = 'text/calendar;charset=utf-8';

/** ISO-Datum zu ICS-UTC (YYYYMMDDTHHMMSSZ). */
function toIcsUtc(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  const year = d.getUTCFullYear();
  const month = pad(d.getUTCMonth() + 1);
  const day = pad(d.getUTCDate());
  const hour = pad(d.getUTCHours());
  const min = pad(d.getUTCMinutes());
  const sec = pad(d.getUTCSeconds());
  return `${year}${month}${day}T${hour}${min}${sec}Z`;
}

/** ICS-Text escapen (Komma, Semikolon, Backslash). */
function escapeIcs(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
}

/**
 * Erzeugt gültigen ICS-Text für einen Termin (VCALENDAR + VEVENT + VALARM).
 */
export function createIcsForAppointment(args: CreateIcsForAppointmentArgs): {
  icsText: string;
  filename: string;
} {
  const {
    id,
    title,
    startAt,
    endAt,
    location,
    description,
    alarmMinutesBefore = 60,
  } = args;

  const uid = `${id}@elterngeldrechner.app`;
  const dtstamp = toIcsUtc(new Date().toISOString());
  const dtstart = toIcsUtc(startAt);
  const dtend = endAt ? toIcsUtc(endAt) : null;
  const summary = escapeIcs(title);
  const loc = location ? `LOCATION:${escapeIcs(location)}\r\n` : '';
  const desc = description ? `DESCRIPTION:${escapeIcs(description)}\r\n` : '';
  const trigger = `-PT${alarmMinutesBefore}M`;

  const crlf = '\r\n';
  const eventPart = [
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${dtstamp}`,
    `DTSTART:${dtstart}`,
    dtend ? `DTEND:${dtend}` : null,
    loc ? `LOCATION:${escapeIcs(location!)}` : null,
    desc ? `DESCRIPTION:${escapeIcs(description!)}` : null,
    `SUMMARY:${summary}`,
    'BEGIN:VALARM',
    `TRIGGER:${trigger}`,
    'ACTION:DISPLAY',
    'DESCRIPTION:Erinnerung',
    'END:VALARM',
    'END:VEVENT',
  ]
    .filter(Boolean)
    .join(crlf);

  const icsText = `BEGIN:VCALENDAR${crlf}VERSION:2.0${crlf}PRODID:-//Elterngeldrechner//DE${crlf}CALSCALE:GREGORIAN${crlf}${eventPart}${crlf}END:VCALENDAR`;

  const safeTitle = title.replace(/[^a-zA-Z0-9äöüÄÖÜß\-_ ]/g, '').slice(0, 50) || 'termin';
  const filename = `${safeTitle}.ics`;

  return { icsText, filename };
}

export interface CreateIcsForAppointmentsOptions {
  filename?: string;
}

/**
 * Erzeugt ICS mit mehreren Terminen (z.B. alle U-Checks, Bulk-Export).
 * Gibt uidsByAppointmentId zurück für Export-Status-Updates.
 */
export function createIcsForAppointments(
  events: CreateIcsForAppointmentArgs[],
  options?: CreateIcsForAppointmentsOptions
): {
  icsText: string;
  filename: string;
  uidsByAppointmentId: Record<string, string>;
} {
  const crlf = '\r\n';
  const eventParts: string[] = [];
  const uidsByAppointmentId: Record<string, string> = {};

  for (const args of events) {
    const {
      id,
      title,
      startAt,
      endAt: rawEndAt,
      location,
      description,
      alarmMinutesBefore = 60,
    } = args;

    const endAt = rawEndAt ?? (() => {
      const start = new Date(startAt);
      start.setMinutes(start.getMinutes() + 60);
      return start.toISOString();
    })();

    const uid = `${id || title}@elterngeldrechner.app`;
    if (id) {
      uidsByAppointmentId[id] = uid;
    }
    const dtstamp = toIcsUtc(new Date().toISOString());
    const dtstart = toIcsUtc(startAt);
    const dtend = endAt ? toIcsUtc(endAt) : null;
    const summary = escapeIcs(title);
    const trigger = `-PT${alarmMinutesBefore}M`;

    eventParts.push(
      [
        'BEGIN:VEVENT',
        `UID:${uid}`,
        `DTSTAMP:${dtstamp}`,
        `DTSTART:${dtstart}`,
        dtend ? `DTEND:${dtend}` : null,
        location ? `LOCATION:${escapeIcs(location)}` : null,
        description ? `DESCRIPTION:${escapeIcs(description)}` : null,
        `SUMMARY:${summary}`,
        'BEGIN:VALARM',
        `TRIGGER:${trigger}`,
        'ACTION:DISPLAY',
        'DESCRIPTION:Erinnerung',
        'END:VALARM',
        'END:VEVENT',
      ]
        .filter(Boolean)
        .join(crlf)
    );
  }

  const icsText = `BEGIN:VCALENDAR${crlf}VERSION:2.0${crlf}PRODID:-//Elterngeldrechner//DE${crlf}CALSCALE:GREGORIAN${crlf}${eventParts.join(crlf)}${crlf}END:VCALENDAR`;

  const filename = options?.filename ?? 'termine.ics';
  return { icsText, filename, uidsByAppointmentId };
}

/**
 * Teilt oder lädt eine Textdatei (ICS) via Web Share API oder Download.
 */
export async function shareOrDownloadIcs(icsText: string, filename: string): Promise<void> {
  const blob = new Blob([icsText], { type: MIME });
  const file = new File([blob], filename, { type: MIME });

  if (
    typeof navigator.share === 'function' &&
    typeof navigator.canShare === 'function' &&
    navigator.canShare({ files: [file] })
  ) {
    await navigator.share({
      title: filename.replace(/\.ics$/i, ''),
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
