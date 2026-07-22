import type { TextSize, Theme } from '../../core/services/SettingsStore';

/** Shared between SettingsMenu and Onboarding so the two pickers can't drift apart. */
export const THEME_OPTIONS: { value: Theme; label: string }[] = [
  { value: 'dark', label: '🌙 Dark' },
  { value: 'light', label: '☀️ Light' },
];

export const TEXT_SIZE_OPTIONS: { value: TextSize; label: string }[] = [
  { value: 'sm', label: 'Small' },
  { value: 'md', label: 'Medium' },
  { value: 'lg', label: 'Large' },
  { value: 'xl', label: 'X-Large' },
];
