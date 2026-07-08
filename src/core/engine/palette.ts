import { settingsStore } from '../services/SettingsStore';

/**
 * Colour-blind-aware semantic colours. In colour-blind mode, red/green (the
 * hardest pair to distinguish) become orange/blue, which stay separable across
 * the common deficiency types. Shapes/labels carry meaning too, but colour
 * shouldn't actively mislead.
 */
export function danger(): string {
  return settingsStore.get().colorblind ? '#FF8F00' : '#EF5350';
}
export function safe(): string {
  return settingsStore.get().colorblind ? '#29B6F6' : '#69F0AE';
}
export function warn(): string {
  return '#FFD740';
}
