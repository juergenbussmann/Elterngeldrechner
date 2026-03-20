import { useContext } from 'react';
import { PhaseContext } from './PhaseProvider';

export function usePhase() {
  const ctx = useContext(PhaseContext);
  if (!ctx) {
    throw new Error('usePhase must be used within a PhaseProvider');
  }
  const { profile, snapshot, actions } = ctx;
  return { profile, snapshot, actions };
}
