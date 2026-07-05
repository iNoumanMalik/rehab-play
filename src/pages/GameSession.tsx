import { useState, useCallback } from 'react';
import type { PoseData, GameStats, GameId } from '../types';
import { FeedbackOverlay } from '../components/game/FeedbackOverlay';
import { ComboDisplay } from '../components/game/ComboDisplay';
import { StatCard } from '../components/ui/StatCard';
import { audioManager } from '../core/services/AudioManager';
import { analyticsService } from '../core/services/AnalyticsService';
import { achievementService } from '../core/services/AchievementService';
import type { GameComponentProps } from '../games/gameRegistry';

type GameComponent = React.ComponentType<GameComponentProps>;

interface GameSessionProps {
  gameId: GameId;
  GameComponent: GameComponent;
  poseDataRef: React.RefObject<PoseData | null>;
  onEnd: (stats: { score: number; maxCombo: number; level: number }) => void;
  onBack: () => void;
}

const STAT_CARDS_CONFIG = [
  { key: 'score' as const, label: 'Score', gradient: 'from-yellow-500/20 to-amber-500/15', border: 'border-yellow-500/40', textColor: 'text-yellow-200' },
  { key: 'accuracy' as const, label: 'Accuracy', suffix: '%', gradient: 'from-emerald-500/20 to-green-500/15', border: 'border-emerald-500/40', textColor: 'text-emerald-200' },
  { key: 'successfulActions' as const, label: 'Targets', gradient: 'from-cyan-500/20 to-blue-500/15', border: 'border-cyan-500/40', textColor: 'text-cyan-200' },
  { key: 'repetitions' as const, label: 'Reps', gradient: 'from-purple-500/20 to-pink-500/15', border: 'border-purple-500/40', textColor: 'text-purple-200' },
];

const INSTRUCTIONS: Record<string, string> = {
  'butterfly-rescue': 'Move your hands over butterflies to catch them. Avoid the brown moths!',
  'fruit-harvest': 'Reach up high and down low to collect recipe fruits. Watch out for wrong fruits!',
  'crystal-guardian': 'Raise both arms overhead to charge the crystal. Release to blast enemies!',
};

export function GameSession({ gameId, GameComponent, poseDataRef, onEnd, onBack }: GameSessionProps) {
  const [stats, setStats] = useState<GameStats>({ score: 0, accuracy: 100, successfulActions: 0, repetitions: 0, maxCombo: 0, level: 1, duration: 0 });
  const [feedback, setFeedback] = useState<string[]>([]);
  const [combo, setCombo] = useState(0);
  const [multiplier, setMultiplier] = useState(1);
  const [gameOver, setGameOver] = useState(false);

  const handleScoreUpdate = useCallback((score: number) => {
    setStats((prev: GameStats) => ({ ...prev, score }));
  }, []);

  const handleSuccessUpdate = useCallback((count: number) => {
    setStats((prev: GameStats) => ({ ...prev, successfulActions: count }));
  }, []);

  const handleRepetitionsUpdate = useCallback((count: number) => {
    setStats((prev: GameStats) => ({ ...prev, repetitions: count }));
  }, []);

  const handleGameEnd = useCallback((data: { score: number; level: number; maxCombo: number; accuracy: number; feedback: string[] }) => {
    setGameOver(true);
    setStats(prev => ({ ...prev, level: data.level, maxCombo: data.maxCombo, accuracy: data.accuracy }));

    const achievements = achievementService.check(data as unknown as GameStats);
    if (achievements.length > 0) {
      audioManager.playLevelUp();
      achievements.forEach(a => console.log(`Achievement unlocked: ${a.title}`));
    }
  }, []);

  const handleFeedback = useCallback((msgs: string[]) => {
    setFeedback(msgs);
  }, []);

  const handleComboUpdate = useCallback((c: number, m: number) => {
    setCombo(c);
    setMultiplier(m);
  }, []);

  const handleEndSession = () => {
    if (!gameOver) {
      const report = analyticsService.endSession(stats.score, stats.level, stats.maxCombo, stats.accuracy, feedback);
      handleGameEnd({ score: report.score, level: report.level, maxCombo: report.maxCombo, accuracy: report.accuracy, feedback: report.feedback });
    }
    onEnd({ score: stats.score, maxCombo: stats.maxCombo, level: stats.level });
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="relative rounded-2xl sm:rounded-3xl overflow-hidden bg-black/60 shadow-2xl border border-white/[0.1] aspect-[16/9] max-h-[60vh] mx-auto">
        <GameComponent
          poseDataRef={poseDataRef}
          onScoreUpdate={handleScoreUpdate}
          onSuccessUpdate={handleSuccessUpdate}
          onRepetitionsUpdate={handleRepetitionsUpdate}
          onGameEnd={handleGameEnd}
          onFeedback={handleFeedback}
          onComboUpdate={handleComboUpdate}
        />
        <FeedbackOverlay messages={feedback} visible={feedback.length > 0} />
        <ComboDisplay combo={combo} multiplier={multiplier} />
      </div>

      <div className="max-w-3xl mx-auto text-center bg-white/[0.02] border border-white/[0.08] backdrop-blur-lg rounded-2xl p-3 sm:p-4">
        <p className="text-white/70 text-xs sm:text-sm font-medium">
          💡 {INSTRUCTIONS[gameId] ?? 'Move your body to interact with the game. Follow the on-screen feedback for best results.'}
        </p>
      </div>

      <div className="space-y-4 max-w-5xl mx-auto">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {STAT_CARDS_CONFIG.map(({ key, label, suffix, gradient, border, textColor }) => (
            <StatCard
              key={key}
              id={`stat-${key}`}
              value={key === 'accuracy' ? `${stats[key]}${suffix}` : stats[key]}
              label={label}
              gradient={gradient}
              border={border}
              textColor={textColor}
            />
          ))}
        </div>

        <div className="flex justify-center gap-4">
          {gameOver ? (
            <button
              onClick={onBack}
              className="px-10 py-4 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white font-extrabold text-base sm:text-lg rounded-2xl transition-all duration-300 border border-violet-500/40 shadow-lg hover:shadow-violet-500/25 cursor-pointer outline-none focus-visible:ring-4 focus-visible:ring-violet-500/50"
            >
              Back to Dashboard
            </button>
          ) : (
            <button
              onClick={handleEndSession}
              className="group relative px-10 py-4 bg-white/[0.05] hover:bg-rose-500/10 text-white hover:text-rose-200 font-extrabold text-base sm:text-lg rounded-2xl transition-all duration-300 border border-white/[0.1] hover:border-rose-500/30 overflow-hidden shadow-lg shadow-black/20 cursor-pointer outline-none focus-visible:ring-4 focus-visible:ring-rose-500/50"
            >
              <span className="relative z-10 flex items-center gap-2.5">
                <svg className="w-5 h-5 transition-transform duration-300 group-hover:rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
                End Session
              </span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
