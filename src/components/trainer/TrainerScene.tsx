import { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { Bounds, Center, Html } from '@react-three/drei';
import { SceneEnvironment } from './SceneEnvironment';
import { TrainerAvatar } from './TrainerAvatar';

interface TrainerSceneProps {
  activeClipId: string;
  isFrozen: boolean;
}

function LoadingFallback() {
  return (
    <Html center>
      <div className="flex flex-col items-center gap-3 text-white/85">
        <div className="w-10 h-10 rounded-full border-2 border-white/25 border-t-white animate-spin" />
        <span className="text-sm font-semibold tracking-wide whitespace-nowrap">Loading trainer…</span>
      </div>
    </Html>
  );
}

export function TrainerScene({ activeClipId, isFrozen }: TrainerSceneProps) {
  return (
    <Canvas shadows camera={{ fov: 35, position: [0, 1.6, 4] }} dpr={[1, 2]}>
      <SceneEnvironment />
      <Suspense fallback={<LoadingFallback />}>
        <Bounds fit clip observe margin={1.35}>
          {/* precise=false: skips SkinnedMesh per-vertex bone-skinning math, which reads
              garbage bone matrices this early (before the mixer's first render-loop update).
              `top` is drei's Center prop for "pin the object's bottom edge to y=0" (stand on
              the floor) — `bottom` does the opposite and pins the top edge, hanging it below. */}
          <Center top precise={false}>
            <TrainerAvatar activeClipId={activeClipId} isFrozen={isFrozen} />
          </Center>
        </Bounds>
      </Suspense>
    </Canvas>
  );
}
