import { BOARD_IDS, type BoardId } from '@guti-arena/engine';
import { useT } from '@/i18n';
import { BoardPreview } from './board-base.tsx';
import { TILE } from './look-picker.tsx';
import { useLook } from './look.ts';

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
          {BOARD_IDS.map((id) => (
            <button
              key={id}
              type="button"
              aria-pressed={value === id}
              onClick={() => onChange(id)}
              className={TILE}
            >
              <BoardPreview board={id} look={look} className="aspect-square w-full" />
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
      <p className="mt-2 text-sm sm:text-base">{t(`boards.${value}.hint`)}</p>
    </div>
  );
}
