
import { useEffect, useRef, useState } from 'react';
import { FilesetResolver, PoseLandmarker } from '@mediapipe/tasks-vision';
import type { PoseLandmark } from '../types';

export const usePoseTracking = (videoRef: React.RefObject<HTMLVideoElement | null>) => {
  const [landmarks, setLandmarks] = useState<PoseLandmark[]>([]);
  const [isReady, setIsReady] = useState(false);
  const poseLandmarkerRef = useRef<PoseLandmarker | null>(null);
  const lastVideoTimeRef = useRef(-1);
  const landmarksRef = useRef<PoseLandmark[]>([]);

  useEffect(() => {
    const loadPoseLandmarker = async () => {
      try {
        const vision = await FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm'
        );
        poseLandmarkerRef.current = await PoseLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task',
            delegate: 'GPU'
          },
          runningMode: 'VIDEO',
          numPoses: 1,
          minPoseDetectionConfidence: 0.5,
          minPosePresenceConfidence: 0.5,
          minTrackingConfidence: 0.5,
        });
        setIsReady(true);
      } catch (error) {
        console.error('Error loading Pose Landmarker:', error);
      }
    };
    loadPoseLandmarker();
  }, []);

  useEffect(() => {
    let animationId: number;

    const detectPose = async () => {
      if (!poseLandmarkerRef.current || !videoRef.current) {
        animationId = requestAnimationFrame(detectPose);
        return;
      }

      const video = videoRef.current;
      if (video.currentTime === lastVideoTimeRef.current) {
        animationId = requestAnimationFrame(detectPose);
        return;
      }

      lastVideoTimeRef.current = video.currentTime;
      const results = poseLandmarkerRef.current.detectForVideo(video, performance.now());
      
      if (results.landmarks && results.landmarks.length > 0) {
        const lm = results.landmarks[0] as PoseLandmark[];
        landmarksRef.current = lm;
        setLandmarks(lm);
      }

      animationId = requestAnimationFrame(detectPose);
    };

    if (isReady && videoRef.current) {
      animationId = requestAnimationFrame(detectPose);
    }

    return () => {
      if (animationId) cancelAnimationFrame(animationId);
    };
  }, [isReady, videoRef]);

  return { landmarks, landmarksRef, isReady };
};
