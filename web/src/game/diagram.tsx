import { useId, useMemo } from 'react';
import { BOARDS, DEFAULT_LOOK, type BoardId, type PointId, type Seat } from '@guti-arena/engine';
import { Guti } from '@/share/guti';
import { BoardBase } from './board-base.tsx';
import { positions, viewOf } from './board-view.ts';

type Pieces = Partial<Record<PointId, Seat>>;

export interface DiagramSpec {
  pieces: Pieces;
  /** Pieces drawn faded, such as the one a capture removes. */
  ghosts?: Pieces;
  /** Moves drawn as arrows; a jump arcs to one side. */
  arrows?: { from: PointId; to: PointId }[];
  /** Points circled, such as where a piece may be placed. */
  rings?: PointId[];
  /** Board-unit crop as [x, y, width, height]; the whole board by default. */
  view?: [number, number, number, number];
}

/** A still teaching picture of any board: pieces, faded pieces, arrows and circled points. */
export function Diagram({
  board: id,
  spec,
  label,
  className,
}: {
  board: BoardId;
  spec: DiagramSpec;
  label: string;
  className?: string;
}) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const board = BOARDS[id];
  const pos = useMemo(() => positions(board, null), [board]);
  const full = viewOf(pos);
  const [x, y, w, h] = spec.view ?? [full.x, full.y, full.w, full.h];
  const piece = (at: PointId, seat: Seat, key: string, opacity?: number) => (
    <g key={key} transform={`translate(${pos[at]!.x} ${pos[at]!.y})`} opacity={opacity}>
      <Guti set="pebbles" seat={seat} board={id} />
    </g>
  );
  return (
    <svg viewBox={`${x} ${y} ${w} ${h}`} role="img" aria-label={label} className={className}>
      <defs>
        <marker
          id={`head-${uid}`}
          viewBox="0 0 10 10"
          refX="8"
          refY="5"
          markerWidth="4"
          markerHeight="4"
          orient="auto-start-reverse"
        >
          <path d="M0 0L10 5L0 10z" fill="var(--color-clay-deep)" />
        </marker>
      </defs>
      <BoardBase board={board} pos={pos} view={full} uid={uid} look={DEFAULT_LOOK} />
      {(spec.rings ?? []).map((p) => (
        <circle
          key={`ring-${p}`}
          cx={pos[p]!.x}
          cy={pos[p]!.y}
          r={0.42}
          fill="none"
          stroke="var(--color-chalk)"
          strokeWidth={0.08}
          strokeDasharray=".16 .1"
        />
      ))}
      {(Object.entries(spec.ghosts ?? {}) as [PointId, Seat][]).map(([p, s]) =>
        piece(p, s, `ghost-${p}`, 0.55),
      )}
      {(Object.entries(spec.pieces) as [PointId, Seat][]).map(([p, s]) => piece(p, s, p))}
      {(spec.arrows ?? []).map(({ from, to }) => {
        const a = pos[from]!;
        const b = pos[to]!;
        const dist = Math.hypot(b.x - a.x, b.y - a.y);
        // Jumps arc to one side; steps are drawn straight.
        const lift = dist > 1.6 ? 0.7 : 0;
        const cx = (a.x + b.x) / 2 + ((a.y - b.y) / dist) * lift;
        const cy = (a.y + b.y) / 2 + ((b.x - a.x) / dist) * lift;
        // A one-step arrow starts and ends closer to the points, or little of it would show.
        const trim = (dist > 1.6 ? 0.42 : 0.3) / dist;
        return (
          <path
            key={`${from}-${to}`}
            d={`M${a.x + (b.x - a.x) * trim} ${a.y + (b.y - a.y) * trim}Q${cx} ${cy} ${b.x - (b.x - a.x) * trim} ${b.y - (b.y - a.y) * trim}`}
            fill="none"
            stroke="var(--color-clay-deep)"
            strokeWidth={0.11}
            strokeLinecap="round"
            markerEnd={`url(#head-${uid})`}
          />
        );
      })}
    </svg>
  );
}
