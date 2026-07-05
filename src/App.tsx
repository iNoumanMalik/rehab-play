
import { useState, useRef, useCallback, useEffect } from 'react';
import { Webcam } from './components/Webcam';
import { usePoseTracking } from './hooks/usePoseTracking';
import { ButterflyCatch } from './games/ButterflyCatch';
import { FruitReach } from './games/FruitReach';
import { ArmRaiseExercise } from './games/ArmRaiseExercise';
import type { GameType, GameStats } from './types';

function App() {
  const [currentGame, setCurrentGame] = useState<GameType | null>(null);
  const [videoReady, setVideoReady] = useState(false);
  const [poseReady, setPoseReady] = useState(false);
  const [stats, setStats] = useState<GameStats>({
    score: 0,
    accuracy: 100,
    successfulActions: 0,
    repetitions: 0
  });
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const { landmarks, isReady } = usePoseTracking(videoRef);

  useEffect(() => {
    setPoseReady(isReady);
  }, [isReady]);

  const handleVideoReady = useCallback((video: HTMLVideoElement) => {
    videoRef.current = video;
    setVideoReady(true);
  }, []);

  const handleScoreUpdate = useCallback((score: number) => {
    setStats(prev => ({ ...prev, score }));
  }, []);

  const handleSuccessUpdate = useCallback((count: number) => {
    setStats(prev => ({ ...prev, successfulActions: count }));
  }, []);

  const handleRepetitionsUpdate = useCallback((count: number) => {
    setStats(prev => ({ ...prev, repetitions: count }));
  }, []);

  const startGame = (game: GameType) => {
    setStats({ score: 0, accuracy: 100, successfulActions: 0, repetitions: 0 });
    setCurrentGame(game);
  };

  const stopGame = () => {
    setCurrentGame(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-900 to-slate-900 text-white">
      {/* Header */}
      <header className="bg-black/30 backdrop-blur-xl border-b border-white/10 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div 
                className="w-12 h-12 bg-gradient-to-br from-pink-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg shadow-purple-500/30"
                aria-hidden="true"
              >
                <span className="text-2xl">🎮</span>
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-pink-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent">
                  RehabPlay
                </h1>
                <p className="text-xs sm:text-sm text-slate-400">Gamified Physiotherapy</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {videoReady && (
                <span className="flex items-center gap-2 px-3 py-1.5 bg-green-500/20 text-green-300 rounded-full text-sm font-medium border border-green-500/30">
                  <span className="w-2.5 h-2.5 bg-green-400 rounded-full animate-pulse" aria-hidden="true"></span>
                  Webcam Active
                </span>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Loading State */}
        {!videoReady ? (
          <div className="flex flex-col items-center justify-center min-h-[60vh] gap-8">
            <div className="relative">
              <div 
                className="w-24 h-24 border-4 border-purple-500/30 border-t-purple-400 rounded-full animate-spin"
                aria-hidden="true"
              ></div>
              <div className="absolute inset-0 flex items-center justify-center" aria-hidden="true">
                <span className="text-3xl">📷</span>
              </div>
            </div>
            <div className="text-center">
              <h2 className="text-2xl font-bold mb-2">Setting up your webcam</h2>
              <p className="text-slate-400">Please allow camera access when prompted</p>
            </div>
            <div className="w-full max-w-md">
              <Webcam onVideoReady={handleVideoReady} />
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Webcam Container - Always Rendered! */}
            <div className="relative rounded-3xl overflow-hidden shadow-2xl shadow-purple-500/20 border border-white/10">
              <Webcam onVideoReady={handleVideoReady} />
              
              {/* Loading Overlay for Pose Tracking */}
              {!poseReady && !currentGame && (
                <div className="absolute inset-0 bg-black/70 flex items-center justify-center z-10">
                  <div className="text-center">
                    <div 
                      className="w-16 h-16 border-3 border-cyan-500/30 border-t-cyan-400 rounded-full animate-spin mx-auto mb-4"
                      aria-hidden="true"
                    ></div>
                    <p className="text-cyan-300 text-lg">Loading motion tracking...</p>
                  </div>
                </div>
              )}

              {/* Game Overlays */}
              {currentGame && (
                <div className="absolute inset-0 z-10">
                  {currentGame === 'butterfly' && (
                    <ButterflyCatch
                      landmarks={landmarks}
                      onScoreUpdate={handleScoreUpdate}
                      onSuccessUpdate={handleSuccessUpdate}
                    />
                  )}
                  {currentGame === 'fruit' && (
                    <FruitReach
                      landmarks={landmarks}
                      onScoreUpdate={handleScoreUpdate}
                      onSuccessUpdate={handleSuccessUpdate}
                    />
                  )}
                  {currentGame === 'arm-raise' && (
                    <ArmRaiseExercise
                      landmarks={landmarks}
                      onScoreUpdate={handleScoreUpdate}
                      onRepetitionsUpdate={handleRepetitionsUpdate}
                    />
                  )}
                </div>
              )}
            </div>

            {/* Game Selection */}
            {!currentGame && (
              <div>
                <h2 className="text-3xl font-bold mb-6 text-center sm:text-left">
                  Choose Your Exercise
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6" role="list">
                  <button
                    onClick={() => startGame('butterfly')}
                    className="group relative bg-gradient-to-br from-pink-500/10 to-purple-600/10 border border-pink-500/20 hover:border-pink-500/50 rounded-3xl p-8 text-left transition-all duration-300 hover:transform hover:-translate-y-2 hover:shadow-2xl hover:shadow-pink-500/20"
                    aria-label="Start Butterfly Catch game for hand-eye coordination"
                  >
                    <div className="absolute top-6 right-6 text-5xl transform group-hover:scale-110 transition-transform duration-300" aria-hidden="true">
                      🦋
                    </div>
                    <div className="mb-4">
                      <span className="text-sm font-semibold text-pink-400 uppercase tracking-wider">
                        Hand-Eye Coordination
                      </span>
                    </div>
                    <h3 className="text-2xl font-bold mb-3 text-white group-hover:text-pink-300 transition-colors">
                      Butterfly Catch
                    </h3>
                    <p className="text-slate-400 leading-relaxed">
                      Move your hands to catch colorful flying butterflies and improve your coordination!
                    </p>
                    <div className="mt-6 flex items-center gap-2 text-pink-400 font-semibold">
                      Start Playing
                      <svg className="w-5 h-5 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                      </svg>
                    </div>
                  </button>

                  <button
                    onClick={() => startGame('fruit')}
                    className="group relative bg-gradient-to-br from-orange-500/10 to-red-600/10 border border-orange-500/20 hover:border-orange-500/50 rounded-3xl p-8 text-left transition-all duration-300 hover:transform hover:-translate-y-2 hover:shadow-2xl hover:shadow-orange-500/20"
                    aria-label="Start Fruit Reach game for range of motion"
                  >
                    <div className="absolute top-6 right-6 text-5xl transform group-hover:scale-110 transition-transform duration-300" aria-hidden="true">
                      🍎
                    </div>
                    <div className="mb-4">
                      <span className="text-sm font-semibold text-orange-400 uppercase tracking-wider">
                        Range of Motion
                      </span>
                    </div>
                    <h3 className="text-2xl font-bold mb-3 text-white group-hover:text-orange-300 transition-colors">
                      Fruit Reach
                    </h3>
                    <p className="text-slate-400 leading-relaxed">
                      Stretch your arms to reach and collect fruits appearing all over the screen!
                    </p>
                    <div className="mt-6 flex items-center gap-2 text-orange-400 font-semibold">
                      Start Playing
                      <svg className="w-5 h-5 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                      </svg>
                    </div>
                  </button>

                  <button
                    onClick={() => startGame('arm-raise')}
                    className="group relative bg-gradient-to-br from-blue-500/10 to-cyan-600/10 border border-blue-500/20 hover:border-blue-500/50 rounded-3xl p-8 text-left transition-all duration-300 hover:transform hover:-translate-y-2 hover:shadow-2xl hover:shadow-blue-500/20"
                    aria-label="Start Arm Raise Exercise game for strength training"
                  >
                    <div className="absolute top-6 right-6 text-5xl transform group-hover:scale-110 transition-transform duration-300" aria-hidden="true">
                      💪
                    </div>
                    <div className="mb-4">
                      <span className="text-sm font-semibold text-blue-400 uppercase tracking-wider">
                        Strength Training
                      </span>
                    </div>
                    <h3 className="text-2xl font-bold mb-3 text-white group-hover:text-blue-300 transition-colors">
                      Arm Raise Exercise
                    </h3>
                    <p className="text-slate-400 leading-relaxed">
                      Perform controlled arm raising movements while we count your repetitions!
                    </p>
                    <div className="mt-6 flex items-center gap-2 text-blue-400 font-semibold">
                      Start Playing
                      <svg className="w-5 h-5 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                      </svg>
                    </div>
                  </button>
                </div>
              </div>
            )}

            {/* Stats and Controls - Only when playing a game */}
            {currentGame && (
              <div className="space-y-6">
                {/* Stats Dashboard */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4" role="list" aria-label="Game statistics">
                  <div className="bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border border-yellow-500/20 rounded-2xl p-6 text-center" role="listitem">
                    <div className="text-4xl font-bold text-yellow-400 mb-2" aria-live="polite">{stats.score}</div>
                    <div className="text-sm text-slate-400 font-medium uppercase tracking-wider">Score</div>
                  </div>
                  <div className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/20 rounded-2xl p-6 text-center" role="listitem">
                    <div className="text-4xl font-bold text-green-400 mb-2" aria-live="polite">{stats.accuracy}%</div>
                    <div className="text-sm text-slate-400 font-medium uppercase tracking-wider">Accuracy</div>
                  </div>
                  <div className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border border-blue-500/20 rounded-2xl p-6 text-center" role="listitem">
                    <div className="text-4xl font-bold text-blue-400 mb-2" aria-live="polite">{stats.successfulActions}</div>
                    <div className="text-sm text-slate-400 font-medium uppercase tracking-wider">Successful</div>
                  </div>
                  <div className="bg-gradient-to-br from-pink-500/10 to-purple-500/10 border border-pink-500/20 rounded-2xl p-6 text-center" role="listitem">
                    <div className="text-4xl font-bold text-pink-400 mb-2" aria-live="polite">{stats.repetitions}</div>
                    <div className="text-sm text-slate-400 font-medium uppercase tracking-wider">Repetitions</div>
                  </div>
                </div>

                {/* Controls */}
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <button
                    onClick={stopGame}
                    className="px-8 py-4 bg-gradient-to-r from-slate-700 to-slate-800 hover:from-slate-600 hover:to-slate-700 text-white font-bold text-lg rounded-2xl transition-all duration-300 shadow-lg hover:shadow-xl border border-slate-600"
                    aria-label="Stop current game and return to menu"
                  >
                    Stop Game
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
