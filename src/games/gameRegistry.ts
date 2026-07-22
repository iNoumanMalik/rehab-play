import type { GameMeta } from '../types';
import type { GameRegistration } from '../core/exercise';
import { butterflyGame } from './butterfly-rescue/butterflyGame';
import { fruitGame } from './fruit-harvest/fruitGame';
import { crystalGame } from './crystal-guardian/crystalGame';
import { cosmicGame } from './cosmic-defender/cosmicGame';
import { fruitSliceGame } from './fruit-slice/fruitSliceGame';
import { wallPainterGame } from './wall-painter/wallPainterGame';
import { tiltMazeGame } from './tilt-maze/tiltMazeGame';

const GAME_META: Record<string, GameMeta> = {
  'butterfly-rescue': {
    id: 'butterfly-rescue',
    title: 'Butterfly Rescue',
    description: 'Catch magical butterflies while avoiding toxic moths. Improves hand-eye coordination, range of motion, and reaction time.',
    tag: 'Hand-Eye Coordination',
    icon: '🦋',
    rehabFocus: 'Shoulder flexion, lateral reaching',
    tone: 'accent',
    instructions: 'Move your hands over butterflies to catch them. Avoid the brown moths!',
  },
  'fruit-harvest': {
    id: 'fruit-harvest',
    title: 'Fruit Harvest',
    description: 'Collect recipe fruits at different heights while avoiding wrong ones. Enhances range of motion, flexibility, and memory.',
    tag: 'Range of Motion',
    icon: '🍎',
    rehabFocus: 'Full ROM, shoulder flexion, lateral bending',
    tone: 'warning',
    instructions: 'Reach up high and down low to collect recipe fruits. Watch out for wrong fruits!',
  },
  'crystal-guardian': {
    id: 'crystal-guardian',
    title: 'Crystal Guardian',
    description: 'Raise both arms to charge a magical crystal and fire energy blasts at approaching shadow enemies.',
    tag: 'Strength Training',
    icon: '💎',
    rehabFocus: 'Bilateral overhead press, shoulder stability',
    tone: 'success',
    instructions: 'Raise both arms overhead to charge the crystal. Release to blast enemies!',
  },
  'cosmic-defender': {
    id: 'cosmic-defender',
    title: 'Cosmic Defender',
    description: 'Pilot a station defense grid: aim by reaching, fire by punching, dodge by leaning, and sweep the radar with your head through 13 escalating encounters.',
    tag: 'Reaction & Coordination',
    icon: '🛰️',
    rehabFocus: 'Reach, lean, head mobility, shoulder circles',
    tone: 'neutral',
    instructions: 'Reach to aim, punch to fire, lean to dodge, and turn your head to sweep the radar — the station throws a new challenge every wave.',
  },
  'fruit-slice': {
    id: 'fruit-slice',
    title: 'Fruit Slice',
    description: 'Swipe your arms across the frame to slice falling fruit, Fruit-Ninja style — dodge the bombs.',
    tag: 'Swipe Coordination',
    icon: '🍉',
    rehabFocus: 'Lateral reach, swipe speed & shoulder mobility',
    tone: 'accent',
    instructions: 'Swipe your arm through the fruit with a real reach — avoid slicing the bombs!',
  },
  'wall-painter': {
    id: 'wall-painter',
    title: 'Wall Painter',
    description: 'Carry pigment from paint wells to canvases and mix each one to its target color — a reach-driven color-balancing puzzle.',
    tag: 'Range of Motion',
    icon: '🎨',
    rehabFocus: 'Full-ROM reach, carry & bilateral coordination',
    tone: 'warning',
    instructions: 'Reach a paint well to load color, then carry it to a canvas and hold to mix it toward the target shown above each one.',
  },
  'tilt-maze': {
    id: 'tilt-maze',
    title: 'Tilt Maze',
    description: 'Lean left and right to steer a ball through a labyrinth; lean forward to push through faster. Calibrates to your own comfortable lean — seated or standing.',
    tag: 'Core & Balance',
    icon: '🧭',
    rehabFocus: 'Trunk control, weight-shifting & core stability',
    tone: 'success',
    instructions: 'Lean left or right to dodge walls — the ball rolls toward the flag on its own. Lean forward to speed up!',
  },
};

const REGISTRATIONS: Record<string, GameRegistration> = {
  'butterfly-rescue': butterflyGame,
  'fruit-harvest': fruitGame,
  'crystal-guardian': crystalGame,
  'cosmic-defender': cosmicGame,
  'fruit-slice': fruitSliceGame,
  'wall-painter': wallPainterGame,
  'tilt-maze': tiltMazeGame,
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
