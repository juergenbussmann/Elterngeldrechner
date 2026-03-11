/**
 * Tipp des Tages – tägliche Aktualisierung um 03:00 Uhr (lokale Zeit).
 * Deterministische Auswahl, offline-fähig, localStorage-Persistenz.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { TIPS_OF_DAY, type TipOfDay } from '../../../data/tipsOfDay.de';

const STORAGE_KEYS = {
  lastTipDayKey: 'stillberatung_lastTipDayKey',
  lastTipId: 'stillberatung_lastTipId',
} as const;

/**
 * Debug: Simuliere „Tageswechsel nach 03:00“ – setze z.B. in der Konsole:
 *   window.__TIP_3AM_OFFSET = 5   // +5 Stunden → simuliert „jetzt ist nach 03:00“
 * Seite neu laden, um den Tipp für den simulierten Tag zu sehen.
 */
const DEBUG_3AM_OFFSET_HOURS =
  typeof window !== 'undefined' && (window as unknown as { __TIP_3AM_OFFSET?: number }).__TIP_3AM_OFFSET;

/**
 * Berechnet den Tages-Schlüssel (YYYYMMDD) für die 03:00-Logik:
 * - Vor 03:00 Uhr → Vortag
 * - Ab 03:00 Uhr → heutiger Tag
 */
function getDayKey(date: Date): string {
  const d = new Date(date);
  if (DEBUG_3AM_OFFSET_HOURS != null) {
    d.setHours(d.getHours() + DEBUG_3AM_OFFSET_HOURS);
  }
  const hour = d.getHours();
  if (hour < 3) {
    d.setDate(d.getDate() - 1);
  }
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}${m}${day}`;
}

/**
 * Konvertiert dayKey (YYYYMMDD) zu einer Zahl für die Modulo-Berechnung.
 */
function dayKeyToNumber(dayKey: string): number {
  return parseInt(dayKey, 10);
}

/**
 * Wählt den Tipp des Tages deterministisch anhand dayKey.
 */
function selectTipForDayKey(tips: TipOfDay[], dayKey: string): TipOfDay {
  const n = dayKeyToNumber(dayKey);
  const index = Math.abs(n) % tips.length;
  return tips[index];
}

/**
 * Berechnet die Millisekunden bis zur nächsten 03:00 Uhr.
 */
function msUntilNext3AM(): number {
  const now = new Date();
  const next = new Date(now);
  next.setHours(3, 0, 0, 0);

  if (now >= next) {
    next.setDate(next.getDate() + 1);
  }
  return next.getTime() - now.getTime();
}

const TIPS_FILTERED = TIPS_OF_DAY.filter((t) => t.category === 'stillen');

export function useTipOfDay(): TipOfDay {
  const [tip, setTip] = useState<TipOfDay>(() => {
    if (typeof window === 'undefined') return TIPS_FILTERED[0];
    const dayKey = getDayKey(new Date());
    const selected = selectTipForDayKey(TIPS_FILTERED, dayKey);
    return selected;
  });

  const updateTip = useCallback(() => {
    const dayKey = getDayKey(new Date());
    const selected = selectTipForDayKey(TIPS_FILTERED, dayKey);

    try {
      const stored = localStorage.getItem(STORAGE_KEYS.lastTipDayKey);
      if (stored !== dayKey) {
        localStorage.setItem(STORAGE_KEYS.lastTipDayKey, dayKey);
        localStorage.setItem(STORAGE_KEYS.lastTipId, selected.id);
      }
    } catch {
      /* localStorage nicht verfügbar (Privatmodus etc.) */
    }

    setTip(selected);
  }, []);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    updateTip();

    const scheduleNext = () => {
      const ms = msUntilNext3AM();
      timerRef.current = setTimeout(() => {
        updateTip();
        scheduleNext();
      }, ms);
    };

    scheduleNext();
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [updateTip]);

  return tip;
}
