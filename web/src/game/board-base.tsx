import { memo, useId, useMemo } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { BOARDS, type Board, type BoardId, type Look, type Seat } from '@guti-arena/engine';
import { Guti } from '@/share/guti';
import { positions, viewOf, type Pos, type View } from './board-view.ts';
import { CourtGround } from './court.tsx';
import { COURT, shadeOf } from './look.ts';

/**
 * What every board drawing starts with: the court, the wobbly lines and the points.
 * `plain` skips the wobble filter (it cannot be seen on a thumbnail and costs a raster pass) and
 * the court crossfade.
 */
export function BoardBase({
  board,
  pos,
  view,
  uid,
  look,
  plain = false,
}: {
  board: Board;
  pos: Pos;
  view: View;
  uid: string;
  look: Look;
  plain?: boolean;
}) {
  const line = COURT[look.court].line;
  const ground = (
    <CourtGround
      court={look.court}
      uid={uid}
      x={view.x}
      y={view.y}
      width={view.w}
      height={view.h}
    />
  );
  return (
    <>
      {!plain && (
        <defs>
          <filter id={`wobble-${uid}`} x="-5%" y="-5%" width="110%" height="110%">
            <feTurbulence type="fractalNoise" baseFrequency="1.6" numOctaves="2" seed="7" />
            <feDisplacementMap in="SourceGraphic" scale="0.09" />
          </filter>
        </defs>
      )}
      {plain ? (
        ground
      ) : (
        // A new court fades in over the old one, so a look change reads as one smooth swap.
        <AnimatePresence initial={false}>
          <motion.g
            key={look.court}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
          >
            {ground}
          </motion.g>
        </AnimatePresence>
      )}
      <g
        filter={plain ? undefined : `url(#wobble-${uid})`}
        stroke={line}
        strokeWidth={0.1}
        strokeLinecap="round"
        style={{ transition: 'stroke 250ms ease-out' }}
      >
        {board.lines.map((l) => {
          const a = pos[l[0]!]!;
          const b = pos[l[l.length - 1]!]!;
          return <line key={l.join()} x1={a.x} y1={a.y} x2={b.x} y2={b.y} />;
        })}
      </g>
      <g fill={line} style={{ transition: 'fill 250ms ease-out' }}>
        {board.points.map((p) => (
          <circle key={p.id} cx={pos[p.id]!.x} cy={pos[p.id]!.y} r={0.08} />
        ))}
      </g>
    </>
  );
}

/**
 * A still picture of a board at its start position in a look, for pickers and previews.
 * Each seat's piece is drawn once and placed with `<use>`, so a new piece set redraws four
 * pieces, not every one on the board.
 */
export const BoardPreview = memo(function BoardPreview({
  board: id,
  look,
  label,
  className,
  plain,
}: {
  board: BoardId;
  look: Look;
  label?: string;
  className?: string;
  plain?: boolean;
}) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const board = BOARDS[id];
  const pos = useMemo(() => positions(board, null), [board]);
  const view = viewOf(pos);
  return (
    <svg
      viewBox={`${view.x} ${view.y} ${view.w} ${view.h}`}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className={className}
      style={shadeOf(look)}
    >
      <defs>
        {board.seats.map((seat: Seat) => (
          <g key={seat} id={`piece-${seat}-${uid}`}>
            <Guti set={look.pieces} seat={seat} board={id} />
          </g>
        ))}
      </defs>
      <BoardBase board={board} pos={pos} view={view} uid={uid} look={look} plain={plain} />
      {board.seats.flatMap((seat: Seat) =>
        board.start[seat].map((p) => (
          <use key={p} href={`#piece-${seat}-${uid}`} x={pos[p]!.x} y={pos[p]!.y} />
        )),
      )}
    </svg>
  );
});
