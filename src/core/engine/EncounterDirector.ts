export interface EncounterBeat {
  id: string;
  /** Seconds into the stage this beat begins. */
  startsAt: number;
  /** Short dramatic name flashed when the beat starts ("Missile Barrage"). */
  label: string;
  /** Default objective-banner text while the beat is active. */
  objective: string;
}

/**
 * Authored stage timeline: instead of one endless spawn loop, a scene declares
 * beats ("Drone Wave" → "Missile Barrage" → "Boss") and asks the director
 * which one is active. `justEntered()` fires exactly once per transition so
 * scenes can announce it, change spawns, switch hazards, or unlock mechanics.
 */
export class EncounterDirector {
  private beats: EncounterBeat[];
  private currentIndex = 0;
  private lastAnnouncedIndex = -1;

  constructor(beats: EncounterBeat[]) {
    this.beats = [...beats].sort((a, b) => a.startsAt - b.startsAt);
  }

  update(elapsed: number): void {
    let nextIndex = 0;
    for (let i = 0; i < this.beats.length; i++) {
      if (elapsed >= this.beats[i].startsAt) nextIndex = i;
      else break;
    }
    this.currentIndex = nextIndex;
  }

  current(): EncounterBeat {
    return this.beats[this.currentIndex];
  }

  /** The beat that just became active this tick, or null if unchanged. */
  justEntered(): EncounterBeat | null {
    if (this.currentIndex === this.lastAnnouncedIndex) return null;
    this.lastAnnouncedIndex = this.currentIndex;
    return this.beats[this.currentIndex];
  }

  /** Seconds spent inside the current beat. */
  timeInBeat(elapsed: number): number {
    return Math.max(0, elapsed - this.current().startsAt);
  }

  index(): number {
    return this.currentIndex;
  }

  totalBeats(): number {
    return this.beats.length;
  }
}
