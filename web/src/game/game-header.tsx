import { Link } from 'react-router';
import type { Seat } from '@guti-arena/engine';
import { cn } from '@/lib/utils';
import { LangSwitch, SEAT_FILL, SeatMark } from '@/share';
import { Logo, WRAP } from '@/share/site-chrome';
import { MuteButton } from './mute-button.tsx';

/** The slim header on game pages: home link, sound and language. */
export function GameHeader() {
  return (
    <header className={cn(WRAP, 'flex items-center justify-between gap-3 py-3')}>
      <Link
        to="/"
        className="flex items-center gap-2 rounded-full font-display text-xl font-extrabold transition-opacity duration-200 hover:opacity-80"
      >
        <Logo />
        <span lang="en">Guti Arena</span>
      </Link>
      <div className="flex items-center gap-2">
        <MuteButton />
        <LangSwitch />
      </div>
    </header>
  );
}

/** A small flat pebble with the seat's colour and mark, for lists and badges. */
export function SeatPip({ seat, className }: { seat: Seat; className?: string }) {
  return (
    <svg viewBox="-0.5 -0.5 1 1" aria-hidden="true" className={cn('size-7 shrink-0', className)}>
      <circle
        r={0.42}
        fill={SEAT_FILL[seat]}
        stroke="var(--color-charcoal)"
        strokeWidth={seat === 2 ? 0.07 : 0.045}
      />
      <SeatMark
        seat={seat}
        x={0}
        y={0}
        colour={seat === 1 || seat === 2 ? 'var(--color-charcoal)' : 'var(--color-chalk)'}
      />
    </svg>
  );
}

/** One option of a pill-shaped segmented control (use with `aria-pressed`). */
export const SEGMENT =
  'h-11 flex-1 rounded-full px-3 font-display text-sm font-extrabold transition-[background-color,color,scale] duration-[200ms,200ms,300ms] ease-clay hover:bg-chalk active:scale-95 aria-pressed:bg-charcoal aria-pressed:text-chalk sm:text-base';
