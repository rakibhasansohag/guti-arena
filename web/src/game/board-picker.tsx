import { BOARD_IDS, type BoardId } from '@guti-arena/engine';
import { useT } from '@/i18n';
import { cn } from '@/lib/utils';
import { SEGMENT } from './game-header.tsx';

/** Pick the board. `onChange` null shows the choice read-only (room guests). */
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
  return (
    <div className={className}>
      <h2 className="font-display text-lg font-extrabold">{t('setup.board')}</h2>
      <div
        role="group"
        aria-label={t('setup.board')}
        className="mt-2 flex gap-1 rounded-full bg-chalk/70 p-1"
      >
        {BOARD_IDS.map((id) => (
          <button
            key={id}
            type="button"
            aria-pressed={value === id}
            disabled={!onChange}
            onClick={() => onChange?.(id)}
            className={cn(SEGMENT, 'disabled:pointer-events-none')}
          >
            {t(`boards.${id}`)}
          </button>
        ))}
      </div>
      <p className="mt-2 text-sm sm:text-base">{t(`boards.${value}.hint`)}</p>
    </div>
  );
}
