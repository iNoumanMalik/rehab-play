import type { ReactNode } from 'react';
import { WebcamFeed } from '../pose/WebcamFeed';

interface StageProps {
  isCameraOn: boolean;
  videoReady: boolean;
  isReady: boolean;
  error: string | null;
  /** Show the "loading motion tracking" veil (suppressed while a game is active). */
  showTrackingLoader: boolean;
  onVideoReady: (video: HTMLVideoElement) => void;
  onVideoStopped: () => void;
  /** Overlay rendered on top of the mirrored video (e.g. the active game canvas + HUD). */
  children?: ReactNode;
}

/**
 * The single, persistent camera surface. The webcam element stays mounted here
 * for the whole app lifetime so the MediaPipe loop never re-inits, and the
 * active game canvas is layered directly on top of the mirrored video — the
 * player sees themselves reaching for targets instead of playing blind.
 */
export function Stage({
  isCameraOn, videoReady, isReady, error, showTrackingLoader,
  onVideoReady, onVideoStopped, children,
}: StageProps) {
  return (
    <div className="relative rounded-2xl sm:rounded-3xl overflow-hidden bg-black/60 shadow-2xl border border-white/[0.1] aspect-[16/9] max-h-[60vh] mx-auto mb-6 sm:mb-8">
      <WebcamFeed isCameraOn={isCameraOn} onVideoReady={onVideoReady} onVideoStopped={onVideoStopped} />

      {/* Game overlay, layered above the mirrored video */}
      {children && <div className="absolute inset-0 z-10">{children}</div>}

      {/* Camera warming up */}
      {!videoReady && !error && (
        <div className="absolute inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center z-20">
          <div className="text-center p-6 max-w-sm">
            <div className="w-16 h-16 border-[4px] border-violet-500/20 border-t-violet-400 rounded-full animate-spin mx-auto mb-6" />
            <h3 className="text-xl font-bold text-violet-200">Setting Up Camera</h3>
            <p className="text-white/70 text-sm mt-3">Please allow camera access when prompted.</p>
          </div>
        </div>
      )}

      {/* Pose model loading (only on the dashboard, not mid-game) */}
      {videoReady && !isReady && !error && showTrackingLoader && (
        <div className="absolute inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center z-20">
          <div className="text-center p-6 max-w-sm">
            <div className="w-16 h-16 border-[4px] border-cyan-500/20 border-t-cyan-400 rounded-full animate-spin mx-auto mb-6" />
            <h3 className="text-xl font-bold text-cyan-200">Loading Motion Tracking</h3>
            <p className="text-white/70 text-sm mt-3">Initializing pose detection model.</p>
          </div>
        </div>
      )}

      {/* Model failed to load */}
      {error && (
        <div className="absolute inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center z-30" role="alert">
          <div className="text-center p-6 max-w-sm">
            <div className="w-16 h-16 bg-rose-500/10 border border-rose-500/30 rounded-full flex items-center justify-center text-rose-400 text-3xl mx-auto mb-5">⚠️</div>
            <h3 className="text-xl font-bold text-rose-200">Motion Tracking Unavailable</h3>
            <p className="text-white/70 text-sm mt-3 mb-5">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-3 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white font-bold rounded-xl border border-violet-500/40 shadow-lg transition-all duration-300 cursor-pointer outline-none focus-visible:ring-4 focus-visible:ring-violet-500/50"
            >
              Retry
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
