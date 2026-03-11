import React, { useMemo } from 'react';
import type { RouteObject } from 'react-router-dom';
import { Navigate, useLocation, useRoutes } from 'react-router-dom';
import { useNavigation } from '../../shared/lib/navigation/useNavigation';
import { useI18n } from '../../shared/lib/i18n';
import { WidgetHost } from '../home/WidgetHost';
import { SettingsLayout } from '../settings/SettingsLayout';
import { GlobalSettingsScreen } from '../settings/GlobalSettingsScreen';
import { ModuleSettingsScreen } from '../settings/ModuleSettingsScreen';
import { DeveloperScreen } from '../settings/DeveloperScreen';
import { OfflineScreen } from '../offline/OfflineScreen';
import { getAllRoutes } from '../modules/moduleHost';
import { Card } from '../../shared/ui/Card';
import { SectionHeader } from '../../shared/ui/SectionHeader';
import contentIndex from '../../modules/knowledge/content/de/index.json';
import { useTheme } from '../theme/ThemeProvider';
import { toRgba } from '../theme/colorUtils';
import { AppShell } from '../AppShell';
import { Start } from '../../screens/Start';
import { Beratung } from '../../screens/Beratung';
import BegleitungPlusScreen from '../../screens/BegleitungPlusScreen';
import { Demo } from '../../screens/Demo';
import { Testseite } from '../../pages/Testseite';
import { NextStepsSection } from '../../components/NextStepsSection';
import { PhaseSearch } from '../../components/PhaseSearch';
import { getPhaseTopics, enrichKnowledgeItems } from '../../utils/search';
import {
  useDocumentHead,
  buildFaqJsonLd,
  buildPersonJsonLd,
  buildWebPageWithAuthorJsonLd,
} from '../../shared/lib/seo';
import { getPhaseSeo, buildCanonicalUrl } from '../../shared/lib/seo/seoConfig';
import { parseTelLinks } from '../../shared/lib/text/parseTelLinks';
import { useTipOfDay } from '../../shared/lib/tipOfDay';
import './AppRoutes.css';

type KnowledgeIndexItem = {
  id: string;
  categoryId: string;
  title: string;
  summary: string;
  tags: string[];
  synonyme?: string[];
};

type KnowledgeIndex = {
  items: KnowledgeIndexItem[];
};

const { items } = contentIndex as KnowledgeIndex;
const enrichedItems = enrichKnowledgeItems(items);
const pregnancyItems = getPhaseTopics(enrichedItems, 'pregnancy');
const birthItems = getPhaseTopics(enrichedItems, 'birth');
const breastfeedingItems = getPhaseTopics(enrichedItems, 'breastfeeding');

const useTopicCardStyle = () => {
  const theme = useTheme();
  const tintAlpha = theme.mode === 'dark' ? 0.16 : 0.1;
  const tintHoverAlpha = theme.mode === 'dark' ? 0.18 : 0.14;
  const tint = toRgba(theme.colors.primary, tintAlpha);
  const tintHover = toRgba(theme.colors.primary, tintHoverAlpha);

  return useMemo<React.CSSProperties>(() => {
    const style: React.CSSProperties = {
      backgroundColor: 'var(--topic-card-bg, var(--color-surface))',
      border: 'var(--topic-card-border, 1px solid transparent)',
    };
    const cssVars = style as React.CSSProperties & Record<string, string>;

    if (tint) {
      cssVars['--topic-card-bg'] = tint;
    } else {
      cssVars['--topic-card-border'] = '1px solid var(--color-primary)';
    }

    if (tintHover) {
      cssVars['--topic-card-bg-hover'] = tintHover;
    }

    return style;
  }, [tint, tintHover]);
};

const PREGNANCY_FAQ: { question: string; answer: string }[] = [
  {
    question: 'Muss ich meine Brust in der Schwangerschaft vorbereiten?',
    answer:
      'Nein. Die Brust bereitet sich von selbst vor. Wichtig ist, dich gut zu informieren und Unterstützung zu planen. Mehr zum [ersten Stillstart](/knowledge/start-erster-stillstart) und zu den [ersten Stunden](/knowledge/start-die-ersten-stunden) findest du in unserem Themenbereich.',
  },
  {
    question: 'Verändert sich die Brust schon vor der Geburt?',
    answer:
      'Ja. Viele Frauen spüren schon in der Schwangerschaft Veränderungen. Das ist normal. Mehr zu [Körper & Veränderungen](/knowledge/pregnancy-koerper-veraenderungen) findest du in unserem Themenbereich.',
  },
  {
    question: 'Sollte ich Kolostrum vorab gewinnen?',
    answer:
      'Nur bei besonderer Indikation, etwa Diabetes oder geplanter Kaiserschnitt. Sonst reicht das Kolostrum nach der Geburt. Der [erste Stillstart](/knowledge/start-erster-stillstart) und die [ersten Stunden](/knowledge/start-die-ersten-stunden) sind dabei zentral.',
  },
  {
    question: 'Welche Nährstoffe sind in der Schwangerschaft besonders wichtig?',
    answer:
      'Eisen, Jod, Folsäure und Omega-3-Fettsäuren zählen zu den wichtigen Nährstoffen. Eine ausgewogene Ernährung reicht meist aus. Mehr zu [Ernährung & Nährstoffen](/knowledge/pregnancy-ernaehrung-naehrstoffe) findest du in unserem Themenbereich.',
  },
  {
    question: 'Was kann ich tun, um mich mental auf das Stillen vorzubereiten?',
    answer:
      'Informiere dich über normales Stillverhalten, plane Unterstützung und sprich mit deinem Umfeld über deine Wünsche. Ruhe und Vertrauen helfen. Mehr zur [Vorbereitung auf Geburt & Stillzeit](/knowledge/pregnancy-vorbereitung-geburt-stillzeit) findest du in unserem Themenbereich.',
  },
];

const BREASTFEEDING_PILLAR_SECTIONS: { heading: string; paragraphs: string[] }[] = [
  {
    heading: 'Was bedeutet Stillen?',
    paragraphs: [
      'Stillen ist die natürliche Ernährung des Säuglings durch Muttermilch direkt an der Brust. Die physiologischen Grundlagen dafür werden schon in der Schwangerschaft gelegt: Brustgewebe bildet Milchgänge und Drüsenläppchen aus. Unmittelbar nach der Geburt steuern Hormone wie Oxytocin und Prolaktin die Milchbildung.',
      'Oxytocin bewirkt den Milchspendereflex und unterstützt die Bindung zwischen Mutter und Kind. Prolaktin regt die Milchproduktion an. Beide Hormone reagieren sensibel auf Ruhe, Hautkontakt und häufiges Anlegen. Stress und Druck können die Ausschüttung hemmen – deshalb ist eine ruhige Umgebung in den ersten Tagen förderlich. Hautkontakt und frühes Anlegen werden von Fachleitlinien als zentral für einen guten Stillstart eingestuft.',
      'Stillen dient nicht nur der Ernährung, sondern auch der Regulation: Das Baby findet in der Brust Trost, Beruhigung und Orientierung. Viele Neugeborene stillen aus beiden Gründen – weil sie hungrig sind und weil sie Nähe suchen. Die hier beschriebenen Zusammenhänge entsprechen dem aktuellen fachlichen Stand.',
      'Eine gute Vorbereitung erleichtert den Einstieg. Mehr zur [Vorbereitung auf Geburt & Stillzeit](/knowledge/pregnancy-vorbereitung-geburt-stillzeit) findest du in unserem Themenbereich.',
    ],
  },
  {
    heading: 'Der Stillstart – die ersten Tage',
    paragraphs: [
      'Das erste Anlegen direkt nach der Geburt ist ein wichtiger Startpunkt. Viele Babys suchen selbst nach der Brust und finden sie mit Hautkontakt leichter. Haut an Haut stabilisiert Atmung und Körpertemperatur des Neugeborenen und unterstützt den Stillbeginn. Auch nach Kaiserschnitt oder Interventionsgeburt ist früher Hautkontakt oft möglich und förderlich.',
      'In der Praxis zeigt sich häufig: In den ersten Tagen kommt der Milcheinschuss – der Übergang von Kolostrum zur reifen Muttermilch. Die Brust kann dabei spannen. Häufiges, effektives Anlegen hilft, die Milchmenge an den Bedarf anzupassen und Spannungsgefühle zu lindern. Bei manchen Familien dauert dieser Übergang etwas länger – das ist normal.',
      'Wie oft du in den ersten Tagen stillen solltest, hängt vom Baby ab. Achte auf Suchbewegungen, Schmatzen und Unruhe als Zeichen. Zehn oder mehr Mahlzeiten pro Tag sind in der Anfangsphase typisch. Mehr zum [ersten Stillstart](/knowledge/start-erster-stillstart), zu den [ersten Stunden](/knowledge/start-die-ersten-stunden) und zum [Milcheinschuss](/knowledge/start-milcheinschuss) findest du in unserem Themenbereich.',
    ],
  },
  {
    heading: 'Wie oft und wie lange sollte ich stillen?',
    paragraphs: [
      'Stillen nach Bedarf bedeutet: anlegen, wenn dein Baby Hunger- oder Stillzeichen zeigt. Das können Suchbewegungen, Schmatzen, Hand zum Mund oder Unruhe sein. Feste Zeitabstände sind in den ersten Wochen meist nicht sinnvoll. Der Magen eines Neugeborenen ist klein – häufigere, kleinere Mahlzeiten entsprechen der Physiologie.',
      'Clusterfeeding – sehr häufiges Stillen über mehrere Stunden, oft am Abend – ist ein normales Verhalten. Es fördert die Milchbildung und hilft dem Baby, sich zu regulieren. In Wachstumsschüben kann die Häufigkeit temporär stark zunehmen. Viele Eltern fragen sich dann, ob genug Milch da ist – oft ist die Antwort ja, das Baby stimuliert nur die Produktion.',
      'Die Dauer einer Stillmahlzeit variiert stark. Manche Babys trinken effizient in wenigen Minuten, andere brauchen länger. Solange aktiv gesaugt und geschluckt wird, ist beides in Ordnung. Mehr zur [Häufigkeit beim Stillen](/knowledge/start-haeufigkeit-stillen) und zum [Clusterfeeding](/knowledge/challenges-clusterfeeding) findest du in unserem Themenbereich.',
    ],
  },
  {
    heading: 'Häufige Stillprobleme',
    paragraphs: [
      'Ein Milchstau zeigt sich durch einen harten, druckempfindlichen Bereich in der Brust. Sanftes Entleeren durch Stillen oder Handentleeren, Wärme vor dem Stillen und Kälte danach können Linderung bringen. Rasches Handeln kann verhindern, dass sich eine Brustentzündung entwickelt. Beim Abstillen kann Milchstau ebenfalls auftreten – dann hilft schrittweises Reduzieren.',
      'Eine Brustentzündung (Mastitis) geht oft mit Fieber, Schüttelfrost und starkem Krankheitsgefühl einher. Dann ist zeitnah eine ärztliche Abklärung sinnvoll. Während der Behandlung kann weiter gestillt werden – die Entleerung der Brust unterstützt die Heilung.',
      'Wunde Brustwarzen entstehen häufig durch ungünstiges Anlegen. Ein tiefer Sitz, bei dem das Baby viel Brustgewebe im Mund hat, schont die Brustwarzen. Aus Erfahrung in der Begleitung von Familien: Position und Technik zu prüfen lohnt sich bei den ersten Anzeichen von Schmerz.',
      'Sorgen um zu wenig Milch sind verbreitet. Viele Mütter berichten in der Beratung von dieser Unsicherheit – oft zeigt sich, dass die Milchmenge ausreichend ist. Entscheidend sind häufiges Anlegen und effektives Trinken. Gewichtsentwicklung und Windelausstoß geben Orientierung. Mehr zu [Milchstau](/knowledge/challenges-milchstau), [Mastitis](/knowledge/challenges-mastitis-verdacht), [wunden Brustwarzen](/knowledge/challenges-wunde-brustwarzen) und [mehr Milch](/knowledge/supply-mehr-milch) findest du in unserem Themenbereich.',
    ],
  },
  {
    heading: 'Stillen im Alltag',
    paragraphs: [
      'Schlaf und Nachtstillen gehören für viele Familien zum Stillalltag. Stillen in der Nacht hilft der Milchbildung und unterstützt den Schlaf-Wach-Rhythmus des Babys. Die zweite Nacht nach der Geburt ist bei vielen Kindern besonders unruhig – das ist normal und oft ein Zeichen für die anlaufende Milchbildung.',
      'Die Rückkehr in den Beruf bedeutet nicht automatisch das Ende des Stillens. Mit Abpumpen, Vorratsmilch und einer Planung lässt sich beides vereinbaren. Viele Arbeitgeber bieten Räume zum Abpumpen – nutze diese Möglichkeit.',
      'Zur Ernährung in der Stillzeit: Du musst keine spezielle Diät einhalten. Ausgewogen und nach Appetit reicht in der Regel. Stillen verbraucht Kalorien – viele Frauen haben in dieser Phase mehr Hunger. Das ist normal. Mehr zur [Rückkehr in den Beruf](/knowledge/supply-arbeitsrueckkehr), zur [Ernährung beim Stillen](/knowledge/nutrition-muss-ich-anders-essen) und zur [Nacht 2](/knowledge/start-nacht-2) findest du in unserem Themenbereich.',
    ],
  },
  {
    heading: 'Abstillen – ein natürlicher Übergang',
    paragraphs: [
      'Der richtige Zeitpunkt zum Abstillen ist individuell. WHO und nationale Fachgesellschaften empfehlen ausschließliches Stillen in den ersten sechs Monaten und danach begleitet von Beikost nach Bedarf. Wie lange du darüber hinaus stillst, entscheidest du gemeinsam mit deinem Baby.',
      'Sanftes Abstillen bedeutet, Stillmahlzeiten schrittweise zu ersetzen statt abrupt zu beenden. So kann sich die Milchmenge langsam reduzieren und das Risiko für Milchstau sinkt. In der Praxis hat sich bewährt: Eine Mahlzeit nach der anderen ersetzen – mit einigen Tagen Abstand.',
      'Abstillen hat oft auch emotionale Aspekte. Manche Mütter erleben es als Abschied, andere als Befreiung. Beides ist normal. Wenn du Unterstützung brauchst, kann eine Stillberatung begleiten. Mehr zum [Abstillen](/knowledge/weaning-abstillen) und zu [Milchstau beim Abstillen](/knowledge/challenges-milchstau) findest du in unserem Themenbereich.',
    ],
  },
];

const BREASTFEEDING_FAQ: { question: string; answer: string }[] = [
  {
    question: 'Wie erkenne ich, ob mein Baby genug Milch bekommt?',
    answer:
      'Wachstum, nasse Windeln und das Verhalten deines Babys geben Orientierung. Regelmäßige Zunahme, etwa fünf bis sechs nasse Windeln täglich und ein waches, zufriedenes Baby sind gute Zeichen. Mehr zu [Windeln & Gewicht](/knowledge/start-windeln-gewicht) und zum [effektiven Trinken](/knowledge/supply-baby-trinkt-nicht-effektiv) findest du in unserem Themenbereich.',
  },
  {
    question: 'Wie lange sollte eine Stillmahlzeit dauern?',
    answer:
      'Es gibt keine feste Vorgabe. Manche Babys trinken effizient in wenigen Minuten, andere brauchen länger. Wichtig ist, dass dein Baby aktiv saugt und schluckt. Die Dauer kann von Mahlzeit zu Mahlzeit variieren. Mehr zur [Häufigkeit beim Stillen](/knowledge/start-haeufigkeit-stillen) findest du in unserem Themenbereich.',
  },
  {
    question: 'Was tun bei Schmerzen beim Stillen?',
    answer:
      'Schmerzen sind ein Signal, dass etwas nicht optimal läuft – oft das Anlegen. Ein tiefer Sitz mit viel Brustgewebe im Mund schont die Brustwarzen. Prüfe die Position und hole bei Bedarf Unterstützung. Mehr zu [Schmerzen beim Stillen](/knowledge/latch-schmerzen-haeufige-ursachen) und [wunden Brustwarzen](/knowledge/challenges-wunde-brustwarzen) findest du in unserem Themenbereich.',
  },
  {
    question: 'Muss ich beim Stillen bestimmte Lebensmittel meiden?',
    answer:
      'In der Regel nicht. Du musst keine spezielle Stilldiät einhalten. Iss ausgewogen, nach Appetit und mit Genuss. Bei Koffein und Alkohol gilt: moderate Mengen und Timing beachten. Mehr zur [Ernährung beim Stillen](/knowledge/nutrition-muss-ich-anders-essen) findest du in unserem Themenbereich.',
  },
  {
    question: 'Wann pendelt sich die Milchmenge ein?',
    answer:
      'In den ersten Wochen passt sich die Milchmenge dem Bedarf deines Babys an. Nach etwa vier bis sechs Wochen ist die Umstellung oft abgeschlossen – die Brust fühlt sich weicher an, produziert aber weiterhin bedarfsgerecht. Mehr zur [Milchbildung](/knowledge/supply-milchbildung-verstehen) findest du in unserem Themenbereich.',
  },
  {
    question: 'Kann ich nach Bedarf stillen?',
    answer:
      'Ja. Stillen nach Bedarf – anlegen, wenn dein Baby Zeichen zeigt – ist der empfohlene Weg. Es fördert die Milchbildung und entspricht dem natürlichen Rhythmus. Mehr zur [Häufigkeit beim Stillen](/knowledge/start-haeufigkeit-stillen) findest du in unserem Themenbereich.',
  },
  {
    question: 'Was hilft beim ersten Anlegen?',
    answer:
      'Hautkontakt, eine entspannte Position und Geduld. Hilf dem Baby, wenn es den Mund weit öffnet – dann Brust anbieten, damit es viel Gewebe erfasst. Mehr zum [Anlegen Schritt für Schritt](/knowledge/latch-anlegen-schritt-fuer-schritt) und zum [guten Anlegen erkennen](/knowledge/latch-gutes-anlegen-erkennen) findest du in unserem Themenbereich.',
  },
  {
    question: 'Ist Clusterfeeding ein Zeichen für zu wenig Milch?',
    answer:
      'Oft nicht. Clusterfeeding kann die Milchbildung sogar fördern. Wenn du unsicher bist, geben [Windeln & Gewicht](/knowledge/start-windeln-gewicht) Orientierung. Mehr zum [Clusterfeeding](/knowledge/challenges-clusterfeeding) findest du in unserem Themenbereich.',
  },
];

const BIRTH_FAQ: { question: string; answer: string }[] = [
  {
    question: 'Wie wichtig ist Hautkontakt direkt nach der Geburt?',
    answer:
      'Sehr wichtig. Hautkontakt stabilisiert Atmung und Temperatur des Babys und unterstützt den Stillstart. Mehr zu den [ersten Stunden](/knowledge/start-die-ersten-stunden) und zum [ersten Stillstart](/knowledge/start-erster-stillstart) findest du in unserem Themenbereich.',
  },
  {
    question: 'Wann sollte das erste Anlegen stattfinden?',
    answer:
      'Wenn das Baby bereit ist – oft in der ersten Stunde. Es sucht selbst nach der Brust. Mehr zum [ersten Stillstart](/knowledge/start-erster-stillstart) und zu den [ersten Stunden](/knowledge/start-die-ersten-stunden) findest du in unserem Themenbereich.',
  },
  {
    question: 'Was passiert, wenn medizinische Interventionen nötig waren?',
    answer:
      'Stillen ist oft trotzdem möglich. Hautkontakt und frühes Anlegen helfen. Mehr zu [Oxytocin & Stillstart](/knowledge/birth-oxytocin-bindung-stillstart) und zur [ersten Zeit nach der Geburt](/knowledge/birth-erste-zeit-nach-geburt) findest du in unserem Themenbereich.',
  },
  {
    question: 'Was ist Oxytocin und warum ist es wichtig?',
    answer:
      'Oxytocin ist ein Hormon, das Wehen, Bindung und den Milchspendereflex fördert. Ruhe und Nähe unterstützen seine Ausschüttung. Mehr zu [Oxytocin, Bindung & Stillstart](/knowledge/birth-oxytocin-bindung-stillstart) findest du in unserem Themenbereich.',
  },
  {
    question: 'Was, wenn mein Baby nicht sofort trinken möchte?',
    answer:
      'Das ist normal. Manche Babys brauchen Zeit. Hautkontakt und Geduld helfen. Der [Milcheinschuss](/knowledge/start-milcheinschuss) kommt oft erst nach einigen Tagen. Mehr zu den [ersten Stunden](/knowledge/start-die-ersten-stunden) findest du in unserem Themenbereich.',
  },
];

const PregnancyPhaseScreen: React.FC = () => {
  const { t } = useI18n();
  const topicCardStyle = useTopicCardStyle();
  const phaseSeo = getPhaseSeo('pregnancy');
  const pregnancyJsonLd = buildFaqJsonLd(
    PREGNANCY_FAQ.map((f) => ({
      question: f.question,
      answer: f.answer.replace(/\[([^\]]+)\]\(\/[^)]+\)/g, '$1').replace(/\s+/g, ' ').trim(),
    })),
  );
  useDocumentHead({
    title: phaseSeo?.seoTitle ?? 'Schwangerschaft – Vorbereitung auf Stillzeit',
    description: phaseSeo?.seoDescription ?? 'Vorbereitung auf die Stillzeit in der Schwangerschaft.',
    canonicalUrl: buildCanonicalUrl('/phase/pregnancy'),
    jsonLd: pregnancyJsonLd,
  });
  const { navigateToTopic } = useNavigation();
  const location = useLocation();

  return (
    <div className="home-screen phase-screen">
      <SectionHeader as="h1" title={t('nav.pregnancy')} />
      <section className="home-section">
        <SectionHeader title={t('home.sections.knowledge.title')} />
        <PhaseSearch phase="pregnancy" topics={pregnancyItems} />
        {pregnancyItems.length === 0 ? (
          <Card className="home-section__placeholder-card">
            <p className="home-section__placeholder-text">{t('placeholders.inPreparation')}</p>
          </Card>
        ) : (
          <div className="home-section__cards">
            {pregnancyItems.map((topic) => (
              <Card
                key={topic.id}
                className="home-section__topic-card"
                style={topicCardStyle}
            onClick={() => navigateToTopic(topic.id, location.pathname)}
              >
                <div>
                  <h3 className="home-section__topic-card-title">{topic.title}</h3>
                  <p className="home-section__topic-card-description">{topic.summary}</p>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>

      <section className="home-section">
        <SectionHeader title="Häufige Fragen zur Stillvorbereitung in der Schwangerschaft" />
        {PREGNANCY_FAQ.map((faq, idx) => (
          <div key={idx} className="home-section__faq-item">
            <h3 className="home-section__faq-question">{faq.question}</h3>
            <p className="home-section__faq-answer">{parseTelLinks(faq.answer)}</p>
          </div>
        ))}
      </section>

      <NextStepsSection
        variant="plain"
        title={t('phase.pregnancy.nextSteps.title')}
        items={[
          { label: t('phase.pregnancy.nextSteps.checklist'), to: '/checklists' },
          { label: t('phase.pregnancy.nextSteps.appointments'), to: '/appointments' },
          { label: t('phase.pregnancy.nextSteps.documents'), to: '/documents' },
          { label: t('phase.pregnancy.nextSteps.contacts'), to: '/contacts' },
          { label: t('phase.pregnancy.nextSteps.notes'), to: '/notes' },
        ]}
      />
    </div>
  );
};

const BirthPhaseScreen: React.FC = () => {
  const { t } = useI18n();
  const topicCardStyle = useTopicCardStyle();
  const phaseSeo = getPhaseSeo('birth');
  const birthJsonLd = buildFaqJsonLd(
    BIRTH_FAQ.map((f) => ({
      question: f.question,
      answer: f.answer.replace(/\[([^\]]+)\]\(\/[^)]+\)/g, '$1').replace(/\s+/g, ' ').trim(),
    })),
  );
  useDocumentHead({
    title: phaseSeo?.seoTitle ?? 'Geburt – stillfreundlicher Start',
    description: phaseSeo?.seoDescription ?? 'Stillfreundlicher Start bei der Geburt.',
    canonicalUrl: buildCanonicalUrl('/phase/birth'),
    jsonLd: birthJsonLd,
  });
  const { navigateToTopic } = useNavigation();
  const location = useLocation();

  return (
    <div className="home-screen phase-screen">
      <SectionHeader as="h1" title={t('nav.birth')} />
      <section className="home-section">
        <SectionHeader title={t('home.sections.knowledge.title')} />
        <PhaseSearch phase="birth" topics={birthItems} />
        {birthItems.length === 0 ? (
          <Card className="home-section__placeholder-card">
            <p className="home-section__placeholder-text">{t('placeholders.inPreparation')}</p>
          </Card>
        ) : (
          <div className="home-section__cards">
            {birthItems.map((topic) => (
              <Card
                key={topic.id}
                className="home-section__topic-card"
                style={topicCardStyle}
                onClick={() => navigateToTopic(topic.id, location.pathname)}
              >
                <div>
                  <h3 className="home-section__topic-card-title">{topic.title}</h3>
                  <p className="home-section__topic-card-description">{topic.summary}</p>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>

      <section className="home-section">
        <SectionHeader title="Häufige Fragen zum Stillstart bei der Geburt" />
        {BIRTH_FAQ.map((faq, idx) => (
          <div key={idx} className="home-section__faq-item">
            <h3 className="home-section__faq-question">{faq.question}</h3>
            <p className="home-section__faq-answer">{parseTelLinks(faq.answer)}</p>
          </div>
        ))}
      </section>

      <NextStepsSection
        variant="plain"
        title={t('phase.birth.nextSteps.title')}
        items={[
          { label: t('phase.birth.nextSteps.checklist'), to: '/checklists' },
          { label: t('phase.birth.nextSteps.appointments'), to: '/appointments' },
          { label: t('phase.birth.nextSteps.documents'), to: '/documents' },
          { label: t('phase.birth.nextSteps.contacts'), to: '/contacts' },
          { label: t('phase.birth.nextSteps.notes'), to: '/notes' },
        ]}
      />
    </div>
  );
};

const BreastfeedingPhaseScreen: React.FC = () => {
  const { t } = useI18n();
  const topicCardStyle = useTopicCardStyle();
  const { navigateToTopic } = useNavigation();
  const location = useLocation();
  const tipOfDay = useTipOfDay();
  const phaseSeo = getPhaseSeo('breastfeeding');
  const breastfeedingSeoTitle = phaseSeo?.seoTitle ?? 'Stillen – Anleitung, Stillprobleme & Tipps';
  const breastfeedingCanonicalUrl = buildCanonicalUrl('/phase/breastfeeding');
  const jsonLdSchemas = useMemo(() => {
    const faq = buildFaqJsonLd(
      BREASTFEEDING_FAQ.map((f) => ({
        question: f.question,
        answer: f.answer.replace(/\[([^\]]+)\]\(\/[^)]+\)/g, '$1').replace(/\s+/g, ' ').trim(),
      })),
    );
    return [
      faq,
      buildPersonJsonLd(),
      buildWebPageWithAuthorJsonLd(breastfeedingSeoTitle, breastfeedingCanonicalUrl),
    ].filter((s): s is object => s != null);
  }, [breastfeedingSeoTitle, breastfeedingCanonicalUrl]);
  useDocumentHead({
    title: breastfeedingSeoTitle,
    description: phaseSeo?.seoDescription ?? 'Umfassender Leitfaden rund ums Stillen.',
    canonicalUrl: breastfeedingCanonicalUrl,
    jsonLd: jsonLdSchemas,
  });

  const tipCard = (
    <Card className="home-section__topic-card" style={topicCardStyle}>
      <div>
        <span className="home-screen__search-suggestion-summary">{t('home.tip.badge')}</span>
        <h3 className="home-section__topic-card-title">{tipOfDay.title}</h3>
        <p className="home-section__topic-card-description">{tipOfDay.body}</p>
      </div>
    </Card>
  );

  return (
    <div className="home-screen phase-screen">
      <div className="phase-screen__header">
        <h1 className="section-header__title">{t('nav.breastfeeding')}</h1>
        {tipCard}
      </div>
      <section className="home-section">
        <SectionHeader title={t('home.sections.knowledge.title')} />

        <PhaseSearch phase="breastfeeding" topics={breastfeedingItems} />

        <div className="home-section__cards">
          {breastfeedingItems.map((topic) => (
            <Card
              key={topic.id}
              className="home-section__topic-card"
              style={topicCardStyle}
              onClick={() => navigateToTopic(topic.id, location.pathname)}
            >
              <div>
                <h3 className="home-section__topic-card-title">{topic.title}</h3>
                <p className="home-section__topic-card-description">{topic.summary}</p>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {BREASTFEEDING_PILLAR_SECTIONS.map((sec) => (
        <section key={sec.heading} className="home-section">
          <SectionHeader title={sec.heading} />
          {sec.paragraphs.map((para, i) => (
            <p key={i}>{parseTelLinks(para)}</p>
          ))}
        </section>
      ))}

      <section className="home-section">
        <SectionHeader title="Häufige Fragen zum Stillen" />
        {BREASTFEEDING_FAQ.map((faq, idx) => (
          <div key={idx} className="home-section__faq-item">
            <h3 className="home-section__faq-question">{faq.question}</h3>
            <p className="home-section__faq-answer">{parseTelLinks(faq.answer)}</p>
          </div>
        ))}
      </section>

      <section className="home-section">
        <SectionHeader title="Fachliche Einordnung" />
        <p>
          Die hier dargestellten Informationen basieren auf aktuellen fachlichen Erkenntnissen. Jede Stillbeziehung ist individuell. Bei Unsicherheiten oder anhaltenden Beschwerden kann eine persönliche Stillberatung sinnvoll sein.
        </p>
      </section>

      <section className="home-section">
        <SectionHeader title="Autorin" />
        <p>
          Die Inhalte dieser Seite werden fachlich verantwortet von Jacqueline Tinz, Stillberaterin. Weitere Informationen zur Person und zu ihrer Arbeit finden Sie unter:{' '}
          <a href="https://www.stillberatung-jt.de" rel="noopener noreferrer" className="content-internal-link">
            www.stillberatung-jt.de
          </a>
        </p>
      </section>

      <NextStepsSection
        variant="plain"
        title={t('phase.breastfeeding.nextSteps.title')}
        items={[
          { label: t('phase.breastfeeding.nextSteps.checklist'), to: '/checklists' },
          { label: t('phase.breastfeeding.nextSteps.appointments'), to: '/appointments' },
          { label: t('phase.breastfeeding.nextSteps.documents'), to: '/documents' },
          { label: t('phase.breastfeeding.nextSteps.contacts'), to: '/contacts' },
          { label: t('phase.breastfeeding.nextSteps.notes'), to: '/notes' },
        ]}
      />

      <WidgetHost />
    </div>
  );
};

export const AppRoutes: React.FC = () => {
  const moduleRoutes = getAllRoutes();

  const routes = useMemo<RouteObject[]>(() => {
    const normalizedModuleRoutes = moduleRoutes.map((route) => ({
      path: route.path.startsWith('/') ? route.path.slice(1) : route.path,
      element: route.element,
    }));

    return [
      {
        path: '/',
        element: <AppShell />,
        children: [
          { index: true, element: <Start /> },
          { path: 'phase/pregnancy', element: <PregnancyPhaseScreen /> },
          { path: 'phase/birth', element: <BirthPhaseScreen /> },
          { path: 'phase/breastfeeding', element: <BreastfeedingPhaseScreen /> },
          { path: 'beratung', element: <Beratung /> },
          { path: 'begleitung-plus', element: <BegleitungPlusScreen /> },
          { path: 'demo', element: <Demo /> },
          { path: 'testseite', element: <Testseite /> },
          {
            path: 'settings',
            element: <SettingsLayout />,
            children: [
              { index: true, element: <GlobalSettingsScreen /> },
              {
                path: 'developer',
                element: import.meta.env.PROD ? (
                  <Navigate to="/settings" replace />
                ) : (
                  <DeveloperScreen />
                ),
              },
              { path: ':moduleId', element: <ModuleSettingsScreen /> },
            ],
          },
          ...normalizedModuleRoutes,
          { path: 'offline', element: <OfflineScreen /> },
          { path: '*', element: <Navigate to="/" replace /> },
        ],
      },
    ];
  }, [moduleRoutes]);

  return useRoutes(routes);
};
