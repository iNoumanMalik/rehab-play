export type SessionDurationMinutes = 1 | 3 | 5;

export type SessionStatus = 'idle' | 'running' | 'paused' | 'completed';

/** How long a single exercise plays before the session advances to the next one. */
export const SEGMENT_SECONDS = 30;

/** Crossfade time (seconds) used whenever the mixer switches to a new clip. */
export const CROSSFADE_SECONDS = 0.5;
