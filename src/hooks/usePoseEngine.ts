import { useRef, useCallback, useEffect, useState } from 'react';
import { FilesetResolver, PoseLandmarker } from '@mediapipe/tasks-vision';
import { PoseEngine } from '../core/pose/PoseEngine';
import type { PoseLandmark, PoseData } from '../types';

export function usePoseEngine(videoRef: React.RefObject<HTMLVideoElement | null>) {
  const [poseData, setPoseData] = useState<PoseData | null>(null);
  const [isReady, setIsReady] = useState(false);
  const poseEngineRef = useRef(new PoseEngine());
  const landmarkerRef = useRef<PoseLandmarker | null>(null);
  const animRef = useRef(0);
  const lastTimeRef = useRef(-1);
  const poseDataRef = useRef<PoseData | null>(null);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const vision = await FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm',
        );
        const landmarker = await PoseLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task',
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
        const processed = poseEngineRef.current.process(raw);
        poseDataRef.current = processed;
        setPoseData(processed);
      }

      animRef.current = requestAnimationFrame(loop);
    };

    animRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animRef.current);
  }, [isReady, videoRef]);

  const resetPose = useCallback(() => {
    poseEngineRef.current.reset();
  }, []);

  return { poseData, poseDataRef, isReady, resetPose };
}
