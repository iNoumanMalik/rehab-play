import { useEffect, useState } from 'react';

const SAMPLE_MS = 700;
const IDLE_AFTER_SEC = 8;
/** Mean grayscale delta (0-255 scale) below this counts as "no real motion" for this sample. */
const MOTION_THRESHOLD = 4;
const SAMPLE_SIZE = 20;

/**
 * Lightweight "is the user actually moving" signal for the trainer's webcam
 * feed — frame-to-frame grayscale difference on a tiny downsampled canvas
 * (same technique as the lighting check in useTrackingHealth), not a full
 * pose model. Enough to nudge someone who's gone still during an exercise
 * without pulling MediaPipe into a page that doesn't otherwise need it yet.
 */
export function useMotionActivity(videoRef: React.RefObject<HTMLVideoElement | null>, active: boolean): boolean {
  const [isIdle, setIsIdle] = useState(false);

  useEffect(() => {
    if (!active) {
      setIsIdle(false);
      return;
    }

    const canvas = document.createElement('canvas');
    canvas.width = SAMPLE_SIZE;
    canvas.height = SAMPLE_SIZE;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    let prevFrame: Uint8ClampedArray | null = null;
    let idleSeconds = 0;

    const id = window.setInterval(() => {
      const video = videoRef.current;
      if (!video || !ctx || video.videoWidth === 0) return;
      try {
        ctx.drawImage(video, 0, 0, SAMPLE_SIZE, SAMPLE_SIZE);
        const { data } = ctx.getImageData(0, 0, SAMPLE_SIZE, SAMPLE_SIZE);
        if (prevFrame) {
          const pixelCount = data.length / 4;
          let diffSum = 0;
          for (let i = 0; i < data.length; i += 4) {
            const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
            const prevGray = 0.299 * prevFrame[i] + 0.587 * prevFrame[i + 1] + 0.114 * prevFrame[i + 2];
            diffSum += Math.abs(gray - prevGray);
          }
          const avgDiff = diffSum / pixelCount;
          idleSeconds = avgDiff > MOTION_THRESHOLD ? 0 : idleSeconds + SAMPLE_MS / 1000;
          setIsIdle(idleSeconds >= IDLE_AFTER_SEC);
        }
        prevFrame = data;
      } catch {
        // ignore transient read errors (e.g. a frame mid-teardown) — next sample recovers
      }
    }, SAMPLE_MS);

    return () => {
      window.clearInterval(id);
      setIsIdle(false);
    };
  }, [active, videoRef]);

  return isIdle;
}
