import { useEffect, useState } from 'react';
import { BOARD_IDS, type BoardId, type Look } from '@guti-arena/engine';
import { useT } from '@/i18n';
import { guidePath } from '@/share/guides';
import { BoardPreview } from './board-base.tsx';
import { TILE } from './look-picker.tsx';
import { useLook } from './look.ts';
import { play } from './sound.ts';

/**
 * A board card's picture. It takes up a new look `delay` ms after it changes, one card after
 * another: the thumbnails hold most of the page's SVG, so redrawing them in the tap's own frame
 * made court and piece taps slow on phones. Fast repeated taps redraw them once, at the end.
 */
function Thumb({ board, look, delay }: { board: BoardId; look: Look; delay: number }) {
  const [shown, setShown] = useState(look);
  useEffect(() => {
    const id = setTimeout(() => setShown(look), delay);
    return () => clearTimeout(id);
  }, [look, delay]);
  return <BoardPreview board={board} look={shown} plain className="aspect-square w-full" />;
}

/** Pick the game: one card per board. `onChange` null shows the choice read-only (room guests). */
export function BoardPicker({
  value,
  onChange,
  className,
}: {
  value: BoardId;
  onChange: ((board: BoardId) => void) | null;
  className?: string;
}) {
  const t = useT('game');
  const look = useLook();
  return (
    <div className={className}>
      <h2 className="font-display text-lg font-extrabold">{t('setup.board')}</h2>
      {onChange ? (
        <div
          role="group"
          aria-label={t('setup.board')}
          className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3"
        >
          {BOARD_IDS.map((id, i) => (
            <button
              key={id}
              type="button"
              aria-pressed={value === id}
              onClick={() => {
                play('click');
                onChange(id);
              }}
              className={TILE}
            >
              <Thumb board={id} look={look} delay={80 + i * 40} />
              <span className="text-sm sm:text-base">{t(`boards.${id}`)}</span>
              <span className="font-sans text-xs font-normal">{t(`boards.${id}.tag`)}</span>
            </button>
          ))}
        </div>
      ) : (
        <p className="mt-1 font-display font-extrabold">
          {t(`boards.${value}`)} · {t(`boards.${value}.tag`)}
        </p>
      )}
      <p className="mt-2 text-sm sm:text-base">
        {t(`boards.${value}.hint`)}{' '}
        <a
          href={guidePath(value)}
          target="_blank"
          rel="noopener"
          className="font-display font-extrabold text-clay-deep underline decoration-2 underline-offset-4 transition-colors duration-200 hover:text-charcoal"
        >
          {t('help.rules', { name: t(`boards.${value}`) })}
        </a>
      </p>
    </div>
  );
}
