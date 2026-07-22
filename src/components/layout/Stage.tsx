import { useEffect, useState, type ReactNode } from 'react';
import { WebcamFeed } from '../pose/WebcamFeed';
import { Button } from '../ui/primitives/Button';
import { SettingsMenu } from '../ui/SettingsMenu';
import { HelpOverlay } from '../game/HelpOverlay';
import { useTwoStepConfirm } from '../../hooks/useTwoStepConfirm';
import { useSettings } from '../../hooks/useSettings';
import type { GameId } from '../../types';

interface StageProps {
  isCameraOn: boolean;
  videoReady: boolean;
  isReady: boolean;
  error: string | null;
  /** Show the "loading motion tracking" veil (suppressed while a game is active). */
  showTrackingLoader: boolean;
  /** Fill the viewport instead of the letterboxed dashboard card — used while a game session is active. */
  fullscreen?: boolean;
  /** The active game, if any — lets the fullscreen Help overlay show the right instructions. */
  gameId?: GameId | null;
  /** Persistent exit affordance shown in fullscreen mode, regardless of the active game's internal phase. */
  onExit?: () => void;
  onVideoReady: (video: HTMLVideoElement) => void;
  onVideoStopped: () => void;
  /** Called with a specific, user-facing message when the camera itself fails
   * (permission denied, no device, in use elsewhere) — distinct from pose-model
   * failures, which arrive via the `error` prop. Passing null clears it. */
  onCameraError?: (message: string | null) => void;
  /** Overlay rendered on top of the mirrored video (e.g. the active game canvas + HUD). */
  children?: ReactNode;
}

/**
 * The single, persistent camera surface. The webcam element stays mounted here
 * for the whole app lifetime so the MediaPipe loop never re-inits, and the
 * active game canvas is layered directly on top of the mirrored video — the
 * player sees themselves reaching for targets instead of playing blind.
 *
 * The loading/error veils below intentionally keep fixed light text on a fixed
 * dark scrim regardless of the app theme — they sit on top of live camera
 * video, not app chrome, so they don't follow the Theme setting.
 */
export function Stage({
  isCameraOn, videoReady, isReady, error, showTrackingLoader, fullscreen = false, gameId, onExit,
  onVideoReady, onVideoStopped, onCameraError, children,
}: StageProps) {
  const [showHelp, setShowHelp] = useState(false);
  const { armed: exitArmed, trigger: triggerExit } = useTwoStepConfirm(onExit ?? (() => {}));
  const [settings, setSettings] = useSettings();

  // "?" toggles the Help overlay, "M" mutes/unmutes music+sfx together —
  // accelerators for returning players (Shneiderman #2), only active during
  // an actual session so they don't fire while browsing the landing page.
  useEffect(() => {
    if (!fullscreen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === '?') {
        setShowHelp(h => !h);
      } else if (e.key === 'm' || e.key === 'M') {
        const nextOn = !settings.musicOn;
        setSettings({ musicOn: nextOn, sfxOn: nextOn });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [fullscreen, settings.musicOn, setSettings]);

  return (
    <div
      className={
        fullscreen
          ? 'fixed inset-0 z-40 overflow-hidden bg-black'
          : 'relative rounded-2xl sm:rounded-3xl overflow-hidden bg-black/60 shadow-3 border border-white/[0.1] aspect-[16/9] max-h-[60vh] mx-auto mb-6 sm:mb-8'
      }
    >
      <WebcamFeed isCameraOn={isCameraOn} onVideoReady={onVideoReady} onVideoStopped={onVideoStopped} onError={onCameraError} />

      {/* Game overlay, layered above the mirrored video. In fullscreen, inset by
          the device's safe area so HUD/controls clear notches and home
          indicators — the video itself still bleeds to the physical edges. */}
      {children && (
        <div
          className="absolute inset-0 z-10"
          style={fullscreen ? {
            paddingTop: 'env(safe-area-inset-top)',
            paddingRight: 'env(safe-area-inset-right)',
            paddingBottom: 'env(safe-area-inset-bottom)',
            paddingLeft: 'env(safe-area-inset-left)',
          } : undefined}
        >
          {children}
        </div>
      )}

      {/* Persistent session chrome — owned by Stage, not the active game, so it
          works through every GameRunner phase (intro, calibrating, playing,
          paused, victory). Exit sits bottom-left; Help + Settings sit
          bottom-right, clear of the HUD/ObjectiveBanner (top) and
          FeedbackOverlay/ComboDisplay (bottom-center). Without this cluster,
          fullscreen play would make Settings and per-game instructions
          completely unreachable mid-session. */}
      {fullscreen && onExit && (
        <div
          className="absolute bottom-3 left-3 z-50"
          style={{ marginBottom: 'env(safe-area-inset-bottom)', marginLeft: 'env(safe-area-inset-left)' }}
        >
          <Button variant={exitArmed ? 'danger' : 'ghost'} size="sm" onClick={triggerExit} aria-label={exitArmed ? 'Click again to confirm exiting the session' : 'Exit session'}>
            {exitArmed ? '⚠ Confirm Exit' : '✕ Exit'}
          </Button>
        </div>
      )}
      {fullscreen && (
        <div
          className="absolute bottom-3 right-3 z-50 flex items-center gap-2"
          style={{ marginBottom: 'env(safe-area-inset-bottom)', marginRight: 'env(safe-area-inset-right)' }}
        >
          <Button variant="ghost" size="sm" onClick={() => setShowHelp(true)} aria-label="How to play">
            ? Help
          </Button>
          <SettingsMenu onDark />
        </div>
      )}
      {fullscreen && showHelp && <HelpOverlay gameId={gameId} onClose={() => setShowHelp(false)} />}

      {/* Camera warming up */}
      {!videoReady && !error && (
        <div className="absolute inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center z-20">
          <div className="text-center p-6 max-w-sm">
            <div className="w-16 h-16 border-[4px] border-on-dark-accent/20 border-t-on-dark-accent rounded-full animate-spin mx-auto mb-6" />
            <h3 className="text-xl font-bold text-on-dark-accent font-display">Setting Up Camera</h3>
            <p className="text-white/70 text-sm mt-3">Please allow camera access when prompted.</p>
          </div>
        </div>
      )}

      {/* Pose model loading (only on the dashboard, not mid-game) */}
      {videoReady && !isReady && !error && showTrackingLoader && (
        <div className="absolute inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center z-20">
          <div className="text-center p-6 max-w-sm">
            <div className="w-16 h-16 border-[4px] border-on-dark-success/20 border-t-on-dark-success rounded-full animate-spin mx-auto mb-6" />
            <h3 className="text-xl font-bold text-on-dark-success font-display">Loading Motion Tracking</h3>
            <p className="text-white/70 text-sm mt-3">Initializing pose detection model.</p>
          </div>
        </div>
      )}

      {/* Model failed to load (or the camera itself failed — see onCameraError) */}
      {error && (
        <div className="absolute inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center z-30" role="alert">
          <div className="text-center p-6 max-w-sm">
            <div className="w-16 h-16 bg-on-dark-danger/10 border border-on-dark-danger/30 rounded-full flex items-center justify-center text-on-dark-danger text-3xl mx-auto mb-5">⚠️</div>
            <h3 className="text-xl font-bold text-on-dark-danger font-display">Motion Tracking Unavailable</h3>
            <p className="text-white/70 text-sm mt-3 mb-5">{error}</p>
            <Button variant="primary" onClick={() => window.location.reload()}>
              Retry
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
