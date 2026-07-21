import { useEffect, useState } from 'react';
import type { PoseData } from '../types';
import { torsoLength, upperBodyTracked } from '../core/exercise';

export type DistanceStatus = 'ok' | 'too-close' | 'too-far' | 'unknown';
export type LightingStatus = 'ok' | 'low' | 'unknown';

export interface TrackingHealth {
  distance: DistanceStatus;
  lighting: LightingStatus;
  tracked: boolean;
}

const SAMPLE_MS = 900;
const UNKNOWN: TrackingHealth = { distance: 'unknown', lighting: 'unknown', tracked: false };

/**
 * Lightweight, polled (not per-frame) heuristics for "is the setup actually
 * usable right now" — too close/far from the camera (via calibrated torso
 * size) and low ambient light (via a downsampled video-frame luminance
 * sample). Feeds the non-blocking TrackingStatusBanner: error PREVENTION,
 * not just an error message after the fact.
 */
export function useTrackingHealth(
  videoRef: React.RefObject<HTMLVideoElement | null>,
  poseDataRef: React.RefObject<PoseData | null>,
  active: boolean,
): TrackingHealth {
  const [health, setHealth] = useState<TrackingHealth>(UNKNOWN);

  useEffect(() => {
    if (!active) return;

    const canvas = document.createElement('canvas');
    canvas.width = 16;
    canvas.height = 16;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    const id = window.setInterval(() => {
      const pose = poseDataRef.current;
      const lm = pose?.smoothLandmarks ?? [];
      const tracked = pose != null && upperBodyTracked(lm);

      let distance: DistanceStatus = 'unknown';
      if (tracked) {
        const t = torsoLength(lm); // normalized landmark-space distance, roughly 0.15 (far) .. 0.45+ (close)
        distance = t > 0.42 ? 'too-close' : t < 0.15 ? 'too-far' : 'ok';
      }

      let lighting: LightingStatus = 'unknown';
      const video = videoRef.current;
      if (video && ctx && video.videoWidth > 0) {
        try {
          ctx.drawImage(video, 0, 0, 16, 16);
          const { data } = ctx.getImageData(0, 0, 16, 16);
          let sum = 0;
          for (let i = 0; i < data.length; i += 4) {
            sum += 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
          }
          const avg = sum / (data.length / 4);
          lighting = avg < 40 ? 'low' : 'ok';
        } catch {
          lighting = 'unknown'; // e.g. a frame mid-teardown — never let this throw
        }
      }

      setHealth({ distance, lighting, tracked });
    }, SAMPLE_MS);

    return () => {
      window.clearInterval(id);
      setHealth(UNKNOWN);
    };
  }, [active, videoRef, poseDataRef]);

  return health;
}
