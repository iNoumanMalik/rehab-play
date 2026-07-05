import type { GameMeta, PoseData } from '../types';

export interface GameComponentProps {
  poseDataRef: React.RefObject<PoseData | null>;
  onScoreUpdate: (s: number) => void;
  onSuccessUpdate: (c: number) => void;
  onRepetitionsUpdate?: (c: number) => void;
  onGameEnd: (stats: { score: number; level: number; maxCombo: number; accuracy: number; feedback: string[] }) => void;
  onFeedback: (m: string[]) => void;
  onComboUpdate: (c: number, m: number) => void;
}

export interface GameModule {
  id: string;
  meta: GameMeta;
  component: React.ComponentType<GameComponentProps>;
}

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
};

export function getGameMeta(id: string): GameMeta | undefined {
  return GAME_META[id];
}

export function getAllGameMeta(): GameMeta[] {
  return Object.values(GAME_META);
}

const gameLoaders: Record<string, () => Promise<GameModule>> = {};

export function registerGameLoader(id: string, loader: () => Promise<GameModule>): void {
  gameLoaders[id] = loader;
}

export function getGameLoader(id: string): (() => Promise<GameModule>) | undefined {
  return gameLoaders[id];
}

export function getRegisteredIds(): string[] {
  return Object.keys(gameLoaders);
}
