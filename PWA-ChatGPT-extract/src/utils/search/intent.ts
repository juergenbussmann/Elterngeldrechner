import { normalize } from './normalize';

export type Intent = 'explain' | 'howto' | 'urgent' | 'general';

const explainSignals = [
  'warum',
  'wieso',
  'weshalb',
  'ursache',
  'gruende',
  'grund',
  'woher',
  'woran liegt',
  'wie kommt',
  'was steckt dahinter',
];

const howtoSignals = [
  'wie',
  'richtig',
  'anleitung',
  'schritt',
  'schritt fuer schritt',
  'so geht',
  'tipps',
  'was tun',
  'wie mache ich',
  'hilfe',
];

const urgentSignals = [
  'fieber',
  'hohes fieber',
  'blutung',
  'starke schmerzen',
  'atemnot',
  'entzundung',
  'entzündung',
  'baby trinkt nicht',
  'verweigert brust',
  'apathisch',
];

export function detectIntent(query: string): Intent {
  const q = normalize(query);
  if (!q) return 'general';

  // Urgent hat Vorrang
  if (urgentSignals.some((s) => q.includes(normalize(s)))) return 'urgent';

  // Erklärung: oft am Satzanfang
  if (explainSignals.some((s) => q.startsWith(normalize(s)) || q.includes(normalize(s))))
    return 'explain';

  // How-to: häufig "wie ..." / "was tun"
  if (howtoSignals.some((s) => q.startsWith(normalize(s)) || q.includes(normalize(s))))
    return 'howto';

  return 'general';
}

// Optional: erlaubt mehrere Intents (für spätere Erweiterung)
export function hasUrgency(query: string): boolean {
  const q = normalize(query);
  return urgentSignals.some((s) => q.includes(normalize(s)));
}

