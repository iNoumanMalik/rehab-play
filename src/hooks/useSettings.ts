import { useSyncExternalStore } from 'react';
import { settingsStore, type Settings } from '../core/services/SettingsStore';

/** Subscribe to the global settings store. Returns [settings, patch]. */
export function useSettings(): [Settings, (patch: Partial<Settings>) => void] {
  const settings = useSyncExternalStore(settingsStore.subscribe, settingsStore.get, settingsStore.get);
  return [settings, (patch) => settingsStore.set(patch)];
}
