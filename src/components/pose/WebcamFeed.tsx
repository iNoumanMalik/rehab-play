import { useEffect, useRef } from 'react';
import { getWebcamStream, stopWebcamStream } from '../../utils/webcamManager';

interface WebcamFeedProps {
  isCameraOn: boolean;
  onVideoReady: (video: HTMLVideoElement) => void;
  onVideoStopped: () => void;
}

export function WebcamFeed({ isCameraOn, onVideoReady, onVideoStopped }: WebcamFeedProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    let mounted = true;
    const init = async () => {
      try {
        const stream = await getWebcamStream();
        if (videoRef.current && mounted) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = async () => {
            if (videoRef.current && mounted) {
              await videoRef.current.play();
              onVideoReady(videoRef.current);
            }
          };
        }
      } catch (e) {
        console.error('Webcam init error:', e);
      }
    };
    const disable = () => {
      stopWebcamStream();
      if (videoRef.current) videoRef.current.srcObject = null;
      onVideoStopped();
    };
    if (isCameraOn) init();
    else disable();
    return () => { mounted = false; };
  }, [isCameraOn, onVideoReady, onVideoStopped]);

  useEffect(() => {
    return () => stopWebcamStream();
  }, []);

  return <video ref={videoRef} className="w-full h-full object-cover -scale-x-100" playsInline muted autoPlay />;
}
