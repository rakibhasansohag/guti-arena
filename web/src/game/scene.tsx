import { useEffect, type ReactNode } from 'react';
import { AnimatePresence, MotionConfig, motion } from 'motion/react';
import type { Look } from '@guti-arena/engine';
import { COURT, LookContext } from './look.ts';
import { motionPolicy, useSettings } from './settings.ts';
import { setAmbienceCourt } from './sound.ts';

/**
 * A game page in a look: the court's scene fills the page and everything inside draws that look.
 * A new scene fades in over the old one; the court's ambience plays while the page is open.
 */
export function Scene({ look, children }: { look: Look; children: ReactNode }) {
  const court = COURT[look.court];
  const settings = useSettings();
  useEffect(() => {
    setAmbienceCourt(look.court);
    return () => setAmbienceCourt(null);
  }, [look.court]);
  return (
    <LookContext value={look}>
      <MotionConfig reducedMotion={motionPolicy(settings)}>
        {/* Colour inline, not a class: toggling a class here restyles every board node on the page (~20 ms). */}
        <div
          className="scene relative isolate flex min-h-dvh flex-col"
          style={{ color: court.sceneDark ? 'var(--color-chalk)' : undefined }}
        >
          <AnimatePresence initial={false}>
            <motion.div
              key={look.court}
              aria-hidden="true"
              className="absolute inset-0 -z-10"
              style={{ background: court.scene }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
            />
          </AnimatePresence>
          {children}
        </div>
      </MotionConfig>
    </LookContext>
  );
}
