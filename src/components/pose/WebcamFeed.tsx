import { useEffect, useRef } from 'react';
import { getWebcamStream, stopWebcamStream } from '../../utils/webcamManager';

interface WebcamFeedProps {
  isCameraOn: boolean;
  onVideoReady: (video: HTMLVideoElement) => void;
  onVideoStopped: () => void;
  /** A specific, actionable message when the camera itself fails (permission
   * denied, no device, in use elsewhere). Called with null to clear a
   * previous error once init starts again. */
  onError?: (message: string | null) => void;
}

function describeWebcamError(e: unknown): string {
  const name = e instanceof DOMException ? e.name : undefined;
  switch (name) {
    case 'NotAllowedError':
      return "Camera access was blocked. Click the camera icon in your browser's address bar to allow it, then Retry.";
    case 'NotFoundError':
      return 'No camera was found on this device. Connect a webcam and try again.';
    case 'NotReadableError':
      return 'Your camera is being used by another app. Close it and try again.';
    default:
      return 'Could not access your camera. Check your device and browser permissions, then try again.';
  }
}

export function WebcamFeed({ isCameraOn, onVideoReady, onVideoStopped, onError }: WebcamFeedProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    let mounted = true;
    const init = async () => {
      onError?.(null);
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
        if (mounted) onError?.(describeWebcamError(e));
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
  }, [isCameraOn, onVideoReady, onVideoStopped, onError]);

  useEffect(() => {
    return () => stopWebcamStream();
  }, []);

  return <video ref={videoRef} className="w-full h-full object-cover -scale-x-100" playsInline muted autoPlay />;
}
