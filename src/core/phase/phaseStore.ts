import type { PhaseProfile } from './types';

const STORAGE_KEY = 'app_phase_profile_v1';

function toIso(): string {
  return new Date().toISOString();
}

export function getPhaseProfile(): PhaseProfile | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (
      parsed &&
      typeof parsed === 'object' &&
      typeof (parsed as PhaseProfile).mode === 'string' &&
      typeof (parsed as PhaseProfile).createdAtIso === 'string' &&
      typeof (parsed as PhaseProfile).updatedAtIso === 'string'
    ) {
      const p = parsed as PhaseProfile;
      if (p.mode !== 'pregnancy' && p.mode !== 'postpartum') return null;
      return p;
    }
    return null;
  } catch {
    return null;
  }
}

export function setPhaseProfile(profile: PhaseProfile): void {
  try {
    const withTimestamps: PhaseProfile = {
      ...profile,
      updatedAtIso: toIso(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(withTimestamps));
  } catch {
    // silently fail on quota / security errors
  }
}

export function updatePhaseProfile(patch: Partial<PhaseProfile>): PhaseProfile {
  const now = toIso();
  const existing = getPhaseProfile();
  const base: PhaseProfile = existing ?? {
    mode: 'pregnancy',
    createdAtIso: now,
    updatedAtIso: now,
  };
  const merged: PhaseProfile = {
    ...base,
    ...patch,
    updatedAtIso: now,
  };
  setPhaseProfile(merged);
  return merged;
}

export function clearPhaseProfile(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
