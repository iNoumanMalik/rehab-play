
import { useEffect, useRef } from 'react';

interface WebcamProps {
  onVideoReady: (video: HTMLVideoElement) => void;
}

export const Webcam = ({ onVideoReady }: WebcamProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const startWebcam = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 1280, height: 720 }
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
            videoRef.current?.play();
            if (videoRef.current) {
              onVideoReady(videoRef.current);
            }
          };
        }
      } catch (error) {
        console.error('Error accessing webcam:', error);
      }
    };
    startWebcam();
  }, [onVideoReady]);

  return (
    <video
      ref={videoRef}
      className="w-full h-full object-cover"
      playsInline
      muted
    />
  );
};
