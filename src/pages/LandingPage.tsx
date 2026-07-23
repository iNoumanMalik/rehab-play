import { useEffect, useRef } from 'react';
import { useOutletContext } from 'react-router-dom';
import { MotionConfig } from 'framer-motion';
import { Hero } from '../components/landing/Hero';
import { FeaturedAdventures } from '../components/landing/FeaturedAdventures';
import { WhyRehabPlay } from '../components/landing/WhyRehabPlay';
import { HowItWorks } from '../components/landing/HowItWorks';
import { ProgressMotivation } from '../components/landing/ProgressMotivation';
import { AccessibilityShowcase } from '../components/landing/AccessibilityShowcase';
import { Testimonials } from '../components/landing/Testimonials';
import { Footer } from '../components/landing/Footer';
import { useSettings } from '../hooks/useSettings';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import type { AppOutletContext } from '../App';

export function LandingPage() {
  const { games, startGame } = useOutletContext<AppOutletContext>();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [{ reducedMotion }] = useSettings();

  useDocumentTitle('RehabPlay — AI-Powered Rehabilitation Gaming');
  useEffect(() => { headingRef.current?.focus(); }, []);

  return (
    <MotionConfig reducedMotion={reducedMotion ? 'always' : 'never'}>
      <div>
        <Hero headingRef={headingRef} />
        <FeaturedAdventures games={games} onPlay={startGame} />
        <WhyRehabPlay />
        <HowItWorks />
        <ProgressMotivation />
        <AccessibilityShowcase />
        <Testimonials />
        <Footer games={games} onPlay={startGame} />
      </div>
    </MotionConfig>
  );
}
