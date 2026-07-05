
import { useState, useRef, useCallback } from 'react';
import { Webcam } from './components/Webcam';
import { usePoseTracking } from './hooks/usePoseTracking';
import { ButterflyCatch } from './games/ButterflyCatch';
import { FruitReach } from './games/FruitReach';
import { ArmRaiseExercise } from './games/ArmRaiseExercise';
import type { GameType, GameStats } from './types';

function App() {
  const [currentGame, setCurrentGame] = useState<GameType | null>(null);
  const [videoReady, setVideoReady] = useState(false);
  const [stats, setStats] = useState<GameStats>({
    score: 0,
    accuracy: 100,
    successfulActions: 0,
    repetitions: 0
  });
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const { landmarks, isReady } = usePoseTracking(videoRef);

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
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 text-white">
      <header className="p-6 text-center">
        <h1 className="text-5xl font-bold mb-2 bg-gradient-to-r from-pink-400 to-cyan-400 bg-clip-text text-transparent">
          RehabPlay
        </h1>
        <p className="text-lg text-purple-200">Gamified Physiotherapy through Motion Tracking</p>
      </header>

      <main className="max-w-6xl mx-auto p-6">
        {!videoReady ? (
          <div className="text-center py-20">
            <div className="text-2xl mb-4">Loading webcam...</div>
            <Webcam onVideoReady={handleVideoReady} />
          </div>
        ) : !currentGame ? (
          <div>
            <div className="relative rounded-2xl overflow-hidden mb-8 shadow-2xl">
              <Webcam onVideoReady={handleVideoReady} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <button
                onClick={() => startGame('butterfly')}
                className="bg-gradient-to-r from-pink-500 to-purple-600 p-6 rounded-2xl shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300"
              >
                <div className="text-4xl mb-2">🦋</div>
                <h3 className="text-2xl font-bold mb-2">Butterfly Catch</h3>
                <p className="text-pink-100">Catch flying butterflies with your hands!</p>
              </button>
              <button
                onClick={() => startGame('fruit')}
                className="bg-gradient-to-r from-orange-500 to-red-600 p-6 rounded-2xl shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300"
              >
                <div className="text-4xl mb-2">🍎</div>
                <h3 className="text-2xl font-bold mb-2">Fruit Reach</h3>
                <p className="text-orange-100">Reach and collect fruits across the screen!</p>
              </button>
              <button
                onClick={() => startGame('arm-raise')}
                className="bg-gradient-to-r from-blue-500 to-cyan-600 p-6 rounded-2xl shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300"
              >
                <div className="text-4xl mb-2">💪</div>
                <h3 className="text-2xl font-bold mb-2">Arm Raise Exercise</h3>
                <p className="text-blue-100">Perform controlled arm raising movements!</p>
              </button>
            </div>
          </div>
        ) : (
          <div className="relative">
            <div className="relative rounded-2xl overflow-hidden mb-6 shadow-2xl">
              <Webcam onVideoReady={handleVideoReady} />
              <div className="absolute inset-0">
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
            </div>
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 mb-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-3xl font-bold text-yellow-400">{stats.score}</div>
                  <div className="text-sm text-purple-200">Score</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-400">{stats.accuracy}%</div>
                  <div className="text-sm text-purple-200">Accuracy</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-400">{stats.successfulActions}</div>
                  <div className="text-sm text-purple-200">Successful</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-pink-400">{stats.repetitions}</div>
                  <div className="text-sm text-purple-200">Repetitions</div>
                </div>
              </div>
            </div>
            <button
              onClick={stopGame}
              className="w-full bg-gradient-to-r from-gray-600 to-gray-700 py-4 px-6 rounded-xl text-xl font-bold hover:from-gray-500 hover:to-gray-600 transition-all duration-300"
            >
              Stop Game
            </button>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
