import React, { useEffect, useRef } from 'react';
import './start.css';
import { useNavigation } from '../shared/lib/navigation/useNavigation';
import { useDocumentHead, buildCanonicalUrl } from '../shared/lib/seo';
import { logLayoutMetrics } from '../debug/layoutDebug';
import { useHeroContrastGuard } from '../shared/hooks/useHeroContrastGuard';
import { useHeroCompactGuard } from '../shared/hooks/useHeroCompactGuard';
import { usePhase } from '../core/phase/usePhase';
import { getParentalLeaveReminderState } from '../core/reminders/parentalLeaveReminder';

export function Start() {
  const { goTo } = useNavigation();
  const { profile } = usePhase();

  const parentalLeaveReminder = getParentalLeaveReminderState(profile);
  const heroRef = useRef<HTMLElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const tilesRef = useRef<HTMLElement>(null);
  const glassActive = useHeroContrastGuard({
    heroRef,
    contentRef,
    threshold: 0.55,
  });
  const compactActive = useHeroCompactGuard({
    tilesRef,
    gap: 8,
  });

  useDocumentHead({
    title: 'Stillberatung – Wissen rund ums Stillen',
    description:
      'Fachlich fundierte Informationen rund ums Stillen: Stillstart, Stillprobleme, Milchmenge und Abstillen.',
    canonicalUrl: buildCanonicalUrl('/'),
  });

  useEffect(() => {
    if (import.meta.env.DEV) {
      // Debugging-Helfer nur in der Entwicklung aktivieren
      document.body.classList.add('debug-layout');
      logLayoutMetrics();

      return () => {
        document.body.classList.remove('debug-layout');
      };
    }
  }, []);

  return (
    <main
      ref={heroRef}
      className="start"
      data-compact={compactActive ? 'on' : 'off'}
    >
      <div
        ref={contentRef}
        className="start__hero-content"
        data-glass={glassActive ? 'on' : 'off'}
      >
        <div className="start__hero-glass" aria-hidden="true" />
        <div className="start__hero-inner">
          <header className="start__header">
            <img
              src="/brand/Logo-ohne-Schrift.png"
              alt="Stillberatung Logo"
              className="start__logo"
            />
            <div className="start__title">
              <span>Stillberatung</span>
              <span>Jacqueline Tinz</span>
            </div>
          </header>
          <div className="start__welcome">
            <h1>Willkommen</h1>
            <p className="start__welcome-sub">Schön, dass du hier bist!</p>
            <p className="start__welcome-text">
              Diese App begleitet dich auf deiner einzigartigen Reise von der Schwangerschaft über die
              Geburt bis in die Stillzeit und darüber hinaus – mit Checklisten, Notizen und klarer
              Struktur.
            </p>
          </div>
        </div>
      </div>
      <nav
        ref={tilesRef}
        className="start__buttons"
        aria-label="Phasen auswählen"
      >
        <button
          type="button"
          className="start__button start__button--pregnancy"
          aria-label="In der Schwangerschaft"
          onClick={() => goTo('/phase/pregnancy')}
        />
        <button
          type="button"
          className="start__button start__button--birth"
          aria-label="Bei der Geburt"
          onClick={() => goTo('/phase/birth')}
        />
        <button
          type="button"
          className="start__button start__button--breastfeeding"
          aria-label="Stillen"
          onClick={() => goTo('/phase/breastfeeding')}
        />
      </nav>

      {(parentalLeaveReminder.shouldShowCTA || parentalLeaveReminder.shouldShowMissingDateLink) && (
        <div className="start__cta">
          {parentalLeaveReminder.shouldShowCTA ? (
            <>
              <p className="start__cta-hint">{parentalLeaveReminder.hintText ?? 'Bald könnte wichtig werden'}</p>
              <button
                type="button"
                className="start__cta-button"
                onClick={() => goTo('/documents/parental-leave')}
              >
                Elternzeit-Antrag stellen
              </button>
            </>
          ) : (
            <button
              type="button"
              className="start__cta-link"
              onClick={() => goTo('/onboarding/due-date')}
            >
              Geburtstermin hinterlegen
            </button>
          )}
        </div>
      )}
    </main>
  );
}
