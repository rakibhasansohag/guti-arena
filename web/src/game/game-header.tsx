import { Link } from 'react-router';
import { CircleHelp } from 'lucide-react';
import type { BoardId, Seat } from '@guti-arena/engine';
import { Button } from '@/components/ui/button';
import { useT } from '@/i18n';
import { cn } from '@/lib/utils';
import { guidePath } from '@/share/guides';
import { LangSwitch } from '@/share';
import { Guti } from '@/share/guti';
import { Logo, WRAP } from '@/share/site-chrome';
import { useLook } from './look.ts';
import { MuteButton } from './mute-button.tsx';

/** The slim header on game pages: home link, the rules of the game being played (`help`), sound and language. */
export function GameHeader({ help }: { help?: BoardId }) {
  const t = useT('game');
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
        {help && (
          <Button asChild variant="ghost" size="icon-lg" className="rounded-full">
            <a
              href={guidePath(help)}
              target="_blank"
              rel="noopener"
              aria-label={t('help.rules', { name: t(`boards.${help}`) })}
              title={t('help.rules', { name: t(`boards.${help}`) })}
            >
              <CircleHelp className="size-5" />
            </a>
          </Button>
        )}
        <MuteButton />
        <LangSwitch />
      </div>
    </header>
  );
}

/** One piece of the current look with the seat's colour and mark, for lists and badges. */
export function SeatPip({
  seat,
  board,
  className,
}: {
  seat: Seat;
  board?: BoardId;
  className?: string;
}) {
  const look = useLook();
  return (
    <svg
      viewBox="-0.42 -0.42 0.84 0.84"
      aria-hidden="true"
      className={cn('size-7 shrink-0 overflow-visible', className)}
    >
      <Guti set={look.pieces} seat={seat} board={board} />
    </svg>
  );
}

/** One option of a pill-shaped segmented control (use with `aria-pressed`). */
export const SEGMENT =
  'h-11 flex-1 rounded-full px-3 font-display text-sm font-extrabold transition-[background-color,color,translate,scale,box-shadow] duration-[200ms,200ms,350ms,300ms,350ms] ease-clay hover:-translate-y-0.5 hover:bg-clay/25 hover:shadow-clay active:translate-y-0 active:scale-95 aria-pressed:bg-charcoal aria-pressed:text-chalk aria-pressed:hover:bg-charcoal sm:text-base';
