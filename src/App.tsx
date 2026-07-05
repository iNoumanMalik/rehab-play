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
    desc: 'Move your hands to catch colorful butterflies. Improves hand-eye coordination, range of motion, and reaction times.',
    tag: 'Hand-Eye Coordination',
    icon: '🦋',
    gradient: 'from-pink-600/30 via-rose-600/15 to-purple-600/30',
    border: 'border-pink-500/40 hover:border-pink-400/80',
    tagColor: 'text-pink-200 bg-pink-500/25',
    hoverGlow: 'shadow-pink-500/30',
  },
  fruit: {
    title: 'Fruit Reach',
    desc: 'Stretch your arms to collect fruits appearing across the screen. Enhances range of motion, flexibility, and upper body strength.',
    tag: 'Range of Motion',
    icon: '🍎',
    gradient: 'from-orange-600/30 via-amber-600/15 to-red-600/30',
    border: 'border-orange-500/40 hover:border-orange-400/80',
    tagColor: 'text-orange-200 bg-orange-500/25',
    hoverGlow: 'shadow-orange-500/30',
  },
  'arm-raise': {
    title: 'Arm Raise',
    desc: 'Perform controlled arm raises with real-time automatic repetition counting. Builds upper body strength, coordination, and muscle endurance.',
    tag: 'Strength Training',
    icon: '💪',
    gradient: 'from-blue-600/30 via-cyan-600/15 to-teal-600/30',
    border: 'border-blue-500/40 hover:border-blue-400/80',
    tagColor: 'text-cyan-200 bg-cyan-500/25',
    hoverGlow: 'shadow-blue-500/30',
  },
};

const STAT_CARDS: { key: keyof GameStats; label: string; suffix?: string; gradient: string; border: string; textColor: string }[] = [
  { key: 'score', label: 'Score', gradient: 'from-yellow-500/20 to-amber-500/15', border: 'border-yellow-500/40', textColor: 'text-yellow-200' },
  { key: 'accuracy', label: 'Accuracy', suffix: '%', gradient: 'from-emerald-500/20 to-green-500/15', border: 'border-emerald-500/40', textColor: 'text-emerald-200' },
  { key: 'successfulActions', label: 'Successful Actions', gradient: 'from-cyan-500/20 to-blue-500/15', border: 'border-cyan-500/40', textColor: 'text-cyan-200' },
  { key: 'repetitions', label: 'Repetitions', gradient: 'from-purple-500/20 to-pink-500/15', border: 'border-purple-500/40', textColor: 'text-purple-200' },
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
        { y: 0, opacity: 1, scale: 1, duration: 0.5, stagger: 0.12, ease: 'back.out(1.5)' }
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
            { scale: 1.25, color: stats[key] > prevStats.current[key] ? '#a7f3d0' : undefined },
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
      {/* Animated Gradient Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-br from-violet-600/15 via-transparent to-cyan-600/15 rounded-full blur-[140px] animate-[pulse_10s_ease-in-out_infinite]" />
        <div className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-gradient-to-tl from-pink-600/15 via-transparent to-amber-600/15 rounded-full blur-[140px] animate-[pulse_12s_ease-in-out_infinite_2s]" />
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PHBhdGggZD0iTTM2IDM0djItSDI0di0yaDEyek0zNiAyNHYySDI0di0yaDEyeiIvPjwvZz48L2c+PC9zdmc+')] opacity-50" />
      </div>

      {/* Header */}
      <header ref={headerRef} className="relative z-20 bg-[#070B1A]/80 backdrop-blur-xl border-b border-white/[0.08] sticky top-0 opacity-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="relative w-12 h-12">
                <div className="absolute inset-0 bg-gradient-to-br from-violet-500 via-purple-500 to-pink-500 rounded-2xl animate-pulse opacity-60 blur-md" />
                <div className="relative w-full h-full bg-gradient-to-br from-violet-500 via-purple-500 to-pink-500 rounded-2xl flex items-center justify-center shadow-xl border border-white/20">
                  <span className="text-2xl">⚡</span>
                </div>
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-extrabold bg-gradient-to-r from-violet-200 via-purple-200 to-pink-200 bg-clip-text text-transparent tracking-tight">
                  RehabPlay
                </h1>
                <p className="text-xs sm:text-sm text-white/60 font-semibold tracking-widest uppercase mt-0.5">
                  Gamified Physiotherapy
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              {videoReady && (
                <span className="flex items-center gap-2.5 px-4 py-2 bg-emerald-500/20 text-emerald-200 rounded-full text-xs sm:text-sm font-semibold border border-emerald-500/40 shadow-sm shadow-emerald-500/10">
                  <span className="relative w-2.5 h-2.5">
                    <span className="absolute inset-0 bg-emerald-400 rounded-full animate-ping opacity-75" />
                    <span className="relative block w-2.5 h-2.5 bg-emerald-400 rounded-full" />
                  </span>
                  Camera Active
                </span>
              )}
              {!isReady && videoReady && (
                <span className="flex items-center gap-2.5 px-4 py-2 bg-amber-500/20 text-amber-200 rounded-full text-xs sm:text-sm font-semibold border border-amber-500/40 shadow-sm shadow-amber-500/10 animate-pulse">
                  <span className="w-2.5 h-2.5 bg-amber-400 rounded-full" />
                  Loading Tracking Models
                </span>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {/* Webcam Setup & Loader */}
        {!videoReady ? (
          <div className="flex flex-col items-center justify-center min-h-[65vh] gap-8 bg-white/[0.02] border border-white/[0.06] rounded-3xl p-8 sm:p-12 shadow-2xl backdrop-blur-md">
            <div className="relative">
              <div className="w-24 h-24 border-[4px] border-violet-500/20 border-t-violet-400 rounded-full animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-3xl">📷</span>
              </div>
            </div>
            <div className="text-center max-w-lg">
              <h2 className="text-2xl sm:text-3xl font-extrabold mb-3 bg-gradient-to-r from-white to-white/80 bg-clip-text text-transparent">
                Setting Up Your Rehabilitation Space
              </h2>
              <p className="text-white/70 text-base sm:text-lg leading-relaxed">
                Please allow camera access when prompted by your browser to enable live motion-controlled activities.
              </p>
            </div>
            <div className="w-full max-w-md rounded-2xl overflow-hidden shadow-xl border border-white/10 opacity-0 pointer-events-none absolute">
              <Webcam onVideoReady={handleVideoReady} />
            </div>
          </div>
        ) : (
          <div className="space-y-8 sm:space-y-12">
            {/* Camera View and Game Screen */}
            <div className="relative rounded-3xl overflow-hidden bg-black/60 shadow-2xl border border-white/[0.1] aspect-[16/9] max-h-[65vh] mx-auto flex items-center justify-center">
              <Webcam onVideoReady={handleVideoReady} />

              {!isReady && !currentGame && (
                <div className="absolute inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center z-15">
                  <div className="text-center p-6 max-w-sm">
                    <div className="w-16 h-16 border-[4px] border-cyan-500/20 border-t-cyan-400 rounded-full animate-spin mx-auto mb-6" />
                    <h3 className="text-xl font-bold text-cyan-200">Loading Computer Vision Models</h3>
                    <p className="text-white/70 text-sm mt-3 leading-relaxed">Initializing high-accuracy pose landmark detection. This will take just a moment.</p>
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

            {/* Instruction Overlay under Webcam if in Game */}
            {currentGame && (
              <div className="max-w-3xl mx-auto text-center bg-white/[0.02] border border-white/[0.08] backdrop-blur-lg rounded-2xl p-4 sm:p-5">
                <p className="text-white/80 text-sm sm:text-base font-medium">
                  {currentGame === 'butterfly' && "💡 Stretch and move your hands over the flying butterflies to catch them. Great for wrist and elbow flexibility."}
                  {currentGame === 'fruit' && "💡 Reach out with either hand to touch the floating fruits. Promotes full shoulder flexion and upper arm extension."}
                  {currentGame === 'arm-raise' && "💡 Stand in clear view of the camera. Raise either arm straight up above the line, hold it, then lower it fully to count a repetition."}
                </p>
              </div>
            )}

            {/* Game / Exercise Selection Lobby */}
            {!currentGame && (
              <div className="space-y-8">
                <div className="text-center md:text-left">
                  <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold bg-gradient-to-r from-white via-white/90 to-white/70 bg-clip-text text-transparent tracking-tight">
                    Choose Your Exercise
                  </h2>
                  <p className="text-white/70 mt-3 text-base sm:text-lg max-w-2xl leading-relaxed">
                    Select a therapeutic, motion-controlled activity below to start your physiotherapy routine and monitor your metrics.
                  </p>
                </div>

                <div ref={cardsRef} className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
                  {(Object.keys(GAME_INFO) as GameType[]).map((game) => {
                    const info = GAME_INFO[game];
                    return (
                      <button
                        key={game}
                        data-card
                        onClick={() => startGame(game)}
                        className={`group relative bg-gradient-to-br ${info.gradient} border ${info.border} rounded-3xl p-8 text-left transition-all duration-300 hover:scale-[1.03] hover:-translate-y-1.5 hover:shadow-2xl ${info.hoverGlow} backdrop-blur-md cursor-pointer`}
                      >
                        <div className="absolute top-6 right-6 text-5xl transform group-hover:scale-120 group-hover:rotate-6 transition-all duration-300">
                          {info.icon}
                        </div>

                        <div className="mb-4">
                          <span className={`inline-block text-xs font-extrabold uppercase tracking-wider px-3.5 py-1.5 rounded-full ${info.tagColor} border border-white/5`}>
                            {info.tag}
                          </span>
                        </div>

                        <h3 className="text-2xl font-bold mb-3 text-white group-hover:text-white transition-colors">
                          {info.title}
                        </h3>

                        <p className="text-white/80 text-sm sm:text-base leading-relaxed mb-6 font-medium">
                          {info.desc}
                        </p>

                        <div className="mt-auto flex items-center font-bold text-sm sm:text-base text-white/90 group-hover:text-white">
                          <span className="relative py-1 after:absolute after:bottom-0 after:left-0 after:h-[2px] after:w-0 after:bg-white after:transition-all after:duration-300 group-hover:after:w-full">
                            Start Session
                          </span>
                        </div>

                        <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-white/0 via-white/0 to-white/[0.03] opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Performance Stats Dashboard & Session Controls */}
            {currentGame && (
              <div className="space-y-6 sm:space-y-8 max-w-5xl mx-auto">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                  {STAT_CARDS.map(({ key, label, suffix, gradient, border, textColor }) => (
                    <div
                      key={key}
                      className={`bg-gradient-to-br ${gradient} border ${border} rounded-2xl p-5 sm:p-6 text-center backdrop-blur-md shadow-lg shadow-black/20`}
                    >
                      <div
                        id={`stat-${key}`}
                        className={`text-4xl sm:text-5xl font-extrabold ${textColor} mb-2 tabular-nums tracking-tight`}
                        aria-live="polite"
                      >
                        {stats[key]}{suffix}
                      </div>
                      <div className="text-xs sm:text-sm text-white/70 font-bold uppercase tracking-wider">
                        {label}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex justify-center">
                  <button
                    onClick={stopGame}
                    className="group relative px-10 py-4 bg-white/[0.05] hover:bg-red-500/10 text-white hover:text-red-200 font-extrabold text-base sm:text-lg rounded-2xl transition-all duration-300 border border-white/[0.1] hover:border-red-500/30 overflow-hidden shadow-lg shadow-black/20 cursor-pointer"
                  >
                    <span className="relative z-10 flex items-center gap-2.5">
                      <svg className="w-5 h-5 transition-transform duration-300 group-hover:rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      End Active Session
                    </span>
                    <div className="absolute inset-0 bg-gradient-to-r from-red-500/0 via-red-500/0 to-red-500/0 group-hover:from-red-500/5 group-hover:via-red-500/2 to-red-500/0 transition-all duration-500" />
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
