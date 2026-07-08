import { useSyncExternalStore } from 'react';
import { toastStore, type ToastItem } from '../core/services/ToastStore';

export function useToasts(): ToastItem[] {
  return useSyncExternalStore(toastStore.subscribe, toastStore.get, toastStore.get);
}
