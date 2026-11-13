import { useId } from 'react';
import { LINES, POINTS } from '@guti-arena/engine';
import type { PointId, Seat } from '@guti-arena/engine';
import { cn } from '@/lib/utils';
import { SEAT_FILL } from './seat-colours.ts';

const AT = Object.fromEntries(POINTS.map((p) => [p.id, p]));
const FULL_VIEW: [number, number, number, number] = [-2.6, -2.6, 11.2, 11.2];
const SEATS: Seat[] = [0, 1, 2, 3];
const LIGHT: Seat[] = [1, 2]; // yellow and white take a dark mark

/** The colour-blind mark for a seat: dot, ring, cross, diamond. */
export function SeatMark({
  seat,
  x,
  y,
  colour,
}: {
  seat: Seat;
  x: number;
  y: number;
  colour: string;
}) {
  if (seat === 0) return <circle cx={x} cy={y} r={0.09} fill={colour} />;
  if (seat === 1)
    return <circle cx={x} cy={y} r={0.13} fill="none" stroke={colour} strokeWidth={0.06} />;
  if (seat === 2) {
    const d = 0.11;
    return (
      <path
        d={`M${x - d} ${y - d}L${x + d} ${y + d}M${x + d} ${y - d}L${x - d} ${y + d}`}
        stroke={colour}
        strokeWidth={0.06}
        strokeLinecap="round"
      />
    );
  }
  const d = 0.14;
  return <path d={`M${x} ${y - d}L${x + d} ${y}L${x} ${y + d}L${x - d} ${y}Z`} fill={colour} />;
}

/**
 * One pebble at the origin: contact shadow, body, highlight and seat mark.
 * The shadow is a plain soft ellipse; a blur filter per piece costs too much paint time.
 */
function Pebble({ seat }: { seat: Seat }) {
  return (
    <>
      <ellipse cy={0.2} rx={0.32} ry={0.13} fill="var(--color-charcoal)" opacity={0.25} />
      <circle
        r={0.34}
        fill={SEAT_FILL[seat]}
        stroke="var(--color-charcoal)"
        strokeWidth={seat === 2 ? 0.06 : 0.035}
      />
      <ellipse cx={-0.1} cy={-0.13} rx={0.15} ry={0.09} fill="#fff" opacity={0.45} />
      <SeatMark
        seat={seat}
        x={0}
        y={0.03}
        colour={LIGHT.includes(seat) ? 'var(--color-charcoal)' : 'var(--color-chalk)'}
      />
    </>
  );
}

interface Props {
  pieces: Partial<Record<PointId, Seat>>;
  /** Board-unit crop as [x, y, width, height]; the whole board by default. */
  view?: [number, number, number, number];
  /** Moves to draw as arrows; a jump arcs over the piece it takes. */
  arrows?: { from: PointId; to: PointId }[];
  /** Pieces drawn faded, such as the one a capture removes. */
  ghosts?: Partial<Record<PointId, Seat>>;
  /**
   * A piece that hops to a point and back on a loop. It sits on its own layer and moves with
   * a CSS transform, so the board never repaints. Give the board a box with the view's aspect.
   */
  hop?: { from: PointId; to: PointId };
  /**
   * A pre-drawn image of this same board (src/share/board*.svg from `make-images`, imported with `?inline`). It replaces
   * the inline drawing: no DOM nodes and no hydration cost for the hero. Full view only.
   */
  src?: string;
  label: string;
  className?: string;
}

/** A static drawing of the board from the engine's points and lines. */
export function BoardArt({
  pieces,
  view = FULL_VIEW,
  arrows = [],
  ghosts = {},
  hop,
  src,
  label,
  className,
}: Props) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, ''); // React ids carry punctuation that breaks url(#id)
  const wobble = `wobble-${uid}`;
  const head = `head-${uid}`;
  const pebble = (seat: Seat) => `#pebble-${seat}-${uid}`;
  const viewBox = view.join(' ');

  const board = src ? (
    <img
      src={src}
      alt={label}
      width={1000}
      height={1000}
      className={hop ? 'block size-full' : className}
    />
  ) : (
    <svg
      viewBox={viewBox}
      role="img"
      aria-label={label}
      className={hop ? 'block size-full' : className}
    >
      <defs>
        <filter id={wobble} x="-5%" y="-5%" width="110%" height="110%">
          <feTurbulence type="fractalNoise" baseFrequency="1.6" numOctaves="2" seed="7" />
          <feDisplacementMap in="SourceGraphic" scale="0.09" />
        </filter>
        <marker
          id={head}
          viewBox="0 0 10 10"
          refX="8"
          refY="5"
          markerWidth="4"
          markerHeight="4"
          orient="auto-start-reverse"
        >
          <path d="M0 0L10 5L0 10z" fill="var(--color-clay)" />
        </marker>
        {SEATS.map((seat) => (
          <g key={seat} id={pebble(seat).slice(1)}>
            <Pebble seat={seat} />
          </g>
        ))}
      </defs>

      <g
        filter={`url(#${wobble})`}
        stroke="var(--color-charcoal)"
        strokeWidth={0.11}
        strokeLinecap="round"
        fill="none"
      >
        {LINES.map((line) => {
          const a = AT[line[0]!]!;
          const b = AT[line[line.length - 1]!]!;
          return <line key={line.join()} x1={a.x} y1={a.y} x2={b.x} y2={b.y} />;
        })}
      </g>
      {POINTS.map((p) => (
        <circle key={p.id} cx={p.x} cy={p.y} r={0.08} fill="var(--color-charcoal)" />
      ))}

      {(Object.entries(ghosts) as [PointId, Seat][]).map(([id, seat]) => (
        <use key={`ghost-${id}`} href={pebble(seat)} x={AT[id]!.x} y={AT[id]!.y} opacity={0.35} />
      ))}
      {(Object.entries(pieces) as [PointId, Seat][])
        .filter(([id]) => id !== hop?.from)
        .map(([id, seat]) => (
          <use key={id} href={pebble(seat)} x={AT[id]!.x} y={AT[id]!.y} />
        ))}

      {arrows.map(({ from, to }) => {
        const a = AT[from]!;
        const b = AT[to]!;
        const dist = Math.hypot(b.x - a.x, b.y - a.y);
        // Jumps arc to one side; steps are drawn straight.
        const lift = dist > 1.6 ? 0.7 : 0;
        const cx = (a.x + b.x) / 2 + ((a.y - b.y) / dist) * lift;
        const cy = (a.y + b.y) / 2 + ((b.x - a.x) / dist) * lift;
        const trim = 0.42 / dist;
        const sx = a.x + (b.x - a.x) * trim;
        const sy = a.y + (b.y - a.y) * trim;
        const ex = b.x - (b.x - a.x) * trim;
        const ey = b.y - (b.y - a.y) * trim;
        return (
          <path
            key={`${from}-${to}`}
            d={`M${sx} ${sy}Q${cx} ${cy} ${ex} ${ey}`}
            fill="none"
            stroke="var(--color-clay)"
            strokeWidth={0.1}
            strokeLinecap="round"
            markerEnd={`url(#${head})`}
          />
        );
      })}
    </svg>
  );

  const seat = hop && pieces[hop.from];
  if (!hop || seat === undefined) return board;

  const a = AT[hop.from]!;
  const b = AT[hop.to]!;
  // Percent of the layer's own box, which matches the view when the box has the view's aspect.
  const dx = ((b.x - a.x) / view[2]) * 100;
  const dy = ((b.y - a.y) / view[3]) * 100;
  return (
    <div className={cn('relative', className)}>
      {board}
      <style>{`
        @keyframes hop-${uid} { 0%, 35% { transform: translate(0, 0); } 50%, 85% { transform: translate(${dx}%, ${dy}%); } 100% { transform: translate(0, 0); } }
      `}</style>
      <svg
        viewBox={viewBox}
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 size-full will-change-transform"
        style={{ animation: `hop-${uid} 3.2s cubic-bezier(.22,1,.36,1) infinite` }}
      >
        <g transform={`translate(${a.x} ${a.y})`}>
          <Pebble seat={seat} />
        </g>
      </svg>
    </div>
  );
}
