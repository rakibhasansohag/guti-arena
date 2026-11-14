import type { ReactNode } from 'react';
import { Link } from 'react-router';
import type { Seat } from '@guti-arena/engine';
import { cn } from '@/lib/utils';
import { LangSwitch } from '@/share';
import { Guti } from '@/share/guti';
import { Logo, WRAP } from '@/share/site-chrome';
import { useLook } from './look.ts';
import { MuteButton } from './mute-button.tsx';

/** The slim header on game pages: home link, any page controls (`children`), sound and language. */
export function GameHeader({ children }: { children?: ReactNode }) {
  return (
    <header className={cn(WRAP, 'flex items-center justify-between gap-3 py-3')}>
      <Link
        to="/"
        className="flex items-center gap-2 rounded-full font-display text-xl font-extrabold transition-opacity duration-200 hover:opacity-80"
      >
        <Logo />
        {/* With an extra control, narrow phones keep the name for screen readers only. */}
        <span lang="en" className={cn('whitespace-nowrap', children && 'max-[26rem]:sr-only')}>
          Guti Arena
        </span>
      </Link>
      <div className="flex items-center gap-2">
        {children}
        <MuteButton />
        <LangSwitch />
      </div>
    </header>
  );
}

/** One piece of the current look with the seat's colour and mark, for lists and badges. */
export function SeatPip({ seat, className }: { seat: Seat; className?: string }) {
  const look = useLook();
  return (
    <svg
      viewBox="-0.42 -0.42 0.84 0.84"
      aria-hidden="true"
      className={cn('size-7 shrink-0 overflow-visible', className)}
    >
      <Guti set={look.pieces} seat={seat} />
    </svg>
  );
}

/** One option of a pill-shaped segmented control (use with `aria-pressed`). */
export const SEGMENT =
  'h-11 flex-1 rounded-full px-3 font-display text-sm font-extrabold transition-[background-color,color,scale] duration-[200ms,200ms,300ms] ease-clay hover:bg-chalk active:scale-95 aria-pressed:bg-charcoal aria-pressed:text-chalk sm:text-base';
