import { useEffect, useRef } from 'react';
import { getWebcamStream, stopWebcamStream } from '../utils/webcamManager';

interface WebcamProps {
  isCameraOn?: boolean;
  onVideoReady: (video: HTMLVideoElement) => void;
  onVideoStopped?: () => void;
}

export const Webcam = ({ isCameraOn = true, onVideoReady, onVideoStopped }: WebcamProps) => {
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

    const disableWebcam = () => {
      stopWebcamStream();
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
      if (onVideoStopped) {
        onVideoStopped();
      }
    };

    if (isCameraOn) {
      initWebcam();
    } else {
      disableWebcam();
    }

    return () => {
      isMounted = false;
    };
  }, [isCameraOn, onVideoReady, onVideoStopped]);

  // Handle unmount cleanups
  useEffect(() => {
    return () => {
      stopWebcamStream();
    };
  }, []);

  return (
    <video
      ref={videoRef}
      className="w-full h-full object-cover -scale-x-100"
      playsInline
      muted
      autoPlay
    />
  );
};
