import { useEffect, useRef, useState, type CSSProperties, type RefObject } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { SmilePlus, X } from 'lucide-react';
import type { ReactionId } from '@guti-arena/engine';
import { SEGMENT } from '@/game';
import { useT } from '@/i18n';
import { cn } from '@/lib/utils';

/** The tray's two tabs; together they hold every id in `REACTIONS`. */
const TABS = {
  emoji: ['hello', 'haha', 'wow', 'fire', 'sorry', 'oops', 'sad', 'thinking'],
  words: ['nice', 'gg', 'noo', 'hurry', 'watch-out', 'my-turn', 'too-easy', 'gotcha'],
} as const satisfies Record<string, readonly ReactionId[]>;
type Tab = keyof typeof TABS;

/** Bundled Noto Emoji art, so every device shows the same picture. */
export const ReactionArt = ({ id, className }: { id: ReactionId; className?: string }) => (
  <img src={`/reactions/${id}.svg`} alt="" draggable={false} className={cn('size-6', className)} />
);

const EMOJI = new Set<ReactionId>(TABS.emoji);

/** What a seat panel shows for a few seconds after that seat reacts: an emoji alone, or words alone. */
export function ReactionBubble({ id }: { id: ReactionId }) {
  const t = useT('room');
  const calm = useReducedMotion();
  const emoji = EMOJI.has(id);
  return (
    <motion.span
      // A little wobble on arrival, like a pebble dropped on the court.
      initial={calm ? false : { rotate: -8, scale: emoji ? 0.6 : 1 }}
      animate={{ rotate: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 500, damping: 12 }}
      className={cn(
        'flex items-center rounded-full bg-chalk text-charcoal shadow-clay-lift ring-2 ring-charcoal',
        emoji
          ? 'p-1'
          : 'px-3 py-1.5 font-display text-sm font-extrabold whitespace-nowrap sm:text-base',
      )}
    >
      {emoji ? (
        <>
          <ReactionArt id={id} className="size-9 sm:size-10" />
          <span className="sr-only">{t(`reaction.${id}`)}</span>
        </>
      ) : (
        t(`reaction.${id}`)
      )}
    </motion.span>
  );
}

/**
 * The round reaction button and its tray. With `board`, the tray opens over the board's lower half:
 * seat panels sit above, below or beside the board depending on the screen, so this is the one
 * place that never covers your own panel or the turn timer. Without it, the tray hangs under the button.
 */
export function ReactionButton({
  onReact,
  cooling,
  board,
  className,
}: {
  onReact: (id: ReactionId) => void;
  cooling: boolean;
  /** An element holding the `GameBoard`; the tray is placed against its board. */
  board?: RefObject<HTMLElement | null>;
  className?: string;
}) {
  const t = useT('room');
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>('emoji');
  const [place, setPlace] = useState<CSSProperties | undefined>();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const trayRef = useRef<HTMLDivElement>(null);

  const close = () => {
    setOpen(false);
    buttonRef.current?.focus();
  };

  // Place the tray against the board each time it opens and when the window resizes.
  useEffect(() => {
    if (!open || !board) return;
    const measure = () => {
      const wrap = board.current;
      const svg = wrap?.querySelector('svg[role="group"]');
      if (!wrap || !svg) return setPlace(undefined);
      const w = wrap.getBoundingClientRect();
      const b = svg.getBoundingClientRect();
      const rem = parseFloat(getComputedStyle(document.documentElement).fontSize);
      setPlace({
        left: b.left - w.left + b.width / 2,
        bottom: w.bottom - b.bottom + 0.5 * rem,
        width: Math.min(22 * rem, b.width - rem),
        translate: '-50% 0',
      });
    };
    measure();
    addEventListener('resize', measure);
    return () => removeEventListener('resize', measure);
  }, [open, board]);

  // Focus the first reaction when the tray opens; Escape closes it.
  useEffect(() => {
    if (!open) return;
    trayRef.current?.querySelector<HTMLButtonElement>('[data-reaction]')?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close();
    addEventListener('keydown', onKey);
    return () => removeEventListener('keydown', onKey);
  }, [open, tab]);

  const pick = (id: ReactionId) => {
    onReact(id);
    close();
  };

  return (
    // Without a board the tray hangs under the button, so the button's box anchors it.
    <div className={cn(!board && 'relative')}>
      <button
        ref={buttonRef}
        type="button"
        aria-label={t('react.open')}
        aria-expanded={open}
        aria-haspopup="dialog"
        disabled={cooling}
        onClick={() => setOpen((o) => !o)}
        className={cn(
          'relative grid size-12 shrink-0 place-items-center rounded-full bg-chalk text-charcoal shadow-clay ring-2 ring-charcoal transition-[translate,box-shadow,opacity] duration-[350ms] ease-clay hover:-translate-y-0.5 hover:shadow-clay-lift active:translate-y-px disabled:opacity-60 3xl:size-14',
          open && 'bg-charcoal text-chalk',
          className,
        )}
      >
        <SmilePlus aria-hidden="true" className="size-6" />
        {cooling && (
          <svg
            viewBox="-1 -1 2 2"
            aria-hidden="true"
            className="pointer-events-none absolute -inset-1 overflow-visible"
          >
            <motion.circle
              r={0.96}
              fill="none"
              stroke="var(--color-clay-deep)"
              strokeWidth={0.08}
              strokeLinecap="round"
              transform="rotate(-90)"
              initial={{ pathLength: 1 }}
              animate={{ pathLength: 0 }}
              transition={{ duration: 1.2, ease: 'linear' }}
            />
          </svg>
        )}
      </button>
      {open && (
        <>
          {/* Tapping anywhere else closes the tray (and keeps that tap off the board). */}
          <button
            type="button"
            tabIndex={-1}
            aria-label={t('react.close')}
            onClick={close}
            className="fixed inset-0 z-30 cursor-default"
          />
          <motion.div
            ref={trayRef}
            role="dialog"
            aria-label={t('react.open')}
            initial={{ opacity: 0, y: 12, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            style={board ? place : undefined}
            className={cn(
              'z-40 rounded-clay bg-card p-2.5 text-card-foreground shadow-clay-lift ring-2 ring-charcoal',
              board
                ? 'absolute'
                : 'absolute top-full right-0 mt-2 w-[min(22rem,calc(100vw-2.5rem))]',
              board && !place && 'invisible',
            )}
          >
            <div className="flex items-center gap-1">
              <div role="tablist" className="flex flex-1 gap-1 rounded-full bg-chalk/70 p-1">
                {(Object.keys(TABS) as Tab[]).map((k) => (
                  <button
                    key={k}
                    type="button"
                    role="tab"
                    aria-selected={tab === k}
                    aria-pressed={tab === k}
                    onClick={() => setTab(k)}
                    className={SEGMENT}
                  >
                    {t(`react.${k}`)}
                  </button>
                ))}
              </div>
              <button
                type="button"
                aria-label={t('react.close')}
                onClick={close}
                className="grid size-11 shrink-0 place-items-center rounded-full transition-colors duration-200 hover:bg-clay/25"
              >
                <X aria-hidden="true" className="size-5" />
              </button>
            </div>
            <ul
              role="tabpanel"
              className={cn('mt-2 grid gap-1.5', tab === 'emoji' ? 'grid-cols-4' : 'grid-cols-2')}
            >
              {TABS[tab].map((id) => (
                <li key={id}>
                  <button
                    type="button"
                    data-reaction
                    aria-label={tab === 'emoji' ? t(`reaction.${id}`) : undefined}
                    title={tab === 'emoji' ? t(`reaction.${id}`) : undefined}
                    onClick={() => pick(id)}
                    className={cn(
                      'flex w-full items-center rounded-clay bg-charcoal/[0.06] transition-[translate,background-color,box-shadow] duration-[350ms,200ms,350ms] ease-clay hover:-translate-y-0.5 hover:bg-clay/25 hover:shadow-clay active:translate-y-px',
                      tab === 'emoji'
                        ? 'aspect-square justify-center'
                        : 'h-12 justify-center px-2 text-center font-display text-sm font-extrabold leading-tight sm:text-base',
                    )}
                  >
                    {tab === 'emoji' ? (
                      <ReactionArt id={id} className="size-9 sm:size-10" />
                    ) : (
                      t(`reaction.${id}`)
                    )}
                  </button>
                </li>
              ))}
            </ul>
          </motion.div>
        </>
      )}
    </div>
  );
}
