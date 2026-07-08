import { useRef, useCallback, useEffect, useState } from 'react';
import { FilesetResolver, PoseLandmarker } from '@mediapipe/tasks-vision';
import { PoseEngine } from '../core/pose/PoseEngine';
import type { PoseLandmark, PoseData } from '../types';

// Pin the wasm bundle to the installed @mediapipe/tasks-vision version so the
// runtime and the loader stay in lockstep.
const TASKS_VISION_VERSION = '0.10.35';
const WASM_URL = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${TASKS_VISION_VERSION}/wasm`;
const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task';

export function usePoseEngine(videoRef: React.RefObject<HTMLVideoElement | null>) {
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const poseEngineRef = useRef(new PoseEngine());
  const landmarkerRef = useRef<PoseLandmarker | null>(null);
  const animRef = useRef(0);
  const lastTimeRef = useRef(-1);
  // Pose data is shared with games via this ref (read every frame inside their
  // own rAF loops) so it deliberately does NOT trigger React re-renders.
  const poseDataRef = useRef<PoseData | null>(null);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const vision = await FilesetResolver.forVisionTasks(WASM_URL);
        const landmarker = await PoseLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: MODEL_URL,
            delegate: 'GPU',
          },
          runningMode: 'VIDEO',
          numPoses: 1,
          minPoseDetectionConfidence: 0.5,
          minPosePresenceConfidence: 0.5,
          minTrackingConfidence: 0.5,
        });
        if (mounted) {
          landmarkerRef.current = landmarker;
          setIsReady(true);
        }
      } catch (e) {
        console.error('Failed to load pose landmarker:', e);
        if (mounted) setError('Motion tracking failed to load. Check your connection and try again.');
      }
    };
    load();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (!isReady) return;

    const loop = async () => {
      const video = videoRef.current;
      const landmarker = landmarkerRef.current;
      if (!video || !landmarker || !video.videoWidth) {
        animRef.current = requestAnimationFrame(loop);
        return;
      }

      if (video.currentTime === lastTimeRef.current) {
        animRef.current = requestAnimationFrame(loop);
        return;
      }

      lastTimeRef.current = video.currentTime;
      const results = landmarker.detectForVideo(video, performance.now());

      if (results.landmarks && results.landmarks.length > 0) {
        const raw = results.landmarks[0] as PoseLandmark[];
        poseDataRef.current = poseEngineRef.current.process(raw);
      }

      animRef.current = requestAnimationFrame(loop);
    };

    animRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animRef.current);
  }, [isReady, videoRef]);

  const resetPose = useCallback(() => {
    poseEngineRef.current.reset();
  }, []);

  return { poseDataRef, isReady, error, resetPose };
}
