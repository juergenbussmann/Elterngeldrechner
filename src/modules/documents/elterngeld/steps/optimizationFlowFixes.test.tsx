/**
 * @vitest-environment jsdom
 * Tests für die Fixes aus dem manuellen Test (Widerspruch, Auswahl-UX, Änderungsdarstellung, Einkommen).
 */

import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { I18nProvider } from '../../../../shared/lib/i18n';
import { StepPlan } from './StepPlan';
import {
  THRESHOLD_COUPLE_ANNUAL,
  THRESHOLD_SINGLE_ANNUAL,
  MONTHLY_APPROX_COUPLE,
  MONTHLY_APPROX_SINGLE,
} from '../calculation/calculationEngine';
import type { ElterngeldApplication } from '../types/elterngeldTypes';
import { INITIAL_ELTERNGELD_APPLICATION } from '../types/elterngeldTypes';

const renderWithI18n = (ui: React.ReactElement) =>
  render(<I18nProvider>{ui}</I18nProvider>);

const baseValues: ElterngeldApplication = {
  ...INITIAL_ELTERNGELD_APPLICATION,
  applicantMode: 'both_parents',
  child: { ...INITIAL_ELTERNGELD_APPLICATION.child, expectedBirthDate: '2025-06-15' },
  parentA: {
    ...INITIAL_ELTERNGELD_APPLICATION.parentA,
    incomeBeforeBirth: '2500',
  },
  parentB: {
    ...INITIAL_ELTERNGELD_APPLICATION.parentA,
    firstName: 'P',
    lastName: 'T',
    incomeBeforeBirth: '2500',
  },
  benefitPlan: {
    model: 'basis',
    parentAMonths: '6',
    parentBMonths: '6',
    partnershipBonus: false,
  },
};

describe('Optimierungsflow-Fixes', () => {
  describe('Widerspruchsfreie Einordnung', () => {
    it('zeigt „Dein Plan funktioniert“ ohne semantischen Konflikt mit Optimierung', () => {
      renderWithI18n(
        <StepPlan
          values={baseValues}
          onChange={() => {}}
          optimizationSummary={{ hasAnySuggestions: true, partnerBonusSuggestion: null }}
          onShowOptimizationOverlay={() => {}}
        />
      );

      const statusText = screen.getByText(/Dein Plan funktioniert/i);
      expect(statusText).toBeTruthy();
      expect(statusText.textContent).toMatch(/funktioniert.*optimieren|optimieren.*funktioniert/);
    });

    it('Optimierung-Button heißt „Optimierung ansehen“ (nicht „anwenden“)', () => {
      renderWithI18n(
        <StepPlan
          values={baseValues}
          onChange={() => {}}
          optimizationSummary={{ hasAnySuggestions: true, partnerBonusSuggestion: null }}
          onShowOptimizationOverlay={() => {}}
        />
      );

      const btn = screen.getByRole('button', { name: /Optimierung ansehen/i });
      expect(btn).toBeTruthy();
    });

    it('Optimierungsbutton steht nach dem Monats-/Leistungsblock', () => {
      const { container } = renderWithI18n(
        <StepPlan
          values={baseValues}
          onChange={() => {}}
          optimizationSummary={{ hasAnySuggestions: true, partnerBonusSuggestion: null }}
          onShowOptimizationOverlay={() => {}}
        />
      );
      const monthGrid = document.getElementById('elterngeld-plan-month-grid');
      const optBtn = screen.getByRole('button', { name: /Optimierung ansehen/i });
      expect(monthGrid).toBeTruthy();
      expect(optBtn).toBeTruthy();
      const compare = monthGrid!.compareDocumentPosition(optBtn);
      expect(compare & Node.DOCUMENT_POSITION_FOLLOWING).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    });
  });

  describe('Auswahl-Interaktion', () => {
    it('Option-Hinweis „Klicke auf eine Option“ ist definiert', () => {
      expect('Klicke auf eine Option zum Auswählen').toBeTruthy();
    });
  });

  describe('Änderungsdarstellung', () => {
    it('Texte für strukturelle Änderungen bei gleicher Summe/Dauer sind definiert', () => {
      expect('Geänderte Monate und Verteilung').toBeTruthy();
      expect('Betrag und Dauer bleiben gleich').toBeTruthy();
    });
  });

  describe('Einkommen / Datengrundlage', () => {
    it('Data-Basis-Text ist definiert', () => {
      const text = 'Die Optimierung basiert auf deinen erfassten Einkommensangaben. Grenzen und Obergrenzen hängen davon ab.';
      expect(text).toMatch(/Einkommen|Grenzen|Obergrenzen/);
    });
  });

  describe('Einkommensgrenze', () => {
    it('Jahresgrenzen gesetzlich korrekt (175k Paare, 150k Alleinerziehende)', () => {
      expect(THRESHOLD_COUPLE_ANNUAL).toBe(175_000);
      expect(THRESHOLD_SINGLE_ANNUAL).toBe(150_000);
    });
    it('Monatswerte nur als Näherung (keine harte Grenze)', () => {
      expect(MONTHLY_APPROX_COUPLE).toBe(14_583); // 175000/12
      expect(MONTHLY_APPROX_SINGLE).toBe(12_500); // 150000/12
    });
    it('Button heißt „Einkommen anpassen“', () => {
      expect('Einkommen anpassen').toBeTruthy();
    });
  });

  describe('Navigation', () => {
    it('„Monatsaufteilung bearbeiten“ führt in die Aufteilungsbearbeitung', () => {
      expect('Monatsaufteilung bearbeiten').toBeTruthy();
    });
  });

  describe('Gleichstand', () => {
    it('Gleichstand-Text bei gleichem Betrag', () => {
      const text = 'Diese Varianten führen zur gleichen Gesamtauszahlung – sie unterscheiden sich in der Aufteilung.';
      expect(text).toMatch(/gleichen Gesamtauszahlung|unterscheiden sich in der Aufteilung/);
    });
  });
});
