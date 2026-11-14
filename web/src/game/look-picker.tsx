import { useId } from 'react';
import { COURTS, PIECE_SETS, type CourtId, type Look, type Seat } from '@guti-arena/engine';
import { useT } from '@/i18n';
import { Guti } from '@/share/guti';
import { CourtGround } from './court.tsx';
import { COURT } from './look.ts';

const SEATS: Seat[] = [0, 1, 2, 3];
/** A picture tile of a picker (use with `aria-pressed`): lifts on hover, ringed when chosen. */
export const TILE =
  'flex flex-col items-center gap-1 rounded-2xl bg-chalk/70 p-1.5 font-display text-xs font-extrabold leading-tight text-charcoal ring-charcoal transition-[translate,box-shadow,background-color] duration-[350ms,350ms,200ms] ease-clay hover:-translate-y-1 hover:bg-clay/20 hover:shadow-clay active:translate-y-0 aria-pressed:bg-chalk aria-pressed:ring-[3px] sm:text-sm';

function CourtSwatch({ court }: { court: CourtId }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  return (
    // The page scene behind, the court in front: a theme changes both.
    <span className="block w-full rounded-xl p-1.5" style={{ background: COURT[court].scene }}>
      <svg viewBox="0 0 2 1.2" aria-hidden="true" className="block w-full">
        <CourtGround court={court} uid={uid} x={0} y={0} width={2} height={1.2} />
        <path
          d="M.4 .6H1.6M1 .25V.95"
          stroke={COURT[court].line}
          strokeWidth={0.06}
          strokeLinecap="round"
        />
      </svg>
    </span>
  );
}

/**
 * Pick the court and the pieces. `onChange` null shows the look read-only (room guests: the
 * host picks for everyone). The look is chosen before a game and stays for the whole game.
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
  if (!onChange)
    return (
      <div className={className}>
        <h2 className="font-display text-lg font-extrabold">{t('look.title')}</h2>
        <p className="mt-1 text-sm sm:text-base">
          {t('look.preview', {
            court: t(`courts.${value.court}`),
            pieces: t(`pieces.${value.pieces}`),
          })}{' '}
          {t('look.hostPicks')}
        </p>
      </div>
    );
  return (
    <div className={className}>
      <h2 className="font-display text-lg font-extrabold">{t('look.court')}</h2>
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
      <h2 className="mt-6 font-display text-lg font-extrabold">{t('look.pieces')}</h2>
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
                <g key={s} transform={`translate(${s % 2} ${s > 1 ? 1 : 0})`}>
                  <Guti set={set} seat={s} />
                </g>
              ))}
            </svg>
            {t(`pieces.${set}`)}
          </button>
        ))}
      </div>
    </div>
  );
}
