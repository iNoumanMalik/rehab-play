/**
 * Auto-discovers Mixamo FBX files dropped into src/assets/trainer/. Adding a
 * new exercise is just adding a new .fbx file here — no registration step.
 * `Idle.fbx` is reserved as the waiting/rest pose and excluded from the
 * exercise rotation.
 */
const fbxModules = import.meta.glob('/src/assets/trainer/*.fbx', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>;

export interface TrainerClip {
  /** Stable, filename-derived id (kebab-case). */
  id: string;
  /** Human-readable label derived from the filename. */
  name: string;
  /** Resolved asset URL for the FBX file. */
  url: string;
}

function filenameToWords(base: string): string {
  return base
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function toId(words: string): string {
  return words.toLowerCase().replace(/\s+/g, '-');
}

const IDLE_FILENAME = 'idle.fbx';

interface DiscoveredClip extends TrainerClip {
  filename: string;
}

const allClips: DiscoveredClip[] = Object.entries(fbxModules)
  .map(([path, url]) => {
    const filename = path.split('/').pop()!;
    const base = filename.replace(/\.fbx$/i, '');
    const words = filenameToWords(base);
    return { id: toId(words), name: words, url, filename: filename.toLowerCase() };
  })
  .sort((a, b) => a.name.localeCompare(b.name));

const idleEntry = allClips.find(clip => clip.filename === IDLE_FILENAME);
if (!idleEntry) {
  throw new Error('Idle.fbx is required in src/assets/trainer/ as the waiting animation.');
}

/** The waiting/rest pose, played before a session starts and while paused. */
export const IDLE_CLIP: TrainerClip = idleEntry;

/** Every other FBX in the folder — the pool of exercises a session cycles through. */
export const EXERCISE_CLIPS: TrainerClip[] = allClips.filter(clip => clip.filename !== IDLE_FILENAME);
