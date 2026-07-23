import type { GameMeta } from '../../types';
import { Badge } from '../ui/primitives/Badge';
import { Button } from '../ui/primitives/Button';
import { DIFFICULTY_TONE, masteryPercent, type AdventureShowcaseMeta } from './adventureShowcase';

interface AdventureSlideProps {
  meta: GameMeta;
  showcase: AdventureShowcaseMeta;
  sessions: number;
  level: number;
  index: number;
  onPlay: () => void;
}

const TONE_GLOW: Record<GameMeta['tone'], string> = {
  accent: 'from-accent/30 via-accent/10 to-transparent',
  success: 'from-success/30 via-success/10 to-transparent',
  warning: 'from-warning/30 via-warning/10 to-transparent',
  danger: 'from-danger/30 via-danger/10 to-transparent',
  neutral: 'from-border-strong/40 via-border/10 to-transparent',
};

const TONE_TITLE_GRADIENT: Record<GameMeta['tone'], string> = {
  accent: 'from-accent via-accent-strong to-danger',
  success: 'from-success via-accent to-warning',
  warning: 'from-warning via-accent to-danger',
  danger: 'from-danger via-accent-strong to-warning',
  neutral: 'from-text via-muted to-faint',
};

/**
 * One game as a full-bleed, rounded "hero" card — icon badge top-left, a big
 * faint index-number watermark top-right, a vivid gradient title, and the
 * showcase stats/CTA in a left-aligned block. Purely presentational: the
 * parent (FeaturedAdventures) owns all scroll/position logic, since these
 * cards are laid out side-by-side in a row that slides as a whole rather than
 * each card managing its own transform.
 */
export function AdventureSlide({ meta, showcase, sessions, level, index, onPlay }: AdventureSlideProps) {
  const unlocked = level >= showcase.unlockLevel;
  const progress = masteryPercent(sessions);
  const isNew = sessions === 0;

  return (
    <div className="relative w-screen h-full flex-shrink-0 px-3 sm:px-6 py-3 sm:py-6">
      <div className="relative w-full h-full rounded-[28px] sm:rounded-[40px] border border-border-strong bg-surface overflow-hidden flex items-center">
        <div className={`absolute inset-y-0 right-0 w-2/3 bg-gradient-to-l ${TONE_GLOW[meta.tone]} pointer-events-none`} aria-hidden="true" />

        <span aria-hidden="true" className="absolute top-6 right-8 sm:top-10 sm:right-14 text-7xl sm:text-9xl font-black text-text/[0.06] select-none font-display leading-none">
          {String(index + 1).padStart(2, '0')}
        </span>

        <div className="absolute top-6 left-6 sm:top-10 sm:left-10 w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-surface-strong border border-border-strong flex items-center justify-center text-3xl sm:text-4xl">
          <span aria-hidden="true">{meta.icon}</span>
        </div>

        <div className="relative z-10 max-w-xl px-6 sm:px-14">
          <div className="flex items-center gap-2 mb-4">
            <Badge tone={DIFFICULTY_TONE[showcase.difficulty]}>{showcase.difficulty}</Badge>
            {unlocked ? (
              isNew ? <Badge tone="accent">✨ New</Badge> : <Badge tone="neutral">✓ Unlocked</Badge>
            ) : (
              <Badge tone="neutral">🔒 Lvl {showcase.unlockLevel}</Badge>
            )}
          </div>

          <h3 className={`text-4xl sm:text-6xl font-extrabold font-display tracking-tight mb-4 bg-gradient-to-r ${TONE_TITLE_GRADIENT[meta.tone]} bg-clip-text text-transparent`}>
            {meta.title}
          </h3>

          <p className="text-muted text-sm sm:text-lg leading-relaxed max-w-md mb-5">
            {meta.description}
          </p>

          <div className="flex flex-wrap gap-2 mb-6">
            {showcase.muscleGroups.map(m => (
              <span key={m} className="text-xs sm:text-sm font-bold bg-surface-strong border border-border-strong text-muted px-3.5 py-1.5 rounded-full">
                {m}
              </span>
            ))}
          </div>

          <div className="flex items-center gap-6 text-xs sm:text-sm text-faint font-semibold mb-6">
            <span>⏱ {showcase.estMinutes}</span>
            <span>{sessions} session{sessions === 1 ? '' : 's'} played</span>
          </div>

          <div className="max-w-xs mb-6">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-faint">Mastery</span>
              <span className="text-[10px] font-bold text-faint">{progress}%</span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-surface-hover overflow-hidden">
              <div className="h-full rounded-full bg-accent transition-[width] duration-700 ease-out" style={{ width: `${progress}%` }} />
            </div>
          </div>

          <Button
            variant={unlocked ? 'primary' : 'secondary'}
            size="lg"
            disabled={!unlocked}
            aria-disabled={!unlocked}
            title={unlocked ? undefined : `Reach player level ${showcase.unlockLevel} to unlock`}
            onClick={onPlay}
          >
            {unlocked ? '▶ Play Now' : `🔒 Unlocks at Level ${showcase.unlockLevel}`}
          </Button>
        </div>
      </div>
    </div>
  );
}
