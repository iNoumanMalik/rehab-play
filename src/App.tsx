import { useState, useRef, useCallback, useEffect } from 'react';
import { Outlet, useLocation, useNavigate, matchPath } from 'react-router-dom';
import { usePoseEngine } from './hooks/usePoseEngine';
import { useGameSession } from './hooks/useGameSession';
import { useTrackingHealth } from './hooks/useTrackingHealth';
import { Stage } from './components/layout/Stage';
import { Header } from './components/layout/Header';
import { FeedbackOverlay } from './components/game/FeedbackOverlay';
import { ComboDisplay } from './components/game/ComboDisplay';
import { VictoryScreen } from './components/game/VictoryScreen';
import { TrackingStatusBanner } from './components/game/TrackingStatusBanner';
import { PoseDebugPanel } from './components/pose/PoseDebugPanel';
import { ToastStack } from './components/ui/ToastStack';
import { CaptionBar } from './components/ui/CaptionBar';
import { Onboarding } from './components/onboarding/Onboarding';
import { GameRunner } from './components/game/GameRunner';
import { Button } from './components/ui/primitives/Button';
import { getAllGameMeta } from './games/gameRegistry';
import { audioManager } from './core/services/AudioManager';
import { assets } from './core/assets/AssetSystem';
import { spriteManifest } from './core/assets/sprites';
import { StorageService } from './core/services/StorageService';
import { useSettings } from './hooks/useSettings';
import type { GameId } from './types';

/** Shared with the route pages (LandingPage/PlayChrome) rendered inside <Outlet/>. */
export interface AppOutletContext {
  games: ReturnType<typeof getAllGameMeta>;
  session: ReturnType<typeof useGameSession>;
  startGame: (gameId: string) => void;
  backToDashboard: () => void;
  playAgain: () => void;
}

function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const playMatch = matchPath('/play/:gameId', location.pathname);
  const currentGameId = playMatch?.params.gameId ?? null;
  // The landing page owns full-bleed marketing sections (hero, carousel) —
  // every other route (progress, in-game) keeps the constrained app container.
  const isLandingRoute = location.pathname === '/';

  // Camera stays off until the user actually commits to a session — a
  // marketing homepage shouldn't force a permission prompt before the pitch
  // has even been read. startGame() is what flips it on.
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [replayToken, setReplayToken] = useState(0);
  const [showOnboarding, setShowOnboarding] = useState(() => !StorageService.get('onboarding_complete', false));
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const { poseDataRef, isReady, error: poseError } = usePoseEngine(videoRef);
  // Camera failures (permission denied, no device, in use elsewhere) take
  // priority over pose-model failures — without a camera nothing else matters,
  // and the message is more specific/actionable than the generic pose error.
  const error = cameraError ?? poseError;
  const sessionKey = currentGameId ? `${currentGameId}:${replayToken}` : null;
  const session = useGameSession(sessionKey, poseDataRef);
  const [settings] = useSettings();
  const trackingHealth = useTrackingHealth(videoRef, poseDataRef, isCameraOn && videoReady && isReady);

  useEffect(() => {
    audioManager.init();
    assets.preload(spriteManifest());
  }, []);

  // The manual reduced-motion toggle also gates plain CSS animations app-wide
  // (the OS media-query only covers what's already reduced by default).
  useEffect(() => {
    document.documentElement.classList.toggle('reduce-motion', settings.reducedMotion);
  }, [settings.reducedMotion]);

  // Theme / contrast / text-size / dyslexia-font — stamped once before first
  // paint in main.tsx; kept in sync here as the user changes them live.
  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = settings.theme;
    root.dataset.contrast = settings.highContrast ? 'high' : 'normal';
    root.dataset.textSize = settings.textSize;
    root.dataset.dyslexia = String(settings.dyslexiaFont);
  }, [settings.theme, settings.highContrast, settings.textSize, settings.dyslexiaFont]);

  // Apply audio settings.
  useEffect(() => {
    audioManager.setSfxEnabled(settings.sfxOn);
    audioManager.setMusicVolume(settings.musicVolume);
    audioManager.setSFXVolume(settings.sfxVolume);
  }, [settings.sfxOn, settings.musicVolume, settings.sfxVolume]);

  // Ambient music plays only during a game and only when enabled.
  useEffect(() => {
    if (currentGameId && settings.musicOn) audioManager.startMusic();
    else audioManager.stopMusic();
  }, [currentGameId, settings.musicOn]);

  const handleVideoReady = useCallback((video: HTMLVideoElement) => {
    videoRef.current = video;
    setVideoReady(true);
  }, []);

  const handleVideoStopped = useCallback(() => {
    videoRef.current = null;
    setVideoReady(false);
  }, []);

  const toggleCamera = () => {
    setIsCameraOn(prev => {
      const next = !prev;
      if (!next) {
        if (currentGameId) session.endSession();
        navigate('/');
        setVideoReady(false);
      }
      return next;
    });
  };

  // Starting a game is the one moment that requests the camera — everything
  // upstream of this (hero, gallery browsing) is camera-free marketing content.
  const startGame = (gameId: string) => {
    setIsCameraOn(true);
    navigate(`/play/${gameId}`);
  };
  const backToDashboard = () => navigate('/');
  const playAgain = () => setReplayToken(t => t + 1);
  const quitToDashboard = () => {
    session.endSession();
    setIsCameraOn(false);
    backToDashboard();
  };

  const games = getAllGameMeta();
  const outletContext: AppOutletContext = { games, session, startGame, backToDashboard, playAgain };

  return (
    <div className="relative min-h-screen bg-bg text-text">
      {showOnboarding && <Onboarding onDone={() => setShowOnboarding(false)} />}
      <ToastStack />
      <CaptionBar />
      {/* Calm, near-flat background — a single soft accent wash, not a multi-color animated blob field. */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        <div className={`absolute -top-1/3 -right-1/4 w-2/3 h-2/3 bg-accent/5 rounded-full blur-[160px] ${settings.reducedMotion ? '' : 'animate-[pulse_14s_ease-in-out_infinite]'}`} />
      </div>

      <Header
        isCameraOn={isCameraOn}
        videoReady={videoReady}
        isReady={isReady}
        onToggleCamera={toggleCamera}
        showCameraControls={Boolean(currentGameId)}
      />

      <main className={isLandingRoute ? '' : 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-10'}>
        {currentGameId && !isCameraOn ? (
          <div className="flex flex-col items-center justify-center min-h-[60vh] gap-8 bg-surface border border-border rounded-card p-8 sm:p-12 shadow-2 text-center max-w-3xl mx-auto">
            <div className="w-24 h-24 bg-danger/10 border border-danger/30 rounded-full flex items-center justify-center text-danger text-4xl">
              🚫
            </div>
            <div className="max-w-lg">
              <h2 className="text-2xl sm:text-3xl font-extrabold mb-3 text-text font-display">
                Camera is Disabled
              </h2>
              <p className="text-muted text-sm sm:text-base leading-relaxed mb-6 font-medium">
                RehabPlay requires a live webcam feed to track and translate your body movements into in-game gestures.
              </p>
              <Button variant="primary" size="lg" onClick={toggleCamera}>
                📹 Enable Camera
              </Button>
            </div>
          </div>
        ) : isCameraOn ? (
          <>
            <Stage
              isCameraOn={isCameraOn}
              videoReady={videoReady}
              isReady={isReady}
              error={error}
              showTrackingLoader={!currentGameId}
              fullscreen={Boolean(currentGameId)}
              gameId={currentGameId as GameId | null}
              onExit={currentGameId ? quitToDashboard : undefined}
              onVideoReady={handleVideoReady}
              onVideoStopped={handleVideoStopped}
              onCameraError={setCameraError}
            >
              {videoReady && isReady && <TrackingStatusBanner health={trackingHealth} />}
              {import.meta.env.DEV && videoReady && isReady && <PoseDebugPanel poseDataRef={poseDataRef} />}
              {currentGameId && (
                <>
                  <GameRunner
                    key={sessionKey}
                    gameId={currentGameId as GameId}
                    poseDataRef={poseDataRef}
                    onQuit={quitToDashboard}
                    {...session.handlers}
                  />
                  {!session.gameOver && (
                    <>
                      <FeedbackOverlay messages={session.feedback} visible={session.feedback.length > 0} />
                      <ComboDisplay combo={session.combo} multiplier={session.multiplier} />
                    </>
                  )}
                  {session.gameOver && (
                    <VictoryScreen
                      gameId={currentGameId as GameId}
                      outcome={session.outcome}
                      stats={session.stats}
                      reward={session.reward}
                      achievements={session.achievementsEarned}
                      onPlayAgain={playAgain}
                      onBack={backToDashboard}
                    />
                  )}
                </>
              )}
            </Stage>

            <Outlet context={outletContext} />
          </>
        ) : (
          <Outlet context={outletContext} />
        )}
      </main>
    </div>
  );
}

export default App;
