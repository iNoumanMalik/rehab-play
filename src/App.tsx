import { useState, useRef, useCallback, useEffect } from 'react';
import { usePoseEngine } from './hooks/usePoseEngine';
import { WebcamFeed } from './components/pose/WebcamFeed';
import { Header } from './components/layout/Header';
import { Dashboard } from './pages/Dashboard';
import { GameSession } from './pages/GameSession';
import { ButterflyRescue } from './games/butterfly-rescue/ButterflyRescue';
import { FruitHarvest } from './games/fruit-harvest/FruitHarvest';
import { CrystalGuardian } from './games/crystal-guardian/CrystalGuardian';
import { getAllGameMeta } from './games/gameRegistry';
import { audioManager } from './core/services/AudioManager';
import { analyticsService } from './core/services/AnalyticsService';
import type { GameId } from './types';
import type { GameComponentProps } from './games/gameRegistry';

const GAME_COMPONENTS: Record<string, React.ComponentType<GameComponentProps>> = {
  'butterfly-rescue': ButterflyRescue,
  'fruit-harvest': FruitHarvest,
  'crystal-guardian': CrystalGuardian,
};

function App() {
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [videoReady, setVideoReady] = useState(false);
  const [currentGame, setCurrentGame] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const { poseDataRef, isReady } = usePoseEngine(videoRef);

  useEffect(() => {
    audioManager.init();
  }, []);

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

  const startGame = (gameId: string) => {
    setCurrentGame(gameId);
    analyticsService.startSession(gameId as GameId);
  };

  const endGame = useCallback((_data: { score: number; maxCombo: number; level: number }) => {
    void _data;
  }, []);

  const backToDashboard = () => {
    setCurrentGame(null);
  };

  const games = getAllGameMeta();

  return (
    <div className="relative min-h-screen bg-[#070B1A] text-white overflow-x-hidden">
      {/* Animated Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-br from-violet-600/15 via-transparent to-cyan-600/15 rounded-full blur-[140px] animate-[pulse_10s_ease-in-out_infinite]" />
        <div className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-gradient-to-tl from-pink-600/15 via-transparent to-amber-600/15 rounded-full blur-[140px] animate-[pulse_12s_ease-in-out_infinite_2s]" />
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PHBhdGggZD0iTTM2IDM0djItSDI0di0yaDEyek0zNiAyNHYySDI0di0yaDEyeiIvPjwvZz48L2c+PC9zdmc+')] opacity-50" />
      </div>

      <Header
        isCameraOn={isCameraOn}
        videoReady={videoReady}
        isReady={isReady}
        onToggleCamera={toggleCamera}
      />

      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-10">
        {/* Camera Off State */}
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
            {/* Camera View (always rendered when camera is on) */}
            <div className="relative rounded-2xl sm:rounded-3xl overflow-hidden bg-black/60 shadow-2xl border border-white/[0.1] aspect-[16/9] max-h-[60vh] mx-auto mb-6 sm:mb-8">
              {!videoReady && (
                <div className="absolute inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center z-20">
                  <div className="text-center p-6 max-w-sm">
                    <div className="w-16 h-16 border-[4px] border-violet-500/20 border-t-violet-400 rounded-full animate-spin mx-auto mb-6" />
                    <h3 className="text-xl font-bold text-violet-200">Setting Up Camera</h3>
                    <p className="text-white/70 text-sm mt-3">Please allow camera access when prompted.</p>
                  </div>
                </div>
              )}
              <WebcamFeed isCameraOn={isCameraOn} onVideoReady={handleVideoReady} onVideoStopped={handleVideoStopped} />

              {videoReady && !isReady && !currentGame && (
                <div className="absolute inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center z-15">
                  <div className="text-center p-6 max-w-sm">
                    <div className="w-16 h-16 border-[4px] border-cyan-500/20 border-t-cyan-400 rounded-full animate-spin mx-auto mb-6" />
                    <h3 className="text-xl font-bold text-cyan-200">Loading Motion Tracking</h3>
                    <p className="text-white/70 text-sm mt-3">Initializing pose detection model.</p>
                  </div>
                </div>
              )}
            </div>

            {/* Dashboard or Game Session */}
            {!currentGame ? (
              <Dashboard games={games} onStartGame={startGame} />
            ) : (
              <GameSession
                key={currentGame}
                gameId={currentGame as GameId}
                GameComponent={GAME_COMPONENTS[currentGame]}
                poseDataRef={poseDataRef}
                onEnd={endGame}
                onBack={backToDashboard}
              />
            )}
          </>
        )}
      </main>
    </div>
  );
}

export default App;
