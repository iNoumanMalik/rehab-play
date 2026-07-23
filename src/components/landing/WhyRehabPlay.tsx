import { motion } from 'framer-motion';
import { Panel } from '../ui/primitives/Panel';

const BENEFITS = [
  { icon: '🧠', title: 'AI Pose Tracking', body: 'On-device MediaPipe vision reads 33 body landmarks in real time — no cloud upload, no lag.' },
  { icon: '🎽', title: 'No Wearable Devices', body: 'Your webcam is the only sensor. No straps, no controllers, no charging cables to lose.' },
  { icon: '🏠', title: 'Home Rehabilitation', body: 'Do your exercises on your own schedule, in your own living room, at your own pace.' },
  { icon: '🎮', title: 'Gamified Therapy', body: 'Every rep feeds a real game loop — score, combo, and story, not just a rep counter.' },
  { icon: '⚡', title: 'Real-time Feedback', body: 'Form cues and objective banners respond the instant your movement drifts off target.' },
];

export function WhyRehabPlay() {
  return (
    <section className="relative py-16 sm:py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="text-center max-w-2xl mx-auto mb-10 sm:mb-14">
        <span className="text-xs font-bold uppercase tracking-widest text-accent-text">Why RehabPlay?</span>
        <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-text font-display tracking-tight mt-2">
          Built different from a rep counter
        </h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 sm:gap-5">
        {BENEFITS.map((b, i) => (
          <motion.div
            key={b.title}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.45, delay: i * 0.06, ease: 'easeOut' }}
            whileHover={{ y: -4 }}
          >
            <Panel className="p-5 sm:p-6 h-full">
              <div aria-hidden="true" className="w-12 h-12 rounded-2xl bg-accent/15 flex items-center justify-center text-2xl mb-4">
                {b.icon}
              </div>
              <h3 className="font-bold text-text font-display mb-2">{b.title}</h3>
              <p className="text-muted text-sm leading-relaxed">{b.body}</p>
            </Panel>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
