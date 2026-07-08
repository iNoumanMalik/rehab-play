export type ToastKind = 'achievement' | 'levelup' | 'streak' | 'goal';

export interface ToastItem {
  id: number;
  kind: ToastKind;
  icon: string;
  title: string;
  description?: string;
}

const AUTO_DISMISS_MS = 4200;

/** Reactive singleton queue of celebratory toasts (achievements, level-ups, streaks, daily goal). */
class ToastStore {
  private items: ToastItem[] = [];
  private listeners = new Set<() => void>();
  private nextId = 1;

  get = (): ToastItem[] => this.items;

  subscribe = (fn: () => void): (() => void) => {
    this.listeners.add(fn);
    return () => { this.listeners.delete(fn); };
  };

  push(toast: Omit<ToastItem, 'id'>): void {
    const item: ToastItem = { ...toast, id: this.nextId++ };
    this.items = [...this.items, item];
    this.listeners.forEach(l => l());
    setTimeout(() => this.dismiss(item.id), AUTO_DISMISS_MS);
  }

  dismiss(id: number): void {
    const next = this.items.filter(i => i.id !== id);
    if (next.length === this.items.length) return;
    this.items = next;
    this.listeners.forEach(l => l());
  }
}

export const toastStore = new ToastStore();
