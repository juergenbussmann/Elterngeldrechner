/**
 * Tipp-des-Tages – Stillen-spezifische Tipps.
 * Quelle für die Tipp-Card auf der Stillen-Seite.
 * Offline-fähig, deterministische Tagesauswahl.
 */

export type TipOfDay = {
  id: string;
  title: string;
  body: string;
  tags?: string[];
  category: 'stillen';
};

export const TIPS_OF_DAY: TipOfDay[] = [
  {
    id: 'stillen-haut-an-haut',
    title: 'Die „Haut-an-Haut“-Verbindung',
    body: 'Wenn du dein Baby Brust an Brust hältst, fördert das Stillhormone und beruhigt euch beide.',
    tags: ['Hautkontakt', 'Oxytocin', 'Nähe'],
    category: 'stillen',
  },
  {
    id: 'stillen-haeufigkeit',
    title: 'Stillen nach Bedarf',
    body: 'In den ersten Wochen gilt: so oft dein Baby möchte. Häufiges Anlegen unterstützt die Milchbildung.',
    tags: ['Häufigkeit', 'Milchbildung', 'Angebot'],
    category: 'stillen',
  },
  {
    id: 'stillen-position',
    title: 'Entspannte Position finden',
    body: 'Lehne dich zurück und lass dein Baby auf deinem Bauch liegen. So findet es oft leichter zur Brust.',
    tags: ['Position', 'Laid-back', 'Entspannung'],
    category: 'stillen',
  },
  {
    id: 'stillen-ruhe',
    title: 'Ruhe beim Stillen',
    body: 'Dimme das Licht, vermeide Ablenkung. Eine ruhige Umgebung hilft dir und deinem Baby.',
    tags: ['Ruhe', 'Umgebung', 'Entspannung'],
    category: 'stillen',
  },
  {
    id: 'stillen-trinken',
    title: 'Ausreichend trinken',
    body: 'Dein Durstgefühl ist ein guter Kompass. Ein Glas Wasser in Reichweite beim Stillen hilft.',
    tags: ['Trinken', 'Durst', 'Flüssigkeit'],
    category: 'stillen',
  },
  {
    id: 'stillen-snacks',
    title: 'Kleine Snacks bereithalten',
    body: 'Stillen kostet Energie. Nährstoffreiche Snacks in Reichweite unterstützen dich im Alltag.',
    tags: ['Ernährung', 'Energie', 'Snacks'],
    category: 'stillen',
  },
  {
    id: 'stillen-mund',
    title: 'Mund weit öffnen lassen',
    body: 'Warte auf einen wirklich weiten Mund, bevor du anlegst. Das verhindert schmerzhaftes Ansaugen.',
    tags: ['Anlegen', 'Mundöffnung', 'Position'],
    category: 'stillen',
  },
  {
    id: 'stillen-wechsel',
    title: 'Beide Seiten anbieten',
    body: 'Biete bei jeder Mahlzeit beide Brüste an. So bleibt die Milchmenge ausgeglichen.',
    tags: ['Beidseitig', 'Milchmenge', 'Angebot'],
    category: 'stillen',
  },
  {
    id: 'stillen-stillecken',
    title: 'Still-Ecken einrichten',
    body: 'Ein Kissen, Wasser, Snack und Handy in Reichweite – kleine Vorbereitungen erleichtern das Stillen.',
    tags: ['Vorbereitung', 'Komfort', 'Alltag'],
    category: 'stillen',
  },
  {
    id: 'stillen-wachstumsschub',
    title: 'Häufigeres Stillen ist normal',
    body: 'Vor allem am Abend oder bei Wachstumsschüben kann dein Baby sehr oft trinken wollen.',
    tags: ['Wachstumsschub', 'Häufigkeit', 'Clusterfeeding'],
    category: 'stillen',
  },
  {
    id: 'stillen-windeln',
    title: 'Windeln als Orientierung',
    body: '5–6 nasse Windeln am Tag zeigen meist, dass dein Baby genug Milch bekommt.',
    tags: ['Windeln', 'Milchmenge', 'Beobachtung'],
    category: 'stillen',
  },
  {
    id: 'stillen-morgen',
    title: 'Milchmenge am Morgen',
    body: 'Viele haben morgens mehr Milch. Nutze die Zeit für längere Stillmahlzeiten, wenn möglich.',
    tags: ['Tagesrhythmus', 'Milchmenge', 'Morgen'],
    category: 'stillen',
  },
  {
    id: 'stillen-nacht',
    title: 'Nächtliches Stillen',
    body: 'Stillen in der Nacht fördert die Milchbildung. Ein heller Nachttisch und bequeme Position helfen.',
    tags: ['Nacht', 'Prolaktin', 'Milchbildung'],
    category: 'stillen',
  },
  {
    id: 'stillen-pause',
    title: 'Pause vor dem Wechsel',
    body: 'Warte, bis dein Baby von der ersten Brust ablässt, bevor du die zweite anbietest.',
    tags: ['Wechsel', 'Vordermilch', 'Hintermilch'],
    category: 'stillen',
  },
  {
    id: 'stillen-unruhe',
    title: 'Unruhe am Abend',
    body: 'Viele Babys sind abends unruhiger. Das ist oft normal und kein Zeichen von zu wenig Milch.',
    tags: ['Abend', 'Unruhe', 'Normalität'],
    category: 'stillen',
  },
  {
    id: 'stillen-komfort',
    title: 'Dein Komfort zählt',
    body: 'Stütze Arme und Rücken mit Kissen. Eine entspannte Haltung erleichtert langes Stillen.',
    tags: ['Komfort', 'Kissen', 'Position'],
    category: 'stillen',
  },
  {
    id: 'stillen-zeichen',
    title: 'Hungerzeichen erkennen',
    body: 'Lippen lecken, Finger saugen, Unruhe – diese frühen Zeichen sind gute Momente zum Anbieten.',
    tags: ['Hungerzeichen', 'Timing', 'Anlegen'],
    category: 'stillen',
  },
  {
    id: 'stillen-stress',
    title: 'Stress und Milchmenge',
    body: 'Stress kann das Stillen beeinflussen. Pausen, Atmen und Unterstützung helfen dir dabei.',
    tags: ['Stress', 'Entspannung', 'Unterstützung'],
    category: 'stillen',
  },
  {
    id: 'stillen-haut',
    title: 'Pflege der Brusthaut',
    body: 'Muttermilch selbst wirkt pflegend. Sparsam mit Seife um die Brustwarzen umgehen.',
    tags: ['Hautpflege', 'Brustwarzen', 'Muttermilch'],
    category: 'stillen',
  },
  {
    id: 'stillen-anlegen',
    title: 'Brust dem Baby entgegen',
    body: 'Halte die Brust so, dass das Baby sie leicht erreicht – C‑ oder U‑Griff, je nach Größe.',
    tags: ['Handgriff', 'Position', 'Anlegen'],
    category: 'stillen',
  },
  {
    id: 'stillen-schlaf',
    title: 'Schläfriges Neugeborenes',
    body: 'In den ersten Tagen sind viele Babys sehr schläfrig. Hautkontakt und sanftes Streicheln wecken sie behutsam.',
    tags: ['Neugeborenes', 'Schläfrigkeit', 'Hautkontakt'],
    category: 'stillen',
  },
  {
    id: 'stillen-zeit',
    title: 'Keine Zeitvorgaben',
    body: 'Es gibt keine „richtige“ Stilldauer. Lass dein Baby trinken, bis es satt und zufrieden ist.',
    tags: ['Dauer', 'Bedarf', 'Individuell'],
    category: 'stillen',
  },
  {
    id: 'stillen-unterstuetzung',
    title: 'Unterstützung holen',
    body: 'Bei Schmerzen oder Unsicherheiten hilft eine Stillberatung. Du musst nicht alles alleine lösen.',
    tags: ['Stillberatung', 'Unterstützung', 'Hilfe'],
    category: 'stillen',
  },
  {
    id: 'stillen-wind',
    title: 'Bäuerchen nicht erzwingen',
    body: 'Manche Babys müssen nicht nach jeder Mahlzeit ein Bäuerchen machen. Beobachte, was deinem Kind guttut.',
    tags: ['Bäuerchen', 'Blähungen', 'Beobachtung'],
    category: 'stillen',
  },
  {
    id: 'stillen-wechselposition',
    title: 'Verschiedene Positionen',
    body: 'Abwechselnde Positionen können unterschiedliche Bereiche der Brust entleeren und Verspannungen vorbeugen.',
    tags: ['Position', 'Vielfalt', 'Entleerung'],
    category: 'stillen',
  },
  {
    id: 'stillen-bonding',
    title: 'Nähe beim Stillen',
    body: 'Stillen ist mehr als Nahrung. Der Hautkontakt und die Nähe tun dir und deinem Baby gut.',
    tags: ['Bindung', 'Nähe', 'Oxytocin'],
    category: 'stillen',
  },
  {
    id: 'stillen-geduld',
    title: 'Geduld in den ersten Tagen',
    body: 'Stillen lernt ihr gemeinsam. Gib dir und deinem Baby Zeit – es wird von Tag zu Tag leichter.',
    tags: ['Anfang', 'Geduld', 'Lernen'],
    category: 'stillen',
  },
  {
    id: 'stillen-schmerzen',
    title: 'Schmerzen ernst nehmen',
    body: 'Schmerzen beim Stillen sind nicht normal. Eine Stillberaterin kann Ursachen finden und helfen.',
    tags: ['Schmerzen', 'Stillberatung', 'Hilfe'],
    category: 'stillen',
  },
  {
    id: 'stillen-pausen',
    title: 'Pausen für dich',
    body: 'Leg alles in Reichweite, bevor du stillst. So kannst du in Ruhe sitzen bleiben und entspannen.',
    tags: ['Pausen', 'Vorbereitung', 'Entspannung'],
    category: 'stillen',
  },
  {
    id: 'stillen-kaiserschnitt',
    title: 'Stillen nach Kaiserschnitt',
    body: 'Mit entlastenden Positionen – z. B. seitlich oder im Fußballer-Griff – geht Stillen auch nach Kaiserschnitt gut.',
    tags: ['Kaiserschnitt', 'Position', 'Entlastung'],
    category: 'stillen',
  },
  {
    id: 'stillen-milchstau',
    title: 'Bei Spannungsgefühl',
    body: 'Häufiges Anlegen, sanftes Ausstreichen vor dem Stillen und Kühlen danach können bei Spannung helfen.',
    tags: ['Milchstau', 'Spannung', 'Selbsthilfe'],
    category: 'stillen',
  },
  {
    id: 'stillen-genuss',
    title: 'Ernährung mit Genuss',
    body: 'Du musst dich beim Stillen nicht einschränken. Eine ausgewogene, vielfältige Ernährung reicht.',
    tags: ['Ernährung', 'Vielfalt', 'Genuss'],
    category: 'stillen',
  },
  {
    id: 'stillen-ruhepausen',
    title: 'Ruhepausen einplanen',
    body: 'Stillen braucht Zeit. Plane Pausen ein, statt sie zwischen anderen Aufgaben zu quetschen.',
    tags: ['Zeit', 'Pausen', 'Prioritäten'],
    category: 'stillen',
  },
];
