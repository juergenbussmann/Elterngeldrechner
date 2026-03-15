/**
 * Elterngeld-Berechnung – unverbindliche Schätzung.
 * Klar abgegrenzt von Vorbereitung und Antrag.
 * Unterstützt Variantenvergleich (Aktueller Plan vs. Alternative Variante).
 */

import React, { useState, useCallback, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { SectionHeader } from '../../../shared/ui/SectionHeader';
import { Button } from '../../../shared/ui/Button';
import { usePhase } from '../../../core/phase/usePhase';
import { getChildDateContext } from '../../../shared/lib/childDateContext';
import { useNotifications } from '../../../shared/lib/notifications';
import { addDocument } from '../application/service';
import type { ElterngeldCalculationPlan, CalculationResult } from './calculation';
import { createDefaultPlan, calculatePlan, duplicatePlan } from './calculation';
import {
  loadCalculationPlan,
  saveCalculationPlan,
  clearCalculationPlan,
  loadVariantBPlan,
  saveVariantBPlan,
  clearVariantBPlan,
  isPlanEmpty,
  plansAreEqual,
} from './infra/calculationPlanStorage';
import { Card } from '../../../shared/ui/Card';
import { buildElterngeldCalculationPdf } from './pdf/buildElterngeldCalculationPdf';
import { StepCalculationInput } from './steps/StepCalculationInput';
import { StepCalculationResult } from './steps/StepCalculationResult';
import { StepCalculationComparison } from './steps/StepCalculationComparison';
import { ElterngeldFlowStepper } from './ElterngeldFlowStepper';
import './ElterngeldWizardPage.css';
import './ElterngeldFlowStepper.css';
import './MonthTimeline.css';
import '../../checklists/styles/softpill-buttons-in-cards.css';
import '../../checklists/styles/softpill-cards.css';

type View = 'input' | 'result' | 'compare';
type EditingVariant = 'A' | 'B';

type LocationState = { fromPreparation?: ElterngeldCalculationPlan } | null;

function getInitialPlan(
  fromPreparation: ElterngeldCalculationPlan | undefined,
  birthOrDue: string
): ElterngeldCalculationPlan {
  const persisted = loadCalculationPlan();
  if (persisted) return persisted;
  if (fromPreparation) return fromPreparation;
  return createDefaultPlan(birthOrDue, true);
}

function hasDataConflict(
  persisted: ElterngeldCalculationPlan | null,
  fromPreparation: ElterngeldCalculationPlan | undefined
): boolean {
  return Boolean(
    persisted &&
      fromPreparation &&
      !isPlanEmpty(persisted) &&
      !isPlanEmpty(fromPreparation) &&
      !plansAreEqual(persisted, fromPreparation)
  );
}

export const ElterngeldCalculationPage: React.FC = () => {
  const { profile } = usePhase();
  const { showToast } = useNotifications();
  const location = useLocation();
  const child = getChildDateContext(profile);
  const birthOrDue = child.effectiveDate ?? '';

  const fromPreparation = (location.state as LocationState)?.fromPreparation;
  const persisted = loadCalculationPlan();
  const conflictDetected = hasDataConflict(persisted, fromPreparation);

  const [conflictResolved, setConflictResolved] = useState(!conflictDetected);
  const [view, setView] = useState<View>('input');
  const [editingVariant, setEditingVariant] = useState<EditingVariant>('A');
  const [plan, setPlan] = useState<ElterngeldCalculationPlan>(() => {
    if (conflictDetected) return persisted!;
    return getInitialPlan(fromPreparation, birthOrDue);
  });
  const [planB, setPlanB] = useState<ElterngeldCalculationPlan | null>(() => {
    const loaded = loadVariantBPlan();
    return loaded && !isPlanEmpty(loaded) ? loaded : null;
  });
  const [result, setResult] = useState<CalculationResult | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [variantBIsOutdated, setVariantBIsOutdated] = useState(false);

  const currentPlan = editingVariant === 'A' ? plan : planB!;
  const setCurrentPlan = editingVariant === 'A' ? setPlan : setPlanB;

  const handleCalculate = useCallback(() => {
    const res = calculatePlan(currentPlan);
    setResult(res);
    setView('result');
  }, [currentPlan]);

  const handleShowComparison = useCallback(() => {
    if (!planB) return;
    setResult(null);
    setView('compare');
  }, [planB]);

  useEffect(() => {
    if (!isPlanEmpty(plan)) {
      saveCalculationPlan(plan);
    }
  }, [plan]);

  useEffect(() => {
    if (planB && !isPlanEmpty(planB)) {
      saveVariantBPlan(planB);
    }
  }, [planB]);

  const handleBack = useCallback(() => {
    setView('input');
  }, []);

  const handleReset = useCallback(() => {
    clearCalculationPlan();
    clearVariantBPlan();
    setPlan(createDefaultPlan(birthOrDue, true));
    setPlanB(null);
    setVariantBIsOutdated(false);
    setView('input');
    setResult(null);
    setEditingVariant('A');
    setConflictResolved(true);
    showToast('Berechnung zurückgesetzt', { kind: 'success', durationMs: 3000 });
  }, [birthOrDue, showToast]);

  const handleCreateVariantB = useCallback(() => {
    const copy = duplicatePlan(plan);
    setPlanB(copy);
    setVariantBIsOutdated(false);
    setEditingVariant('B');
    showToast('Alternative Variante erstellt. Sie können sie jetzt anpassen.', {
      kind: 'success',
      durationMs: 3000,
    });
  }, [plan, showToast]);

  const handleRemoveVariantB = useCallback(() => {
    clearVariantBPlan();
    setPlanB(null);
    setVariantBIsOutdated(false);
    setEditingVariant('A');
    setView('input');
    setResult(null);
    showToast('Alternative Variante entfernt.', { kind: 'success', durationMs: 2000 });
  }, [showToast]);

  const handleUsePersisted = useCallback(() => {
    setConflictResolved(true);
  }, []);

  const handleUseFromPreparation = useCallback(() => {
    if (!fromPreparation) return;
    setPlan(fromPreparation);
    saveCalculationPlan(fromPreparation);
    const hasB = planB && !isPlanEmpty(planB);
    if (hasB) setVariantBIsOutdated(true);
    setConflictResolved(true);
    setView('input');
    setResult(null);
    showToast(
      hasB
        ? 'Aktueller Plan wurde aktualisiert. Ihre alternative Variante bleibt erhalten.'
        : 'Neue Vorbereitungsdaten wurden übernommen.',
      { kind: 'success', durationMs: 3000 }
    );
  }, [fromPreparation, planB, showToast]);

  const handleUseFromPreparationAndResetB = useCallback(() => {
    if (!fromPreparation) return;
    setPlan(fromPreparation);
    saveCalculationPlan(fromPreparation);
    clearVariantBPlan();
    setPlanB(null);
    setVariantBIsOutdated(false);
    setEditingVariant('A');
    setConflictResolved(true);
    setView('input');
    setResult(null);
    showToast('Beide Varianten wurden neu gestartet.', { kind: 'success', durationMs: 3000 });
  }, [fromPreparation, showToast]);

  const handleCreatePdf = useCallback(async () => {
    if (!result) return;
    setIsSubmitting(true);
    try {
      const blob = buildElterngeldCalculationPdf(result);
      await addDocument({
        title: 'Elterngeld-Berechnung',
        createdAt: new Date().toISOString(),
        mimeType: 'application/pdf',
        blob,
      });
      showToast('documents.elterngeld.pdfCreated', { kind: 'success', durationMs: 5000 });
    } catch (err) {
      console.error('[elterngeld-calculation] PDF creation failed', err);
      showToast('documents.elterngeld.pdfError', { kind: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  }, [result, showToast]);

  return (
    <div className="screen-placeholder elterngeld-screen">
      <section className="next-steps next-steps--plain elterngeld__section">
        <SectionHeader as="h1" title="Elterngeld-Berechnung" />
        <ElterngeldFlowStepper currentStep={view === 'input' ? 2 : 3} />
        <p className="elterngeld-calculation__subtitle">
          Unverbindliche Schätzung – Orientierung für Ihre Planung
        </p>
        <p className="elterngeld-calculation__storage-hint">
          Ihre Eingaben werden lokal gespeichert.
        </p>

        {conflictDetected && !conflictResolved && (
          <Card className="still-daily-checklist__card elterngeld-calculation__conflict-card">
            <p className="elterngeld-calculation__conflict-text">
              {planB && !isPlanEmpty(planB)
                ? 'Sie haben bereits einen gespeicherten Plan und eine alternative Variante. Gleichzeitig liegen neue Daten aus der Vorbereitung vor. Was möchten Sie verwenden?'
                : 'Sie haben bereits einen gespeicherten Berechnungsstand. Gleichzeitig liegen neue Daten aus der Vorbereitung vor. Was möchten Sie verwenden?'}
            </p>
            <div className="elterngeld-calculation__conflict-actions">
              <Button
                type="button"
                variant="primary"
                className="btn--softpill"
                onClick={handleUsePersisted}
              >
                {planB && !isPlanEmpty(planB)
                  ? 'Bestehende Varianten fortsetzen'
                  : 'Gespeicherten Stand fortsetzen'}
              </Button>
              <Button
                type="button"
                variant="secondary"
                className="btn--softpill"
                onClick={handleUseFromPreparation}
              >
                Aktuellen Plan mit neuen Vorbereitungsdaten ersetzen
              </Button>
              {planB && !isPlanEmpty(planB) && (
                <Button
                  type="button"
                  variant="ghost"
                  className="btn--softpill elterngeld-calculation__conflict-action--reset"
                  onClick={handleUseFromPreparationAndResetB}
                >
                  Beide Varianten neu starten
                </Button>
              )}
            </div>
            {planB && !isPlanEmpty(planB) && (
              <p className="elterngeld-calculation__conflict-hint">
                Bei „Aktuellen Plan ersetzen“ bleibt Ihre alternative Variante erhalten. Sie basiert
                möglicherweise nicht mehr auf der neuen Grundlage.
              </p>
            )}
          </Card>
        )}

        {conflictResolved && view === 'input' && (
          <>
            {planB && (
              <div className="elterngeld-variant-tabs" role="tablist">
                <button
                  type="button"
                  role="tab"
                  aria-selected={editingVariant === 'A'}
                  className={`elterngeld-variant-tab ${editingVariant === 'A' ? 'elterngeld-variant-tab--active' : ''}`}
                  onClick={() => setEditingVariant('A')}
                >
                  Aktueller Plan
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={editingVariant === 'B'}
                  className={`elterngeld-variant-tab ${editingVariant === 'B' ? 'elterngeld-variant-tab--active' : ''}`}
                  onClick={() => setEditingVariant('B')}
                >
                  Alternative Variante
                  {variantBIsOutdated && (
                    <span className="elterngeld-variant-tab__badge">älterer Stand</span>
                  )}
                </button>
              </div>
            )}
            {variantBIsOutdated && editingVariant === 'B' && (
              <div className="elterngeld-variant-outdated-hint">
                <p>
                  Diese alternative Variante basiert auf einem älteren Vorbereitungsstand. Der aktuelle
                  Plan wurde bereits mit neuen Daten aus der Vorbereitung aktualisiert.
                </p>
                <p className="elterngeld-variant-outdated-hint__secondary">
                  Sie können die Variante weiterhin vergleichen oder neu erstellen.
                </p>
              </div>
            )}
            <StepCalculationInput
              plan={editingVariant === 'A' ? plan : planB!}
              onChange={editingVariant === 'A' ? setPlan : (p) => setPlanB(p)}
            />
            <div className="elterngeld-nav elterngeld-nav--with-variants">
              {!planB && (
                <Button
                  type="button"
                  variant="secondary"
                  className="btn--softpill"
                  onClick={handleCreateVariantB}
                >
                  Alternative Variante erstellen
                </Button>
              )}
              {planB && (
                <Button
                  type="button"
                  variant="ghost"
                  className="elterngeld-nav__remove-variant"
                  onClick={handleRemoveVariantB}
                >
                  Alternative entfernen
                </Button>
              )}
              <Button
                type="button"
                variant="ghost"
                onClick={handleReset}
              >
                Neu beginnen
              </Button>
              {planB && (
                <Button
                  type="button"
                  variant="secondary"
                  className="btn--softpill"
                  onClick={handleShowComparison}
                >
                  Vergleich anzeigen
                </Button>
              )}
              <Button
                type="button"
                variant="primary"
                className="btn--softpill"
                onClick={handleCalculate}
              >
                Berechnung starten
              </Button>
            </div>
          </>
        )}

        {conflictResolved && view === 'compare' && planB && (
          <>
            <StepCalculationComparison
              resultA={calculatePlan(plan)}
              resultB={calculatePlan(planB)}
            />
            <div className="elterngeld-nav">
              <Button
                type="button"
                variant="ghost"
                onClick={handleBack}
              >
                Zurück zur Eingabe
              </Button>
            </div>
          </>
        )}

        {conflictResolved && view === 'result' && result && (
          <>
            <StepCalculationResult
              result={result}
              onCreatePdf={handleCreatePdf}
              isSubmitting={isSubmitting}
            />
            <div className="elterngeld-nav">
              <Button
                type="button"
                variant="ghost"
                onClick={handleBack}
              >
                Zurück zur Eingabe
              </Button>
            </div>
          </>
        )}
      </section>
    </div>
  );
};
