import type { ReactNode, RefObject } from 'react';
import { motion } from 'framer-motion';
import { Button } from '../ui/primitives/Button';

function scrollToId(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

const JOINTS: { x: number; y: number; r: number; glow?: boolean; delay: number }[] = [
  { x: 100, y: 30, r: 14, delay: 0 }, // head
  { x: 100, y: 50, r: 5, delay: 0.05 }, // neck
  { x: 78, y: 58, r: 6, delay: 0.1 }, // shoulder L
  { x: 122, y: 58, r: 6, delay: 0.1 }, // shoulder R
  { x: 53, y: 34, r: 6, delay: 0.2 }, // elbow L
  { x: 147, y: 34, r: 6, delay: 0.2 }, // elbow R
  { x: 38, y: 8, r: 7, glow: true, delay: 0.3 }, // wrist L
  { x: 162, y: 8, r: 7, glow: true, delay: 0.3 }, // wrist R
  { x: 85, y: 130, r: 6, delay: 0.15 }, // hip L
  { x: 115, y: 130, r: 6, delay: 0.15 }, // hip R
  { x: 80, y: 180, r: 6, delay: 0.25 }, // knee L
  { x: 120, y: 180, r: 6, delay: 0.25 }, // knee R
  { x: 78, y: 230, r: 6, delay: 0.35 }, // ankle L
  { x: 122, y: 230, r: 6, delay: 0.35 }, // ankle R
];

const BONES: { x1: number; y1: number; x2: number; y2: number }[] = [
  { x1: 100, y1: 50, x2: 78, y2: 58 },
  { x1: 100, y1: 50, x2: 122, y2: 58 },
  { x1: 78, y1: 58, x2: 53, y2: 34 },
  { x1: 53, y1: 34, x2: 38, y2: 8 },
  { x1: 122, y1: 58, x2: 147, y2: 34 },
  { x1: 147, y1: 34, x2: 162, y2: 8 },
  { x1: 100, y1: 50, x2: 100, y2: 130 },
  { x1: 100, y1: 130, x2: 85, y2: 130 },
  { x1: 100, y1: 130, x2: 115, y2: 130 },
  { x1: 85, y1: 130, x2: 80, y2: 180 },
  { x1: 80, y1: 180, x2: 78, y2: 230 },
  { x1: 115, y1: 130, x2: 120, y2: 180 },
  { x1: 120, y1: 180, x2: 122, y2: 230 },
];

/** An original pose-skeleton illustration (echoing the app's own MediaPipe
 * overlay) mid overhead-reach — ties the hero directly to "AI motion
 * tracking" without a stock photo or a live camera request. */
function PoseFigure() {
  return (
    <motion.div
      aria-hidden="true"
      className="relative w-[260px] h-[300px] sm:w-[320px] sm:h-[370px]"
      animate={{ y: [0, -10, 0] }}
      transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
    >
      <svg viewBox="0 0 200 245" className="w-full h-full overflow-visible">
        <defs>
          <radialGradient id="hero-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="var(--color-accent)" stopOpacity="0.9" />
            <stop offset="100%" stopColor="var(--color-accent)" stopOpacity="0" />
          </radialGradient>
        </defs>
        {BONES.map((b, i) => (
          <motion.line
            key={i}
            x1={b.x1} y1={b.y1} x2={b.x2} y2={b.y2}
            stroke="var(--color-accent)"
            strokeWidth={3}
            strokeLinecap="round"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 0.85 }}
            transition={{ duration: 0.5, delay: 0.3 + i * 0.04, ease: 'easeOut' }}
          />
        ))}
        {JOINTS.map((j, i) => (
          <g key={i}>
            {j.glow && <circle cx={j.x} cy={j.y} r={22} fill="url(#hero-glow)" />}
            <motion.circle
              cx={j.x} cy={j.y} r={j.r}
              fill={j.glow ? 'var(--color-accent-strong)' : 'var(--color-text)'}
              stroke="var(--color-bg)"
              strokeWidth={2}
              initial={{ scale: 0, opacity: 0 }}
              animate={
                j.glow
                  ? { scale: [0, 1.2, 1, 1.15, 1], opacity: 1 }
                  : { scale: 1, opacity: 1 }
              }
              transition={
                j.glow
                  ? { duration: 2.4, delay: 1 + j.delay, repeat: Infinity, repeatDelay: 0.6, times: [0, 0.3, 0.5, 0.75, 1] }
                  : { duration: 0.35, delay: 0.6 + j.delay }
              }
              style={{ transformOrigin: `${j.x}px ${j.y}px` }}
            />
          </g>
        ))}
      </svg>
    </motion.div>
  );
}

interface FloatingChipProps {
  className: string;
  delay: number;
  children: ReactNode;
}

function FloatingChip({ className, delay, children }: FloatingChipProps) {
  return (
    <motion.div
      className={`absolute px-3 py-2 sm:px-4 sm:py-2.5 rounded-2xl bg-surface-strong/80 backdrop-blur-xl border border-border-strong shadow-2 text-xs sm:text-sm font-bold text-text whitespace-nowrap ${className}`}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: [0, -8, 0] }}
      transition={{
        opacity: { duration: 0.6, delay },
        y: { duration: 4.5, delay: delay + 0.6, repeat: Infinity, ease: 'easeInOut' },
      }}
    >
      {children}
    </motion.div>
  );
}

function Particles() {
  const specs = [
    { left: '8%', top: '18%', size: 8, dur: 9 },
    { left: '85%', top: '12%', size: 6, dur: 7.5 },
    { left: '92%', top: '55%', size: 10, dur: 10 },
    { left: '4%', top: '68%', size: 7, dur: 8.2 },
    { left: '18%', top: '85%', size: 5, dur: 6.5 },
    { left: '70%', top: '82%', size: 8, dur: 9.5 },
  ];
  return (
    <div aria-hidden="true" className="absolute inset-0 overflow-hidden pointer-events-none">
      {specs.map((s, i) => (
        <motion.span
          key={i}
          className="absolute rounded-full bg-accent/30 blur-[1px]"
          style={{ left: s.left, top: s.top, width: s.size, height: s.size }}
          animate={{ y: [0, -22, 0], opacity: [0.3, 0.8, 0.3] }}
          transition={{ duration: s.dur, repeat: Infinity, ease: 'easeInOut', delay: i * 0.4 }}
        />
      ))}
    </div>
  );
}

interface HeroProps {
  headingRef?: RefObject<HTMLHeadingElement | null>;
}

export function Hero({ headingRef }: HeroProps) {
  return (
    <section className="relative overflow-hidden pt-8 pb-20 sm:pt-12 sm:pb-28 lg:pb-32">
      <div aria-hidden="true" className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-1/4 -left-1/4 w-2/3 h-2/3 bg-accent/10 rounded-full blur-[140px]" />
        <div className="absolute -bottom-1/3 -right-1/4 w-2/3 h-2/3 bg-success/10 rounded-full blur-[140px]" />
      </div>
      <Particles />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-8 items-center">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="text-center lg:text-left order-2 lg:order-1"
        >
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-accent/15 border border-accent/30 text-accent-text text-xs sm:text-sm font-bold tracking-wide mb-5 sm:mb-6">
            <span aria-hidden="true">✨</span> AI-Powered Rehabilitation
          </span>
          <h1 ref={headingRef} tabIndex={-1} className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-text font-display tracking-tight leading-[1.05] mb-5 sm:mb-6 outline-none">
            Physical therapy that feels like <span className="text-accent-strong">play</span>, not homework.
          </h1>
          <p className="text-muted text-base sm:text-lg leading-relaxed max-w-xl mx-auto lg:mx-0 mb-8 sm:mb-10">
            RehabPlay turns your webcam into a full-body motion sensor — no wearables, no controllers.
            Real-time AI pose tracking transforms clinically-grounded exercises into adventures you'll
            actually want to finish.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center lg:justify-start mb-8 sm:mb-10">
            <Button variant="primary" size="lg" onClick={() => scrollToId('how-it-works')}>
              🎮 Start Therapy
            </Button>
            <Button variant="secondary" size="lg" onClick={() => scrollToId('adventures')}>
              Explore Games
            </Button>
          </div>
          <div className="flex flex-wrap items-center justify-center lg:justify-start gap-x-6 gap-y-2 text-xs sm:text-sm text-faint font-semibold">
            <span>🧠 Real-time AI tracking</span>
            <span>🏠 No wearables needed</span>
            <span>🎯 Adapts to your own range of motion</span>
          </div>
        </motion.div>

        <div className="relative flex items-center justify-center order-1 lg:order-2 min-h-[300px] sm:min-h-[370px]">
          <PoseFigure />
          <FloatingChip className="top-2 left-0 sm:left-4" delay={1.4}>
            🎯 94% Rep Accuracy
          </FloatingChip>
          <FloatingChip className="bottom-8 right-0 sm:right-2" delay={1.9}>
            🔥 12-Day Streak
          </FloatingChip>
          <FloatingChip className="bottom-24 left-0 sm:-left-4" delay={2.3}>
            ⚡ Real-Time Feedback
          </FloatingChip>
        </div>
      </div>
    </section>
  );
}
