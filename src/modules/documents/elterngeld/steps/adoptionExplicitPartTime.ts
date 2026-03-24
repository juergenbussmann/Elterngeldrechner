/**
 * Übernahme: Prüfung auf explizit eingetragene Teilzeitstunden (nur Adopt-Pfad).
 * Vorschlags- und Berechnungslogik (inkl. Stunden-Fallback) bleibt unbeeinflusst.
 */

import { duplicatePlan, validatePartnerBonus, type ElterngeldCalculationPlan } from '../calculation';
import type { ElterngeldApplication } from '../types/elterngeldTypes';

/** Anzeige-Hinweis: Schätzung mit Fallback ≠ ausreichende Nutzereingabe zur Übernahme. */
export const ADOPTION_EXPLICIT_PART_TIME_HINT =
  'Die angezeigte Schätzung kann fehlende Teilzeitstunden mit einem Fallback (z. B. 28 Stunden je Elternteil) ersetzen. Diese Variante kannst du erst übernehmen, wenn für alle betroffenen Elternteile die geplanten Wochenstunden fest eingetragen sind (nicht nur die Fallback-Schätzung).';

export function variantHasPartnerschaftsbonus(plan: ElterngeldCalculationPlan): boolean {
  return plan.parents.some((p) => p.months.some((m) => m.mode === 'partnerBonus'));
}

function variantUsesPartnerBonusForParent(plan: ElterngeldCalculationPlan, parentIndex: number): boolean {
  const p = plan.parents[parentIndex];
  return p ? p.months.some((m) => m.mode === 'partnerBonus') : false;
}

function explicitHoursFromApplication(app: ElterngeldApplication, parentIndex: 0 | 1): boolean {
  if (parentIndex === 0) {
    return app.parentA.plannedPartTime && (app.parentA.hoursPerWeek ?? 0) > 0;
  }
  if (app.applicantMode !== 'both_parents' || !app.parentB) return false;
  return app.parentB.plannedPartTime && (app.parentB.hoursPerWeek ?? 0) > 0;
}

/** Rechner-Pfad ohne Vorbereitung: je Lebensmonat mit PB in der Variante müssen im Nutzerplan Stunden gesetzt sein. */
function explicitHoursOnUserPlanForVariantPartnerBonus(
  variantPlan: ElterngeldCalculationPlan,
  userPlan: ElterngeldCalculationPlan
): boolean {
  for (let pi = 0; pi < variantPlan.parents.length; pi++) {
    if (!variantUsesPartnerBonusForParent(variantPlan, pi)) continue;
    const vParent = variantPlan.parents[pi];
    const uParent = userPlan.parents[pi];
    if (!uParent) return false;
    for (const vm of vParent.months) {
      if (vm.mode !== 'partnerBonus') continue;
      const um = uParent.months.find((x) => x.month === vm.month);
      if (!um || um.hoursPerWeek == null || um.hoursPerWeek <= 0) return false;
    }
  }
  return true;
}

/**
 * @param variantPlan – zu übernehmender Vorschlagsplan (kann Fallback-Stunden enthalten).
 * @param userPlan – aktueller Nutzer-/Vergleichsplan (Eingabestand vor der Variante).
 * @param application – Vorbereitung; wenn gesetzt, gelten geplante Teilzeitstunden wie in applicationToCalculationPlan.
 */
export function isAdoptionExplicitPartTimeSatisfied(
  variantPlan: ElterngeldCalculationPlan,
  userPlan: ElterngeldCalculationPlan,
  application?: ElterngeldApplication | null
): boolean {
  if (!variantHasPartnerschaftsbonus(variantPlan)) return true;

  const needsA = variantUsesPartnerBonusForParent(variantPlan, 0);
  const needsB = variantPlan.parents.length > 1 && variantUsesPartnerBonusForParent(variantPlan, 1);

  if (application) {
    if (needsA && !explicitHoursFromApplication(application, 0)) return false;
    if (needsB && !explicitHoursFromApplication(application, 1)) return false;
    return true;
  }

  return explicitHoursOnUserPlanForVariantPartnerBonus(variantPlan, userPlan);
}

/**
 * Kopie der Varianten-PB-Struktur mit Stunden ausschließlich aus dem Nutzereingabestand (Vorbereitung oder Plan),
 * damit validatePartnerBonus dieselbe zentrale PB-/Stundenlogik wie für einen „echten“ Plan auswertet – ohne Optimizer-Fallback.
 */
export function planForAdoptionPartnerBonusValidation(
  variantPlan: ElterngeldCalculationPlan,
  userPlan: ElterngeldCalculationPlan,
  application?: ElterngeldApplication | null
): ElterngeldCalculationPlan {
  const merged = duplicatePlan(variantPlan);

  const hoursFromApplication = (parentIndex: 0 | 1): number | undefined => {
    if (!application) return undefined;
    if (parentIndex === 0) {
      return application.parentA.plannedPartTime ? application.parentA.hoursPerWeek : undefined;
    }
    if (application.applicantMode !== 'both_parents' || !application.parentB) return undefined;
    return application.parentB.plannedPartTime ? application.parentB.hoursPerWeek : undefined;
  };

  for (let pi = 0; pi < merged.parents.length; pi++) {
    const mParent = merged.parents[pi];
    for (const m of mParent.months) {
      if (m.mode !== 'partnerBonus') continue;
      let h: number | undefined;
      if (application) {
        h = hoursFromApplication(pi === 0 ? 0 : 1);
      } else {
        const um = userPlan.parents[pi]?.months.find((x) => x.month === m.month);
        h = um?.hoursPerWeek;
      }
      if (h != null && h > 0) {
        m.hoursPerWeek = h;
      } else {
        delete m.hoursPerWeek;
      }
    }
  }
  return merged;
}

/** Zentrale validatePartnerBonus auf Plan mit expliziten Nutzerstunden (Adopt-Pfad / PB-Varianten). */
export function validatePartnerBonusWithExplicitUserHours(
  variantPlan: ElterngeldCalculationPlan,
  userPlan: ElterngeldCalculationPlan,
  application?: ElterngeldApplication | null
): ReturnType<typeof validatePartnerBonus> {
  const merged = planForAdoptionPartnerBonusValidation(variantPlan, userPlan, application);
  return validatePartnerBonus(merged);
}
