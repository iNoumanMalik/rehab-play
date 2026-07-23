import { motion } from 'framer-motion';

const STEPS = [
  { icon: '📷', title: 'Open Camera', body: 'Grant webcam access — everything runs locally in your browser, nothing is uploaded.' },
  { icon: '📐', title: 'Calibrate', body: "A quick guided stretch measures your own comfortable range of motion." },
  { icon: '🗺️', title: 'Choose Adventure', body: 'Pick from seven motion-tracked games, each tuned to a different rehab focus.' },
  { icon: '🚀', title: 'Start Playing', body: 'Move naturally — the AI reads your form and turns every rep into gameplay.' },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="relative py-16 sm:py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="text-center max-w-2xl mx-auto mb-10 sm:mb-16">
        <span className="text-xs font-bold uppercase tracking-widest text-accent-text">How It Works</span>
        <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-text font-display tracking-tight mt-2">
          Four steps from couch to session
        </h2>
      </div>

      <div className="relative grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-4">
        <div aria-hidden="true" className="hidden lg:block absolute top-8 left-[12.5%] right-[12.5%] h-[2px] bg-gradient-to-r from-transparent via-border-strong to-transparent" />
        {STEPS.map((s, i) => (
          <motion.div
            key={s.title}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.5, delay: i * 0.12, ease: 'easeOut' }}
            className="relative text-center"
          >
            <div className="relative mx-auto mb-5 w-16 h-16 rounded-3xl bg-accent text-white flex items-center justify-center text-2xl shadow-2">
              <span aria-hidden="true">{s.icon}</span>
              <span className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-surface-strong border border-border-strong text-[11px] font-extrabold text-text flex items-center justify-center">
                {i + 1}
              </span>
            </div>
            <h3 className="font-bold text-text font-display mb-2">{s.title}</h3>
            <p className="text-muted text-sm leading-relaxed max-w-xs mx-auto">{s.body}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
