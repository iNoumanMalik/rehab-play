import type { GameMeta } from '../types';
import type { GameRegistration } from '../core/exercise';
import { butterflyGame } from './butterfly-rescue/butterflyGame';
import { fruitGame } from './fruit-harvest/fruitGame';
import { crystalGame } from './crystal-guardian/crystalGame';
import { cosmicGame } from './cosmic-defender/cosmicGame';

const GAME_META: Record<string, GameMeta> = {
  'butterfly-rescue': {
    id: 'butterfly-rescue',
    title: 'Butterfly Rescue',
    description: 'Catch magical butterflies while avoiding toxic moths. Improves hand-eye coordination, range of motion, and reaction time.',
    tag: 'Hand-Eye Coordination',
    icon: '🦋',
    rehabFocus: 'Shoulder flexion, lateral reaching',
    gradient: 'from-pink-600/30 via-rose-600/15 to-purple-600/30',
    border: 'border-pink-500/40 hover:border-pink-400/80',
    tagColor: 'text-pink-200 bg-pink-500/25',
    hoverGlow: 'shadow-pink-500/30',
  },
  'fruit-harvest': {
    id: 'fruit-harvest',
    title: 'Fruit Harvest',
    description: 'Collect recipe fruits at different heights while avoiding wrong ones. Enhances range of motion, flexibility, and memory.',
    tag: 'Range of Motion',
    icon: '🍎',
    rehabFocus: 'Full ROM, shoulder flexion, lateral bending',
    gradient: 'from-orange-600/30 via-amber-600/15 to-red-600/30',
    border: 'border-orange-500/40 hover:border-orange-400/80',
    tagColor: 'text-orange-200 bg-orange-500/25',
    hoverGlow: 'shadow-orange-500/30',
  },
  'crystal-guardian': {
    id: 'crystal-guardian',
    title: 'Crystal Guardian',
    description: 'Raise both arms to charge a magical crystal and fire energy blasts at approaching shadow enemies.',
    tag: 'Strength Training',
    icon: '💎',
    rehabFocus: 'Bilateral overhead press, shoulder stability',
    gradient: 'from-blue-600/30 via-cyan-600/15 to-teal-600/30',
    border: 'border-blue-500/40 hover:border-blue-400/80',
    tagColor: 'text-cyan-200 bg-cyan-500/25',
    hoverGlow: 'shadow-blue-500/30',
  },
  'cosmic-defender': {
    id: 'cosmic-defender',
    title: 'Cosmic Defender',
    description: 'Pilot a station defense grid: aim by reaching, fire by punching, dodge by leaning, and sweep the radar with your head through 13 escalating encounters.',
    tag: 'Reaction & Coordination',
    icon: '🛰️',
    rehabFocus: 'Reach, lean, head mobility, shoulder circles',
    gradient: 'from-indigo-600/30 via-violet-600/15 to-fuchsia-600/30',
    border: 'border-indigo-500/40 hover:border-indigo-400/80',
    tagColor: 'text-indigo-200 bg-indigo-500/25',
    hoverGlow: 'shadow-indigo-500/30',
  },
};

const REGISTRATIONS: Record<string, GameRegistration> = {
  'butterfly-rescue': butterflyGame,
  'fruit-harvest': fruitGame,
  'crystal-guardian': crystalGame,
  'cosmic-defender': cosmicGame,
};

export function getGameMeta(id: string): GameMeta | undefined {
  return GAME_META[id];
}

export function getAllGameMeta(): GameMeta[] {
  return Object.values(GAME_META);
}

export function getGameRegistration(id: string): GameRegistration {
  const reg = REGISTRATIONS[id];
  if (!reg) throw new Error(`Unknown game: ${id}`);
  return reg;
}
