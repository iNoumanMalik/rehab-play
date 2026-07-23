import { useNavigate } from 'react-router-dom';
import { useTrainerSession } from '../core/trainer/useTrainerSession';
import { TrainerScene } from '../components/trainer/TrainerScene';
import { TrainerHUD } from '../components/trainer/TrainerHUD';
import { WebcamPiP } from '../components/trainer/WebcamPiP';

/** Full-screen cinematic guided-exercise trainer — bypasses the app chrome entirely. */
export function GuidedTrainerPage() {
  const navigate = useNavigate();
  const session = useTrainerSession();

  const isActive = session.status === 'running' || session.status === 'paused';

  return (
    <div className="fixed inset-0 bg-black">
      <TrainerScene activeClipId={session.activeClipId} isFrozen={session.isFrozen} />
      <TrainerHUD session={session} onExit={() => navigate('/')} />
      <WebcamPiP active={isActive} />
    </div>
  );
}
