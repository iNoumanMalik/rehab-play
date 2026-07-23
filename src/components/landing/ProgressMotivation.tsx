import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Panel } from '../ui/primitives/Panel';
import { Badge } from '../ui/primitives/Badge';
import { useProgression } from '../../hooks/useProgression';
import { achievementService } from '../../core/services/AchievementService';
import { analyticsService } from '../../core/services/AnalyticsService';
import { getAllGameMeta } from '../../games/gameRegistry';
import { ADVENTURE_SHOWCASE } from './adventureShowcase';

const PET_TIERS = [
  { min: 1, emoji: '🥚', name: 'Sprout the Egg', blurb: 'Still resting — finish a session to help it hatch.' },
  { min: 3, emoji: '🐣', name: 'Sprout the Hatchling', blurb: 'Just broke free! Keep training together.' },
  { min: 5, emoji: '🐥', name: 'Sprout the Fledgling', blurb: 'Growing stronger with every streak.' },
  { min: 8, emoji: '🦅', name: 'Sprout the Soarer', blurb: "You've come a long way — and so has Sprout." },
];

function petForLevel(level: number) {
  return [...PET_TIERS].reverse().find(t => level >= t.min) ?? PET_TIERS[0];
}

/** Falls back to a gentle illustrative curve when there isn't enough real
 * session history yet — clearly a demo shape, not a claim about this user. */
function MiniTrendChart({ scores }: { scores: number[] }) {
  const data = scores.length >= 2 ? scores.slice(-7) : [40, 55, 48, 62, 70, 65, 82];
  const max = Math.max(...data, 1);
  const isReal = scores.length >= 2;
  return (
    <div>
      <div className="flex items-end justify-between gap-2 h-28 sm:h-32 mb-2">
        {data.map((v, i) => (
          <div key={i} className="flex-1 flex flex-col items-center justify-end h-full">
            <motion.div
              title={`Session ${i + 1}: ${v} pts`}
              className="w-full rounded-t-md bg-accent"
              initial={{ height: 0 }}
              whileInView={{ height: `${Math.max(6, (v / max) * 100)}%` }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.05, ease: 'easeOut' }}
            />
          </div>
        ))}
      </div>
      <div className="h-px bg-border mb-2" />
      <p className="text-[11px] text-faint font-semibold">
        {isReal ? 'Your last 7 sessions, by score' : 'Illustrative trend — play a few sessions to see your own'}
      </p>
    </div>
  );
}

export function ProgressMotivation() {
  const { level, xpIntoLevel, xpForNextLevel, streakDays, dailyGoalCount, dailyGoalTarget } = useProgression();
  const achievements = useMemo(() => achievementService.getAll(), []);
  const history = useMemo(() => analyticsService.getHistory(), []);
  const games = useMemo(() => getAllGameMeta().sort((a, b) => ADVENTURE_SHOWCASE[a.id].unlockLevel - ADVENTURE_SHOWCASE[b.id].unlockLevel), []);
  const pet = petForLevel(level);

  return (
    <section className="relative py-16 sm:py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="text-center max-w-2xl mx-auto mb-10 sm:mb-14">
        <span className="text-xs font-bold uppercase tracking-widest text-accent-text">Progress & Motivation</span>
        <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-text font-display tracking-tight mt-2">
          Built to keep you coming back
        </h2>
        <p className="text-muted text-sm sm:text-base mt-3">
          Real XP, streaks, and achievements from your own sessions — shown here with sample values so you can see the full system.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 sm:gap-6">
        <Panel className="p-5 sm:p-6 lg:col-span-1">
          <h3 className="text-xs font-bold uppercase tracking-wider text-faint mb-4">Level & XP</h3>
          <div className="flex items-center justify-between mb-2">
            <span className="text-3xl font-extrabold text-text font-display">Lvl {level}</span>
            <Badge tone="warning">🔥 {streakDays}-day streak</Badge>
          </div>
          <div className="w-full h-2.5 rounded-full bg-surface-hover overflow-hidden mb-1.5">
            <div className="h-full rounded-full bg-accent" style={{ width: `${Math.min(100, (xpIntoLevel / Math.max(1, xpForNextLevel)) * 100)}%` }} />
          </div>
          <p className="text-[11px] text-faint font-semibold mb-4">{xpIntoLevel} / {xpForNextLevel} XP to next level</p>
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted font-semibold">Daily goal</span>
            <span className="font-bold text-text">{Math.min(dailyGoalCount, dailyGoalTarget)}/{dailyGoalTarget} sessions</span>
          </div>
        </Panel>

        <Panel className="p-5 sm:p-6 lg:col-span-1 flex flex-col items-center text-center justify-center">
          <h3 className="text-xs font-bold uppercase tracking-wider text-faint mb-4 self-start">Companion</h3>
          <motion.span
            aria-hidden="true"
            className="text-6xl mb-3"
            animate={{ y: [0, -6, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          >
            {pet.emoji}
          </motion.span>
          <p className="font-bold text-text font-display">{pet.name}</p>
          <p className="text-muted text-xs mt-1 max-w-[220px]">{pet.blurb}</p>
        </Panel>

        <Panel className="p-5 sm:p-6 lg:col-span-1">
          <h3 className="text-xs font-bold uppercase tracking-wider text-faint mb-4">
            Achievements ({achievements.filter(a => a.unlocked).length}/{achievements.length})
          </h3>
          <div className="grid grid-cols-5 gap-2">
            {achievements.map(a => (
              <div
                key={a.id}
                title={`${a.title} — ${a.description}`}
                className={`aspect-square rounded-xl flex items-center justify-center text-xl border ${
                  a.unlocked ? 'bg-accent/15 border-accent/30' : 'bg-surface-hover border-border grayscale opacity-40'
                }`}
              >
                <span aria-hidden="true">{a.icon}</span>
              </div>
            ))}
          </div>
        </Panel>

        <Panel className="p-5 sm:p-6 lg:col-span-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-faint mb-4">Progress Over Time</h3>
          <MiniTrendChart scores={history.map(h => h.score)} />
        </Panel>

        <Panel className="p-5 sm:p-6 lg:col-span-1">
          <h3 className="text-xs font-bold uppercase tracking-wider text-faint mb-4">Unlockable Worlds</h3>
          <ul className="space-y-2.5">
            {games.map(g => {
              const unlocked = level >= ADVENTURE_SHOWCASE[g.id].unlockLevel;
              return (
                <li key={g.id} className="flex items-center gap-3">
                  <span aria-hidden="true" className={`text-xl ${unlocked ? '' : 'grayscale opacity-50'}`}>{g.icon}</span>
                  <span className={`flex-1 text-sm font-semibold ${unlocked ? 'text-text' : 'text-faint'}`}>{g.title}</span>
                  {unlocked
                    ? <Badge tone="success">Unlocked</Badge>
                    : <Badge tone="neutral">Lvl {ADVENTURE_SHOWCASE[g.id].unlockLevel}</Badge>}
                </li>
              );
            })}
          </ul>
        </Panel>
      </div>
    </section>
  );
}
