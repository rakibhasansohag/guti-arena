import type { ReactNode } from 'react';
import type { BoardId, Look } from '@guti-arena/engine';
import { useT } from '@/i18n';
import { BoardPreview } from './board-base.tsx';

/**
 * The setup screen's two parts: the choices, and a live preview of the game they make. On wide
 * screens the preview stays beside the choices; on phones it stays at the top while they scroll.
 */
export function SetupLayout({
  board,
  look,
  children,
}: {
  board: BoardId;
  look: Look;
  children: ReactNode;
}) {
  const t = useT('game');
  const label = t('look.preview', {
    court: t(`courts.${look.court}`),
    pieces: t(`pieces.${look.pieces}`),
  });
  return (
    <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,24rem)] lg:items-start lg:gap-6 3xl:grid-cols-[minmax(0,1fr)_minmax(0,30rem)]">
      <aside className="sticky top-2 z-10 rounded-clay bg-card/95 p-3 text-card-foreground shadow-clay-lift backdrop-blur-sm lg:top-6 lg:order-2 lg:p-5">
        <BoardPreview
          board={board}
          look={look}
          label={`${t(`boards.${board}`)}. ${label}`}
          className="mx-auto block h-[30dvh] max-w-full lg:h-auto lg:max-h-[60dvh] lg:w-full"
        />
        <p className="mt-2 text-center font-display text-sm font-extrabold sm:text-base">
          {t(`boards.${board}`)} · {t(`boards.${board}.tag`)}
        </p>
        <p className="hidden text-center text-sm lg:block">{label}</p>
      </aside>
      <div className="rounded-clay bg-card p-4 shadow-clay sm:p-6 lg:order-1 3xl:p-8">
        {children}
      </div>
    </div>
  );
}
