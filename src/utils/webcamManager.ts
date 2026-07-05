
let webcamStream: MediaStream | null = null;

export const getWebcamStream = async (): Promise<MediaStream> => {
  if (webcamStream && webcamStream.active) {
    return webcamStream;
  }

  webcamStream = await navigator.mediaDevices.getUserMedia({
    video: { 
      width: { ideal: 1280 },
      height: { ideal: 720 },
      facingMode: 'user'
    }
  });

  return webcamStream;
};

export const stopWebcamStream = () => {
  if (webcamStream) {
    webcamStream.getTracks().forEach(track => track.stop());
    webcamStream = null;
  }
};
