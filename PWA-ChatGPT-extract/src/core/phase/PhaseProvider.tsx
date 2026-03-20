import React, { useCallback, useEffect, useMemo, useState } from 'react';
import type { PhaseMode, PhaseProfile, PhaseSnapshot } from './types';
import { computePhaseSnapshot } from './phaseService';
import {
  clearPhaseProfile,
  getPhaseProfile,
  updatePhaseProfile,
} from './phaseStore';

type PhaseActions = {
  setMode: (mode: PhaseMode) => void;
  setDueDate: (dueDateIso: string) => void;
  setBirthDate: (birthDateIso: string) => void;
  clear: () => void;
};

type PhaseContextValue = {
  profile: PhaseProfile | null;
  snapshot: PhaseSnapshot | null;
  actions: PhaseActions;
};

const PhaseContext = React.createContext<PhaseContextValue | null>(null);

const HOUR_MS = 60 * 60 * 1000;

function computeSnapshot(profile: PhaseProfile | null, now: Date): PhaseSnapshot | null {
  if (!profile) return null;
  return computePhaseSnapshot(profile, now);
}

export const PhaseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [profile, setProfileState] = useState<PhaseProfile | null>(() => getPhaseProfile());
  const [tick, setTick] = useState(0);

  const snapshot = useMemo(
    () => computeSnapshot(profile, new Date()),
    // tick: stündlicher Refresh-Trigger, damit snapshot neu berechnet wird
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [profile, tick]
  );

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), HOUR_MS);
    return () => clearInterval(id);
  }, []);

  const setMode = useCallback((mode: PhaseMode) => {
    const next = updatePhaseProfile({ mode });
    setProfileState(next);
  }, []);

  const setDueDate = useCallback((dueDateIso: string) => {
    const next = updatePhaseProfile({
      mode: 'pregnancy',
      dueDateIso,
      birthDateIso: undefined,
    });
    setProfileState(next);
  }, []);

  const setBirthDate = useCallback((birthDateIso: string) => {
    const next = updatePhaseProfile({
      mode: 'postpartum',
      birthDateIso,
      dueDateIso: undefined,
    });
    setProfileState(next);
  }, []);

  const clear = useCallback(() => {
    clearPhaseProfile();
    setProfileState(null);
  }, []);

  const actions = useMemo<PhaseActions>(
    () => ({ setMode, setDueDate, setBirthDate, clear }),
    [setMode, setDueDate, setBirthDate, clear]
  );

  const value = useMemo<PhaseContextValue>(
    () => ({ profile, snapshot, actions }),
    [profile, snapshot, actions]
  );

  return <PhaseContext.Provider value={value}>{children}</PhaseContext.Provider>;
};

export { PhaseContext };
