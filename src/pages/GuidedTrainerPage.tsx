import { useNavigate } from 'react-router-dom';
import { useTrainerSession } from '../core/trainer/useTrainerSession';
import { TrainerScene } from '../components/trainer/TrainerScene';
import { TrainerHUD } from '../components/trainer/TrainerHUD';
import { WebcamPiP } from '../components/trainer/WebcamPiP';
import { useWebcamPreview } from '../components/trainer/useWebcamPreview';
import { useMotionActivity } from '../components/trainer/useMotionActivity';

/** Full-screen cinematic guided-exercise trainer — bypasses the app chrome entirely. */
export function GuidedTrainerPage() {
  const navigate = useNavigate();
  const session = useTrainerSession();

  const isActive = session.status === 'running' || session.status === 'paused';
  const { videoRef, error, ready } = useWebcamPreview(isActive);
  // Only watch for stillness while actually running — paused is expected to be still.
  const isIdle = useMotionActivity(videoRef, session.status === 'running');

  return (
    <div className="fixed inset-0 bg-black">
      <TrainerScene activeClipId={session.activeClipId} isFrozen={session.isFrozen} />
      <TrainerHUD session={session} onExit={() => navigate('/')} isIdle={isIdle} />
      <WebcamPiP videoRef={videoRef} ready={ready} error={error} />
    </div>
  );
}
