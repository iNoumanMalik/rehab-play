import { useSyncExternalStore } from 'react';
import { voiceGuidance, type SpokenLine } from '../core/services/VoiceGuidanceService';

export function useLastSpoken(): SpokenLine | null {
  return useSyncExternalStore(voiceGuidance.subscribe, () => voiceGuidance.lastSpoken, () => voiceGuidance.lastSpoken);
}
