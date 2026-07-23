import { useEffect, useState } from 'react';
import type { PoseData, StabilizerDebugState } from '../../types';

interface PoseDebugPanelProps {
  poseDataRef: React.RefObject<PoseData | null>;
}

const POLL_MS = 150;

/**
 * Dev-only readout of the landmark stabilizer's per-frame state — overall
 * confidence, plus per-joint visibility and whether it's currently frozen
 * (held at last stable position), clamped (implausible jump reined in), or
 * swap-corrected (left/right relabeled back). Polled rather than per-frame:
 * this is for a human to read, not a hot path.
 */
export function PoseDebugPanel({ poseDataRef }: PoseDebugPanelProps) {
  const [open, setOpen] = useState(false);
  const [debugState, setDebugState] = useState<StabilizerDebugState | null>(null);
  const [confidence, setConfidence] = useState(0);

  useEffect(() => {
    if (!open) return;
    const id = window.setInterval(() => {
      const pose = poseDataRef.current;
      setDebugState(pose?.debug ?? null);
      setConfidence(pose?.confidence ?? 0);
    }, POLL_MS);
    return () => window.clearInterval(id);
  }, [open, poseDataRef]);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-4 left-4 z-50 w-8 h-8 rounded-full bg-black/60 text-white/70 text-xs font-bold border border-white/15 hover:bg-black/80 hover:text-white cursor-pointer"
        aria-label="Show pose debug panel"
        title="Pose debug"
      >
        🐞
      </button>
    );
  }

  const anyBoneCorrected = debugState?.bones.some(b => b.corrected) ?? false;

  return (
    <div className="fixed bottom-4 left-4 z-50 w-64 rounded-xl bg-black/75 backdrop-blur-md border border-white/15 text-white/85 text-[11px] font-mono p-3 shadow-2">
      <div className="flex items-center justify-between mb-2">
        <span className="font-bold uppercase tracking-wide text-white/60">Pose Debug</span>
        <button onClick={() => setOpen(false)} className="text-white/50 hover:text-white cursor-pointer" aria-label="Hide pose debug panel">
          ✕
        </button>
      </div>

      <div className="mb-2 flex items-center justify-between">
        <span className="text-white/60">Overall confidence</span>
        <span className="tabular-nums">{(confidence * 100).toFixed(0)}%</span>
      </div>

      <div className="space-y-1">
        {(debugState?.landmarks ?? []).map(l => (
          <div key={l.index} className="flex items-center justify-between gap-2">
            <span className="text-white/70">{l.label}</span>
            <span className="flex items-center gap-1.5 tabular-nums">
              {(l.visibility * 100).toFixed(0)}%
              {l.frozen && (
                <span title="Frozen — low confidence, holding last stable position" className="text-amber-400">
                  ❄
                </span>
              )}
              {l.clamped && (
                <span title="Clamped — implausible jump reined in" className="text-red-400">
                  ⚡
                </span>
              )}
              {l.swapped && (
                <span title="Left/right swap corrected" className="text-sky-400">
                  ↔
                </span>
              )}
            </span>
          </div>
        ))}
        {!debugState && <div className="text-white/40">No pose data yet…</div>}
      </div>

      {anyBoneCorrected && (
        <div className="mt-2 pt-2 border-t border-white/10 text-amber-400">Bone-length correction active</div>
      )}
    </div>
  );
}
