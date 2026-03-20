export type PhaseMode = 'pregnancy' | 'postpartum';

export interface PhaseProfile {
  mode: PhaseMode;
  // pregnancy:
  dueDateIso?: string; // ET
  // postpartum:
  birthDateIso?: string; // Geburtsdatum
  createdAtIso: string;
  updatedAtIso: string;
}

export interface PhaseSnapshot {
  mode: PhaseMode;
  todayIso: string;
  // pregnancy:
  ssw?: number; // Schwangerschaftswoche (1..42)
  daysToDue?: number; // negativ = über ET
  // postpartum:
  babyAgeDays?: number;
  babyWeek?: number; // 0..n
  babyMonth?: number; // 0..n
  label: string; // z.B. "SSW 28" oder "4. Lebenswoche"
}
