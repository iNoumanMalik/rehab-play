import { motion } from 'framer-motion';
import { Panel } from '../ui/primitives/Panel';

const TESTIMONIALS = [
  {
    quote: "My shoulder mobility homework used to feel like a chore. Turning it into Crystal Guardian is the first time I've actually looked forward to my reps.",
    name: 'Amara S.',
    role: 'Post-surgery shoulder rehab',
    avatar: '🧑🏽',
  },
  {
    quote: "The calibration step made all the difference — the game adapts to how far I can actually reach today, not some generic range.",
    name: 'Daniyal R.',
    role: 'Home balance & core program',
    avatar: '🧑🏻',
  },
  {
    quote: "As a caregiver I love that I can see the session history. It's the first tool that's kept my dad consistent for more than a week.",
    name: 'Farah K.',
    role: 'Caregiver',
    avatar: '👩🏽',
  },
];

/** Illustrative placeholder quotes for demo purposes — not attributed to real people. */
export function Testimonials() {
  return (
    <section className="relative py-16 sm:py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="text-center max-w-2xl mx-auto mb-10 sm:mb-14">
        <span className="text-xs font-bold uppercase tracking-widest text-accent-text">What People Say</span>
        <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-text font-display tracking-tight mt-2">
          Therapy people actually stick with
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-6">
        {TESTIMONIALS.map((t, i) => (
          <motion.div
            key={t.name}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.45, delay: i * 0.08, ease: 'easeOut' }}
            whileHover={{ y: -4 }}
          >
            <Panel className="p-6 h-full flex flex-col">
              <span aria-hidden="true" className="text-accent-strong text-3xl font-display leading-none mb-3">“</span>
              <p className="text-text text-sm leading-relaxed flex-1 mb-5">{t.quote}</p>
              <div className="flex items-center gap-3">
                <span aria-hidden="true" className="w-10 h-10 rounded-full bg-accent/15 flex items-center justify-center text-lg flex-shrink-0">
                  {t.avatar}
                </span>
                <div>
                  <p className="font-bold text-text text-sm">{t.name}</p>
                  <p className="text-faint text-xs">{t.role}</p>
                </div>
              </div>
            </Panel>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
