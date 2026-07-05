
import { useState, useRef, useCallback, useEffect } from 'react';
import { Webcam } from './components/Webcam';
import { usePoseTracking } from './hooks/usePoseTracking';
import { ButterflyCatch } from './games/ButterflyCatch';
import { FruitReach } from './games/FruitReach';
import { ArmRaiseExercise } from './games/ArmRaiseExercise';
import type { GameType, GameStats } from './types';
import gsap from 'gsap';

const GAME_INFO: Record<GameType, {
  title: string;
  desc: string;
  tag: string;
  icon: string;
  gradient: string;
  border: string;
  tagColor: string;
  hoverGlow: string;
}> = {
  butterfly: {
    title: 'Butterfly Catch',
    desc: 'Move your hands to catch colorful butterflies. Improves hand-eye coordination and reaction time.',
    tag: 'Hand-Eye Coordination',
    icon: '🦋',
    gradient: 'from-pink-600/20 via-rose-600/10 to-purple-600/20',
    border: 'border-pink-500/30 hover:border-pink-400/60',
    tagColor: 'text-pink-300 bg-pink-500/15',
    hoverGlow: 'shadow-pink-500/20',
  },
  fruit: {
    title: 'Fruit Reach',
    desc: 'Stretch your arms to collect fruits across the screen. Enhances range of motion and flexibility.',
    tag: 'Range of Motion',
    icon: '🍎',
    gradient: 'from-orange-600/20 via-amber-600/10 to-red-600/20',
    border: 'border-orange-500/30 hover:border-orange-400/60',
    tagColor: 'text-orange-300 bg-orange-500/15',
    hoverGlow: 'shadow-orange-500/20',
  },
  'arm-raise': {
    title: 'Arm Raise',
    desc: 'Perform controlled arm raises with real-time rep counting. Builds strength and endurance.',
    tag: 'Strength Training',
    icon: '💪',
    gradient: 'from-blue-600/20 via-cyan-600/10 to-teal-600/20',
    border: 'border-blue-500/30 hover:border-blue-400/60',
    tagColor: 'text-blue-300 bg-blue-500/15',
    hoverGlow: 'shadow-blue-500/20',
  },
};

const STAT_CARDS: { key: keyof GameStats; label: string; suffix?: string; gradient: string; border: string; textColor: string }[] = [
  { key: 'score', label: 'Score', gradient: 'from-yellow-500/15 to-amber-500/10', border: 'border-yellow-500/25', textColor: 'text-yellow-300' },
  { key: 'accuracy', label: 'Accuracy', suffix: '%', gradient: 'from-emerald-500/15 to-green-500/10', border: 'border-emerald-500/25', textColor: 'text-emerald-300' },
  { key: 'successfulActions', label: 'Successful', gradient: 'from-blue-500/15 to-cyan-500/10', border: 'border-blue-500/25', textColor: 'text-blue-300' },
  { key: 'repetitions', label: 'Repetitions', gradient: 'from-purple-500/15 to-pink-500/10', border: 'border-purple-500/25', textColor: 'text-purple-300' },
];

function App() {
  const [currentGame, setCurrentGame] = useState<GameType | null>(null);
  const [videoReady, setVideoReady] = useState(false);
  const [stats, setStats] = useState<GameStats>({
    score: 0, accuracy: 100, successfulActions: 0, repetitions: 0,
  });
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const headerRef = useRef<HTMLElement>(null);
  const cardsRef = useRef<HTMLDivElement>(null);
  const prevStats = useRef(stats);

  const { landmarks, isReady } = usePoseTracking(videoRef);

  useEffect(() => {
    if (videoReady) {
      gsap.fromTo(headerRef.current,
        { y: -30, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.6, ease: 'power3.out' }
      );
    }
  }, [videoReady]);

  useEffect(() => {
    if (videoReady && !currentGame && cardsRef.current) {
      const cards = cardsRef.current.querySelectorAll('[data-card]');
      gsap.fromTo(cards,
        { y: 60, opacity: 0, scale: 0.95 },
        { y: 0, opacity: 1, scale: 1, duration: 0.5, stagger: 0.12, ease: 'back.out(1.7)' }
      );
    }
  }, [videoReady, currentGame]);

  useEffect(() => {
    const changed = Object.keys(stats) as (keyof GameStats)[];
    changed.forEach(key => {
      if (stats[key] !== prevStats.current[key] && stats[key] > 0) {
        const el = document.getElementById(`stat-${key}`);
        if (el) {
          gsap.fromTo(el,
            { scale: 1.3, color: stats[key] > prevStats.current[key] ? '#86efac' : undefined },
            { scale: 1, duration: 0.3, ease: 'back.out(2)' }
          );
        }
      }
    });
    prevStats.current = stats;
  }, [stats]);

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
    <div className="relative min-h-screen bg-[#070B1A] text-white overflow-x-hidden">
      {/* Animated Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-0">
        <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-br from-violet-600/10 via-transparent to-cyan-600/10 rounded-full blur-[120px] animate-[pulse_8s_ease-in-out_infinite]" />
        <div className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-gradient-to-tl from-pink-600/10 via-transparent to-amber-600/10 rounded-full blur-[120px] animate-[pulse_10s_ease-in-out_infinite_2s]" />
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PHBhdGggZD0iTTM2IDM0djItSDI0di0yaDEyek0zNiAyNHYySDI0di0yaDEyeiIvPjwvZz48L2c+PC9zdmc+')] opacity-40" />
      </div>

      {/* Header */}
      <header ref={headerRef} className="relative z-10 bg-white/[0.03] backdrop-blur-xl border-b border-white/[0.06] sticky top-0 opacity-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="relative w-10 h-10 sm:w-12 sm:h-12">
                <div className="absolute inset-0 bg-gradient-to-br from-violet-500 via-purple-500 to-pink-500 rounded-xl sm:rounded-2xl animate-pulse opacity-50 blur-md" />
                <div className="relative w-full h-full bg-gradient-to-br from-violet-500 via-purple-500 to-pink-500 rounded-xl sm:rounded-2xl flex items-center justify-center shadow-lg">
                  <span className="text-lg sm:text-2xl">🎮</span>
                </div>
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold bg-gradient-to-r from-violet-300 via-purple-300 to-pink-300 bg-clip-text text-transparent">
                  RehabPlay
                </h1>
                <p className="text-[10px] sm:text-xs text-white/40 font-medium tracking-wider uppercase">
                  Gamified Physiotherapy
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {videoReady && (
                <span className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/15 text-emerald-300 rounded-full text-xs sm:text-sm font-medium border border-emerald-500/30">
                  <span className="relative w-2 h-2">
                    <span className="absolute inset-0 bg-emerald-400 rounded-full animate-ping opacity-75" />
                    <span className="relative block w-2 h-2 bg-emerald-400 rounded-full" />
                  </span>
                  <span className="hidden sm:inline">Camera Active</span>
                </span>
              )}
              {!isReady && videoReady && (
                <span className="flex items-center gap-2 px-3 py-1.5 bg-amber-500/15 text-amber-300 rounded-full text-xs sm:text-sm font-medium border border-amber-500/30">
                  <span className="w-2 h-2 bg-amber-400 rounded-full animate-pulse" />
                  Loading Pose
                </span>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-10">
        {/* Loading State */}
        {!videoReady ? (
          <div className="flex flex-col items-center justify-center min-h-[70vh] gap-8">
            <div className="relative">
              <div className="w-20 h-20 sm:w-24 sm:h-24 border-[3px] border-violet-500/30 border-t-violet-400 rounded-full animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-2xl sm:text-3xl">📷</span>
              </div>
            </div>
            <div className="text-center max-w-md">
              <h2 className="text-xl sm:text-2xl font-bold mb-2 bg-gradient-to-r from-white to-white/70 bg-clip-text text-transparent">
                Setting up your webcam
              </h2>
              <p className="text-white/50 text-sm sm:text-base">
                Please allow camera access when prompted
              </p>
            </div>
            <div className="w-full max-w-md">
              <Webcam onVideoReady={handleVideoReady} />
            </div>
          </div>
        ) : (
          <div className="space-y-6 sm:space-y-8">
            {/* Webcam & Game Area */}
            <div className="relative rounded-2xl sm:rounded-3xl overflow-hidden bg-black/40 shadow-2xl shadow-black/50 border border-white/[0.08]">
              <Webcam onVideoReady={handleVideoReady} />

              {!isReady && !currentGame && (
                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-10">
                  <div className="text-center">
                    <div className="w-14 h-14 sm:w-16 sm:h-16 border-[3px] border-cyan-500/30 border-t-cyan-400 rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-cyan-300 text-base sm:text-lg font-medium">Loading motion tracking...</p>
                    <p className="text-white/40 text-sm mt-2">Detecting pose model</p>
                  </div>
                </div>
              )}

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
                <div className="text-center sm:text-left mb-6 sm:mb-8">
                  <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-white via-white/90 to-white/60 bg-clip-text text-transparent">
                    Choose Your Exercise
                  </h2>
                  <p className="text-white/40 mt-2 text-sm sm:text-base">
                    Select an activity to start your rehabilitation session
                  </p>
                </div>

                <div ref={cardsRef} className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
                  {(Object.keys(GAME_INFO) as GameType[]).map((game) => {
                    const info = GAME_INFO[game];
                    return (
                      <button
                        key={game}
                        data-card
                        onClick={() => startGame(game)}
                        className={`group relative bg-gradient-to-br ${info.gradient} border ${info.border} rounded-2xl sm:rounded-3xl p-6 sm:p-8 text-left transition-all duration-500 hover:scale-[1.02] hover:-translate-y-1 hover:shadow-2xl ${info.hoverGlow} backdrop-blur-sm`}
                      >
                        <div className="absolute top-5 right-5 sm:top-6 sm:right-6 text-4xl sm:text-5xl transform group-hover:scale-110 group-hover:rotate-6 transition-all duration-500">
                          {info.icon}
                        </div>

                        <div className="mb-3 sm:mb-4">
                          <span className={`inline-block text-[10px] sm:text-xs font-bold uppercase tracking-widest px-3 py-1.5 rounded-full ${info.tagColor}`}>
                            {info.tag}
                          </span>
                        </div>

                        <h3 className="text-xl sm:text-2xl font-bold mb-2 sm:mb-3 text-white group-hover:text-white transition-colors">
                          {info.title}
                        </h3>

                        <p className="text-white/45 text-sm sm:text-base leading-relaxed">
                          {info.desc}
                        </p>

                        <div className="mt-5 sm:mt-6 flex items-center gap-2 font-semibold text-sm sm:text-base">
                          <span className="text-white/60 group-hover:text-white/90 transition-colors">
                            Start Playing
                          </span>
                          <svg className="w-4 h-4 sm:w-5 sm:h-5 transform group-hover:translate-x-1.5 transition-transform duration-300 text-white/60 group-hover:text-white/90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                          </svg>
                        </div>

                        <div className="absolute inset-0 rounded-2xl sm:rounded-3xl bg-gradient-to-br from-white/0 via-white/0 to-white/[0.02] opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Stats & Controls during game */}
            {currentGame && (
              <div className="space-y-4 sm:space-y-6">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                  {STAT_CARDS.map(({ key, label, suffix, gradient, border, textColor }) => (
                    <div
                      key={key}
                      className={`bg-gradient-to-br ${gradient} border ${border} rounded-xl sm:rounded-2xl p-4 sm:p-6 text-center backdrop-blur-sm`}
                    >
                      <div
                        id={`stat-${key}`}
                        className={`text-3xl sm:text-4xl lg:text-5xl font-bold ${textColor} mb-1 sm:mb-2 tabular-nums`}
                        aria-live="polite"
                      >
                        {stats[key]}{suffix}
                      </div>
                      <div className="text-[10px] sm:text-xs text-white/40 font-semibold uppercase tracking-widest">
                        {label}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
                  <button
                    onClick={stopGame}
                    className="group relative px-8 sm:px-10 py-3 sm:py-4 bg-white/[0.06] hover:bg-white/[0.1] text-white font-bold text-base sm:text-lg rounded-xl sm:rounded-2xl transition-all duration-300 border border-white/[0.08] hover:border-white/[0.15] overflow-hidden"
                  >
                    <span className="relative z-10 flex items-center gap-2">
                      <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      End Session
                    </span>
                    <div className="absolute inset-0 bg-gradient-to-r from-red-500/0 via-red-500/0 to-red-500/0 group-hover:from-red-500/10 group-hover:via-red-500/5 group-hover:to-red-500/0 transition-all duration-500" />
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
