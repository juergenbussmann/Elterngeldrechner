export { useBegleitungPlus, hasYearlyAccess } from './useBegleitungPlus';
export { isPlus, requirePlus } from './isPlus';
export type { Entitlements, PlanType } from './entitlements';
export {
  getEntitlements,
  setEntitlements,
  activatePlus,
  activatePlusWithPlan,
  deactivatePlus,
  activatePlusDev,
  deactivatePlusDev,
  activatePlusAdmin,
  deactivatePlusAdmin,
} from './begleitungPlusStore';
export {
  openBegleitungPlusUpsell,
  registerBegleitungPlusOpener,
} from './openBegleitungPlusUpsell';
export type { OpenBegleitungPlusUpsellOptions } from './openBegleitungPlusUpsell';
export { PlusSection } from './ui/PlusSection';
export type { PlusSectionProps } from './ui/PlusSection';
