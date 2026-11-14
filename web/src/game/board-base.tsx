import { useId, useMemo } from 'react';
import { BOARDS, type Board, type BoardId, type Look, type Seat } from '@guti-arena/engine';
import { Guti } from '@/share/guti';
import { positions, viewOf, type Pos, type View } from './board-view.ts';
import { CourtGround } from './court.tsx';
import { COURT, shadeOf } from './look.ts';

/** What every board drawing starts with: the court, the wobbly lines and the points. */
export function BoardBase({
  board,
  pos,
  view,
  uid,
  look,
}: {
  board: Board;
  pos: Pos;
  view: View;
  uid: string;
  look: Look;
}) {
  const line = COURT[look.court].line;
  return (
    <>
      <defs>
        <filter id={`wobble-${uid}`} x="-5%" y="-5%" width="110%" height="110%">
          <feTurbulence type="fractalNoise" baseFrequency="1.6" numOctaves="2" seed="7" />
          <feDisplacementMap in="SourceGraphic" scale="0.09" />
        </filter>
      </defs>
      <CourtGround
        court={look.court}
        uid={uid}
        x={view.x}
        y={view.y}
        width={view.w}
        height={view.h}
      />
      <g filter={`url(#wobble-${uid})`} stroke={line} strokeWidth={0.1} strokeLinecap="round">
        {board.lines.map((l) => {
          const a = pos[l[0]!]!;
          const b = pos[l[l.length - 1]!]!;
          return <line key={l.join()} x1={a.x} y1={a.y} x2={b.x} y2={b.y} />;
        })}
      </g>
      {board.points.map((p) => (
        <circle key={p.id} cx={pos[p.id]!.x} cy={pos[p.id]!.y} r={0.08} fill={line} />
      ))}
    </>
  );
}

/** A still picture of a board at its start position in a look, for pickers and previews. */
export function BoardPreview({
  board: id,
  look,
  label,
  className,
}: {
  board: BoardId;
  look: Look;
  label?: string;
  className?: string;
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
      <BoardBase board={board} pos={pos} view={view} uid={uid} look={look} />
      {board.seats.flatMap((seat: Seat) =>
        board.start[seat].map((p) => (
          <g key={p} transform={`translate(${pos[p]!.x} ${pos[p]!.y})`}>
            <Guti set={look.pieces} seat={seat} board={id} />
          </g>
        )),
      )}
    </svg>
  );
}
