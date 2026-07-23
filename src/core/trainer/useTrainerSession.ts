import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { EXERCISE_CLIPS, IDLE_CLIP, type TrainerClip } from './manifest';
import { SEGMENT_SECONDS, type SessionDurationMinutes, type SessionStatus } from './types';

function buildQueue(totalSeconds: number): TrainerClip[] {
  const segmentCount = Math.max(1, Math.floor(totalSeconds / SEGMENT_SECONDS));
  return Array.from({ length: segmentCount }, (_, i) => EXERCISE_CLIPS[i % EXERCISE_CLIPS.length]);
}

export interface TrainerSession {
  status: SessionStatus;
  durationMinutes: SessionDurationMinutes | null;
  totalSeconds: number;
  totalRemainingSeconds: number;
  segmentIndex: number;
  segmentCount: number;
  segmentRemainingSeconds: number;
  completedCount: number;
  currentClip: TrainerClip;
  nextClip: TrainerClip | null;
  /** Clip the 3D avatar should currently be playing (idle while waiting/done). */
  activeClipId: string;
  /** True while paused — the avatar should hold its current pose, not idle out. */
  isFrozen: boolean;
  start: (minutes: SessionDurationMinutes) => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  /** Jump straight to the next exercise, whatever's left of the current segment. */
  skip: () => void;
}

export function useTrainerSession(): TrainerSession {
  const [status, setStatus] = useState<SessionStatus>('idle');
  const [durationMinutes, setDurationMinutes] = useState<SessionDurationMinutes | null>(null);
  const [totalSeconds, setTotalSeconds] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const queue = useMemo(() => buildQueue(totalSeconds), [totalSeconds]);
  const segmentCount = queue.length;

  useEffect(() => {
    if (status !== 'running') return;
    intervalRef.current = setInterval(() => {
      setElapsedSeconds(prev => prev + 1);
    }, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [status]);

  useEffect(() => {
    if ((status === 'running' || status === 'paused') && elapsedSeconds >= totalSeconds) {
      setStatus('completed');
    }
  }, [elapsedSeconds, totalSeconds, status]);

  const start = useCallback((minutes: SessionDurationMinutes) => {
    const seconds = minutes * 60;
    setDurationMinutes(minutes);
    setTotalSeconds(seconds);
    setElapsedSeconds(0);
    setStatus('running');
  }, []);

  const pause = useCallback(() => {
    setStatus(prev => (prev === 'running' ? 'paused' : prev));
  }, []);

  const resume = useCallback(() => {
    setStatus(prev => (prev === 'paused' ? 'running' : prev));
  }, []);

  const stop = useCallback(() => {
    setStatus('idle');
    setDurationMinutes(null);
    setTotalSeconds(0);
    setElapsedSeconds(0);
  }, []);

  const skip = useCallback(() => {
    setElapsedSeconds(prev => {
      const nextSegmentStart = (Math.floor(prev / SEGMENT_SECONDS) + 1) * SEGMENT_SECONDS;
      return Math.min(nextSegmentStart, totalSeconds);
    });
  }, [totalSeconds]);

  const clampedElapsed = Math.min(elapsedSeconds, totalSeconds);
  const totalRemainingSeconds = Math.max(0, totalSeconds - clampedElapsed);
  const segmentIndex = Math.min(segmentCount - 1, Math.floor(clampedElapsed / SEGMENT_SECONDS));
  const segmentRemainingSeconds = Math.max(
    0,
    SEGMENT_SECONDS - (clampedElapsed - segmentIndex * SEGMENT_SECONDS),
  );

  const isActive = status === 'running' || status === 'paused';
  const currentClip = isActive && queue[segmentIndex] ? queue[segmentIndex] : IDLE_CLIP;
  const nextClip = isActive ? (queue[segmentIndex + 1] ?? null) : null;
  const completedCount = status === 'completed' ? segmentCount : isActive ? segmentIndex : 0;
  const activeClipId = isActive ? currentClip.id : IDLE_CLIP.id;

  return {
    status,
    durationMinutes,
    totalSeconds,
    totalRemainingSeconds,
    segmentIndex,
    segmentCount,
    segmentRemainingSeconds,
    completedCount,
    currentClip,
    nextClip,
    activeClipId,
    isFrozen: status === 'paused',
    start,
    pause,
    resume,
    stop,
    skip,
  };
}
