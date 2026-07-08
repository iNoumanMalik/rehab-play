import { useState, useRef, useCallback, useEffect } from 'react';
import { usePoseEngine } from './hooks/usePoseEngine';
import { useGameSession } from './hooks/useGameSession';
import { Stage } from './components/layout/Stage';
import { Header } from './components/layout/Header';
import { FeedbackOverlay } from './components/game/FeedbackOverlay';
import { ComboDisplay } from './components/game/ComboDisplay';
import { VictoryScreen } from './components/game/VictoryScreen';
import { ToastStack } from './components/ui/ToastStack';
import { Dashboard } from './pages/Dashboard';
import { GameSession } from './pages/GameSession';
import { GameRunner } from './components/game/GameRunner';
import { getAllGameMeta } from './games/gameRegistry';
import { audioManager } from './core/services/AudioManager';
import { assets } from './core/assets/AssetSystem';
import { spriteManifest } from './core/assets/sprites';
import { useSettings } from './hooks/useSettings';
import type { GameId } from './types';

function App() {
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [videoReady, setVideoReady] = useState(false);
  const [currentGame, setCurrentGame] = useState<string | null>(null);
  const [replayToken, setReplayToken] = useState(0);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const { poseDataRef, isReady, error } = usePoseEngine(videoRef);
  const sessionKey = currentGame ? `${currentGame}:${replayToken}` : null;
  const session = useGameSession(sessionKey, poseDataRef);
  const [settings] = useSettings();

  useEffect(() => {
    audioManager.init();
    assets.preload(spriteManifest());
  }, []);

  // The manual reduced-motion toggle also gates plain CSS animations app-wide
  // (the OS media-query only covers what's already reduced by default).
  useEffect(() => {
    document.documentElement.classList.toggle('reduce-motion', settings.reducedMotion);
  }, [settings.reducedMotion]);

  // Apply audio settings.
  useEffect(() => {
    audioManager.setSfxEnabled(settings.sfxOn);
    audioManager.setMasterVolume(settings.volume);
  }, [settings.sfxOn, settings.volume]);

  // Ambient music plays only during a game and only when enabled.
  useEffect(() => {
    if (currentGame && settings.musicOn) audioManager.startMusic();
    else audioManager.stopMusic();
  }, [currentGame, settings.musicOn]);

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
        setCurrentGame(null);
        setVideoReady(false);
      }
      return next;
    });
  };

  const startGame = (gameId: string) => setCurrentGame(gameId);
  const backToDashboard = () => setCurrentGame(null);
  const playAgain = () => setReplayToken(t => t + 1);
  const quitToDashboard = () => {
    session.endSession();
    backToDashboard();
  };

  const games = getAllGameMeta();

  return (
    <div className="relative min-h-screen bg-[#070B1A] text-white overflow-x-hidden">
      <ToastStack />
      {/* Animated Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        <div className={`absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-br from-violet-600/15 via-transparent to-cyan-600/15 rounded-full blur-[140px] ${settings.reducedMotion ? '' : 'animate-[pulse_10s_ease-in-out_infinite]'}`} />
        <div className={`absolute -bottom-1/2 -right-1/2 w-full h-full bg-gradient-to-tl from-pink-600/15 via-transparent to-amber-600/15 rounded-full blur-[140px] ${settings.reducedMotion ? '' : 'animate-[pulse_12s_ease-in-out_infinite_2s]'}`} />
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PHBhdGggZD0iTTM2IDM0djItSDI0di0yaDEyek0zNiAyNHYySDI0di0yaDEyeiIvPjwvZz48L2c+PC9zdmc+')] opacity-50" />
      </div>

      <Header
        isCameraOn={isCameraOn}
        videoReady={videoReady}
        isReady={isReady}
        onToggleCamera={toggleCamera}
      />

      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-10">
        {!isCameraOn ? (
          <div className="flex flex-col items-center justify-center min-h-[60vh] gap-8 bg-white/[0.02] border border-white/[0.06] rounded-3xl p-8 sm:p-12 shadow-2xl backdrop-blur-md text-center max-w-3xl mx-auto">
            <div className="w-24 h-24 bg-rose-500/10 border border-rose-500/30 rounded-full flex items-center justify-center text-rose-400 text-4xl shadow-inner">
              🚫
            </div>
            <div className="max-w-lg">
              <h2 className="text-2xl sm:text-3xl font-extrabold mb-3 bg-gradient-to-r from-white to-white/80 bg-clip-text text-transparent">
                Camera is Disabled
              </h2>
              <p className="text-white/70 text-sm sm:text-base leading-relaxed mb-6 font-medium">
                RehabPlay requires a live webcam feed to track and translate your body movements into in-game gestures.
              </p>
              <button
                onClick={toggleCamera}
                className="px-8 py-4 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white font-extrabold rounded-2xl border border-violet-500/40 shadow-lg hover:shadow-violet-500/25 transition-all duration-300 cursor-pointer outline-none focus-visible:ring-4 focus-visible:ring-violet-500/50"
              >
                📹 Enable Camera
              </button>
            </div>
          </div>
        ) : (
          <>
            <Stage
              isCameraOn={isCameraOn}
              videoReady={videoReady}
              isReady={isReady}
              error={error}
              showTrackingLoader={!currentGame}
              onVideoReady={handleVideoReady}
              onVideoStopped={handleVideoStopped}
            >
              {currentGame && (
                <>
                  <GameRunner
                    key={sessionKey}
                    gameId={currentGame as GameId}
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
                      gameId={currentGame as GameId}
                      won={session.won}
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

            {currentGame ? (
              <GameSession
                gameId={currentGame as GameId}
                stats={session.stats}
                gameOver={session.gameOver}
                onEndSession={session.endSession}
                onBack={backToDashboard}
              />
            ) : (
              <Dashboard games={games} onStartGame={startGame} />
            )}
          </>
        )}
      </main>
    </div>
  );
}

export default App;
