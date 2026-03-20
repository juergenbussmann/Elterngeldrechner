/**
 * Phase-spezifische Synonyme und Kontextwörter für Query Expansion.
 * Wenn der User z.B. "andocken" schreibt, erweitern wir intern um "anlegen".
 * Keine KI – reine Mappings pro Phase.
 *
 * Diese Datei enthält nur die Synonym-Tabellen, die eigentliche
 * Query-Expansion passiert in `expandQuery.ts`.
 */

/** Map: Schlüsselbegriff -> Liste von Synonymen / Trigger-Phrasen */
export type SynonymMap = Record<string, string[]>;

export const breastfeedingSynonyms: SynonymMap = {
  anlegen: [
    'anlegen',
    'andocken',
    'brust anlegen',
    'baby anlegen',
    'baby an die brust',
    'an die brust legen',
    'stillposition',
  ],
  brust: ['brust', 'brustwarze', 'wunde brustwarze', 'schmerzende brust'],
  milch: ['milch', 'stillen', 'milchstau', 'abpumpen'],
  milchstau: ['milchstau', 'harte brust', 'rote brust', 'entzündung', 'mastitis'],
  mastitis: ['mastitis', 'entzündung', 'brustentzündung', 'fieber', 'schüttelfrost'],
  abpumpen: ['abpumpen', 'pumpen', 'milch abpumpen', 'handentleeren'],
  saugverwirrung: [
    'saugverwirrung',
    'saugerverwirrung',
    'flasche',
    'schnuller',
    'stillhütchen',
    'nimmt die brust nicht',
    'baby schreit an der brust',
  ],
  trinkt_nicht: [
    'trinkt nicht',
    'trinkt schlecht',
    'will nicht trinken',
    'nimmt die brust nicht',
    'nimmt brust nicht',
    'baby verweigert brust',
    'baby schreit an der brust',
  ],
  schreit: ['schreit', 'schreit an der brust', 'schreit beim stillen', 'schreien', 'unruhig'],
  baby: ['baby', 'kind', 'neugeborenes'],
};

export const birthSynonyms: SynonymMap = {
  wehen: ['wehen', 'geburt', 'schmerz', 'geburtsverlauf'],
  blutung: ['blutung', 'nachgeburt', 'bluten', 'arzt'],
  naht: ['naht', 'dammriss', 'damm', 'heilung'],
  damm: ['damm', 'naht', 'dammriss', 'geburt'],
  schmerz: ['schmerz', 'wehen', 'geburt'],
  hebamme: ['hebamme', 'geburt', 'unterstützung', 'bindung'],
  bonding: ['bonding', 'bindung', 'hautkontakt', 'stillstart'],
  hautkontakt: ['hautkontakt', 'bonding', 'stillstart', 'geburt'],
  nabelschnur: ['nabelschnur', 'auspulsieren', 'übergang', 'geburt'],
  nachgeburt: ['nachgeburt', 'plazenta', 'geburt'],
  plazenta: ['plazenta', 'nachgeburt', 'geburt'],
};

export const pregnancySynonyms: SynonymMap = {
  uebelkeit: ['übelkeit', 'erbrechen', 'morgendliche übelkeit', 'schwangerschaftsübelkeit', 'brechreiz'],
  rueckenschmerzen: ['rückenschmerzen', 'rücken', 'kreuzschmerzen', 'lendenwirbel', 'verspannung'],
  kindsbewegungen: ['kindsbewegungen', 'baby bewegt sich', 'tritt', 'strampeln', 'bewegung im bauch'],
  vorsorge: ['vorsorge', 'untersuchung', 'ultraschall', 'kontrolle', 'arzttermin', 'frauenarzt'],
  vorwehen: ['vorwehen', 'übungwehen', 'braxton hicks', 'harte bauchdecke'],
  blutung: ['blutung', 'schmierblutung', 'blutverlust'],
  wasser: ['fruchtwasser', 'blasensprung', 'wasser geht ab'],
  sodbrennen: ['sodbrennen', 'brennen im hals', 'magendruck'],
  muedigkeit: ['müdigkeit', 'erschöpft', 'kraftlos'],
  gewicht: ['gewichtszunahme', 'zunehmen', 'gewicht'],
  beckenboden: ['beckenboden', 'beckenbodentraining', 'dammvorbereitung'],
};

/**
 * Notfall-/Signalwörter, die ein erhöhtes Ranking erhalten sollen.
 * Diese werden nach `normalize()` geprüft (lowercase, Umlaute normalisiert).
 */
export const urgencySignals: string[] = [
  'fieber',
  'hohes fieber',
  'entzündung',
  'mastitis',
  'blutung',
  'starke schmerzen',
  'baby trinkt nicht',
  'verweigert brust',
  'atemnot',
  'dehydriert',
  'apathisch',
];
