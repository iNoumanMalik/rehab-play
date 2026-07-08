import { useSyncExternalStore } from 'react';
import { progressionStore, type ProgressionSnapshot } from '../core/services/ProgressionStore';

/** Reactive snapshot of the player's level/XP/streak/daily-goal progress. */
export function useProgression(): ProgressionSnapshot {
  return useSyncExternalStore(
    progressionStore.subscribe,
    () => progressionStore.snapshot(),
    () => progressionStore.snapshot(),
  );
}
