import { useEffect, useRef, useState } from 'react';

/**
 * Raw webcam preview only — no pose analysis yet. This is the seam where
 * MediaPipe pose comparison will hook in later (see project plan).
 */
export function useWebcamPreview(enabled: boolean) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    let stream: MediaStream | null = null;
    let cancelled = false;

    navigator.mediaDevices
      .getUserMedia({ video: { width: 480, height: 360, facingMode: 'user' }, audio: false })
      .then(s => {
        if (cancelled) {
          s.getTracks().forEach(track => track.stop());
          return;
        }
        stream = s;
        if (videoRef.current) {
          videoRef.current.srcObject = s;
          videoRef.current.onloadedmetadata = () => setReady(true);
        }
      })
      .catch(() => setError('Camera unavailable'));

    return () => {
      cancelled = true;
      stream?.getTracks().forEach(track => track.stop());
      setReady(false);
    };
  }, [enabled]);

  return { videoRef, error, ready };
}
