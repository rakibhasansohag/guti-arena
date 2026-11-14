import type { ReactNode } from 'react';
import type { Look } from '@guti-arena/engine';
import { cn } from '@/lib/utils';
import { COURT, LookContext } from './look.ts';

/** A game page in a look: the court's scene fills the page and everything inside draws that look. */
export function Scene({ look, children }: { look: Look; children: ReactNode }) {
  const court = COURT[look.court];
  return (
    <LookContext value={look}>
      <div
        className={cn('scene flex min-h-dvh flex-col', court.sceneDark && 'text-chalk')}
        style={{ background: court.scene }}
      >
        {children}
      </div>
    </LookContext>
  );
}
