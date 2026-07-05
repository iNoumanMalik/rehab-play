
import { useEffect, useRef } from 'react';
import { getWebcamStream } from '../utils/webcamManager';

interface WebcamProps {
  onVideoReady: (video: HTMLVideoElement) => void;
}

export const Webcam = ({ onVideoReady }: WebcamProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    let isMounted = true;

    const initWebcam = async () => {
      try {
        const stream = await getWebcamStream();
        
        if (videoRef.current && isMounted) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = async () => {
            if (videoRef.current && isMounted) {
              await videoRef.current.play();
              onVideoReady(videoRef.current);
            }
          };
        }
      } catch (error) {
        console.error('Error initializing webcam:', error);
      }
    };

    initWebcam();

    return () => {
      isMounted = false;
    };
  }, [onVideoReady]);

  return (
    <video
      ref={videoRef}
      className="w-full h-full object-cover"
      playsInline
      muted
      autoPlay
    />
  );
};
