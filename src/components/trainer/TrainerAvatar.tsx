import { useEffect } from 'react';
import { useTrainerAnimations } from '../../core/trainer/useTrainerAnimations';

interface TrainerAvatarProps {
  activeClipId: string;
  isFrozen: boolean;
}

/** Renders the Mixamo avatar and crossfades to whichever clip the session wants active. */
export function TrainerAvatar({ activeClipId, isFrozen }: TrainerAvatarProps) {
  const { model, playClip, setFrozen } = useTrainerAnimations();

  useEffect(() => {
    playClip(activeClipId);
    // playClip is stable across renders of this component instance; only the target clip should retrigger it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeClipId]);

  useEffect(() => {
    setFrozen(isFrozen);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFrozen]);

  return <primitive object={model} />;
}
