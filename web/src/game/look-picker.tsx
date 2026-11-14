import { useEffect, useId, useRef, useState, type CSSProperties } from 'react';
import { AnimatePresence, MotionConfig, motion } from 'motion/react';
import { Palette } from 'lucide-react';
import { COURTS, PIECE_SETS, type CourtId, type Look, type Seat } from '@guti-arena/engine';
import { Button } from '@/components/ui/button';
import { useT } from '@/i18n';
import { cn } from '@/lib/utils';
import { Guti } from '@/share/guti';
import { CourtGround } from './court.tsx';
import { COURT } from './look.ts';

const SEATS: Seat[] = [0, 1, 2, 3];
const TILE =
  'flex flex-col items-center gap-1.5 rounded-2xl bg-chalk/70 p-1.5 font-display text-xs font-extrabold leading-tight ring-charcoal transition-[translate,box-shadow,background-color] duration-[350ms,350ms,200ms] ease-clay hover:-translate-y-0.5 hover:bg-chalk hover:shadow-clay active:translate-y-px aria-pressed:bg-chalk aria-pressed:ring-[3px] sm:text-sm';

const uidOf = (id: string) => id.replace(/[^a-zA-Z0-9]/g, '');
const shade = (court: CourtId) =>
  ({ '--piece-shadow': COURT[court].dark ? 'var(--color-chalk)' : undefined }) as CSSProperties;

/** A strip of court with one piece per seat on a line: the live preview of a look. */
function Preview({ look, label }: { look: Look; label: string }) {
  const uid = uidOf(useId());
  return (
    <svg
      viewBox="0 0 5 1.5"
      role="img"
      aria-label={label}
      className="block w-full"
      style={shade(look.court)}
    >
      <CourtGround court={look.court} uid={uid} x={0} y={0} width={5} height={1.5} />
      <line
        x1={0.6}
        y1={0.78}
        x2={4.4}
        y2={0.78}
        stroke={COURT[look.court].line}
        strokeWidth={0.07}
        strokeLinecap="round"
      />
      {SEATS.map((s) => (
        <g key={s} transform={`translate(${1 + s} 0.75)`}>
          <Guti set={look.pieces} seat={s} />
        </g>
      ))}
    </svg>
  );
}

function CourtSwatch({ court }: { court: CourtId }) {
  const uid = uidOf(useId());
  return (
    <svg viewBox="0 0 2 1.2" aria-hidden="true" className="block w-full rounded-xl">
      <CourtGround court={court} uid={uid} x={-0.05} y={-0.05} width={2.1} height={1.3} />
      <path
        d="M.3 .6H1.7M1 .15V1.05"
        stroke={COURT[court].line}
        strokeWidth={0.06}
        strokeLinecap="round"
      />
    </svg>
  );
}

/**
 * Pick the court and the pieces, with a live preview. `onChange` null shows the look read-only
 * (room guests: the host picks for everyone).
 */
export function LookPicker({
  value,
  onChange,
  className,
}: {
  value: Look;
  onChange: ((look: Look) => void) | null;
  className?: string;
}) {
  const t = useT('game');
  const preview = t('look.preview', {
    court: t(`courts.${value.court}`),
    pieces: t(`pieces.${value.pieces}`),
  });
  return (
    <div className={className}>
      <h2 className="font-display text-lg font-extrabold">{t('look.title')}</h2>
      <div className="mt-2 overflow-hidden rounded-clay shadow-clay">
        <Preview look={value} label={preview} />
      </div>
      {!onChange ? (
        <p className="mt-2 text-sm sm:text-base">
          {preview} {t('look.hostPicks')}
        </p>
      ) : (
        <>
          <h3 className="mt-4 font-display text-base font-extrabold">{t('look.court')}</h3>
          <div
            role="group"
            aria-label={t('look.court')}
            className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-6"
          >
            {COURTS.map((court) => (
              <button
                key={court}
                type="button"
                aria-pressed={value.court === court}
                onClick={() => onChange({ ...value, court })}
                className={TILE}
              >
                <CourtSwatch court={court} />
                {t(`courts.${court}`)}
              </button>
            ))}
          </div>
          <h3 className="mt-4 font-display text-base font-extrabold">{t('look.pieces')}</h3>
          <div
            role="group"
            aria-label={t('look.pieces')}
            className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-6"
          >
            {PIECE_SETS.map((set) => (
              <button
                key={set}
                type="button"
                aria-pressed={value.pieces === set}
                onClick={() => onChange({ ...value, pieces: set })}
                className={TILE}
              >
                <svg viewBox="-0.42 -0.42 1.84 1.84" aria-hidden="true" className="block w-full">
                  {SEATS.map((s) => (
                    <g key={s} transform={`translate(${(s % 2) * 1} ${s > 1 ? 1 : 0})`}>
                      <Guti set={set} seat={s} />
                    </g>
                  ))}
                </svg>
                {t(`pieces.${set}`)}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/** A header button that opens the look picker in a small panel, for changing the look mid-game. */
export function LookButton({ value, onChange }: { value: Look; onChange: (look: Look) => void }) {
  const t = useT('game');
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const panel = useId();

  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', away);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('pointerdown', away);
      document.removeEventListener('keydown', esc);
    };
  }, [open]);

  return (
    <div ref={root} className="relative">
      <Button
        variant="ghost"
        size="icon-lg"
        className={cn('rounded-full', open && 'bg-chalk')}
        aria-expanded={open}
        aria-controls={panel}
        aria-label={t('look.open')}
        title={t('look.open')}
        onClick={() => setOpen(!open)}
      >
        <Palette className="size-5" />
      </Button>
      <MotionConfig reducedMotion="user">
        <AnimatePresence>
          {open && (
            <motion.div
              id={panel}
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="fixed inset-x-4 top-16 z-30 max-h-[calc(100dvh-5rem)] overflow-y-auto rounded-clay bg-card p-4 shadow-clay-lift sm:absolute sm:inset-x-auto sm:top-full sm:right-0 sm:mt-2 sm:w-[36rem] sm:p-5 3xl:w-[42rem]"
            >
              <LookPicker value={value} onChange={onChange} />
            </motion.div>
          )}
        </AnimatePresence>
      </MotionConfig>
    </div>
  );
}
