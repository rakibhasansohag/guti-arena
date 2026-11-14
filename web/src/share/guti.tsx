import type { BoardId, PieceSetId, Seat } from '@guti-arena/engine';
import { Pebble, SeatMark } from './board-art.tsx';
import { SEAT_FILL } from './seat-colours.ts';

/*
 * Piece sets, each drawn at the origin about 0.35 board units across, like `Pebble`.
 * Every set keeps the seat colour as its largest area and the seat's colour-blind mark in the
 * middle, so seats stay apart whatever the look. The contact shadow takes `--piece-shadow` from
 * the court, so dark courts get a light halo instead of a dark smudge.
 */

const INK = 'var(--color-charcoal)';
const CHALK = 'var(--color-chalk)';
/** Mark colour on the seat colour itself: yellow and white take a dark mark. */
const onSeat = (seat: Seat) => (seat === 1 || seat === 2 ? INK : CHALK);
/** White pieces get a heavier rim so they never melt into a pale court. */
const rim = (seat: Seat) => (seat === 2 ? 0.06 : 0.035);

function Shadow() {
  return (
    <ellipse
      cy={0.2}
      rx={0.32}
      ry={0.13}
      fill="var(--piece-shadow, var(--color-charcoal))"
      opacity={0.25}
    />
  );
}

/** Sweets and fruit on a plate in the seat colour: rosogolla, kalojam, jilapi, mango. */
function Food({ seat }: { seat: Seat }) {
  return (
    <>
      <Shadow />
      <circle r={0.36} fill={SEAT_FILL[seat]} stroke={INK} strokeWidth={rim(seat)} />
      <circle r={0.28} fill="none" stroke={INK} strokeOpacity={0.2} strokeWidth={0.025} />
      {seat === 0 && (
        <>
          <circle r={0.2} fill="#F6EFDC" stroke="#C9B48A" strokeWidth={0.025} />
          <ellipse cx={-0.07} cy={-0.09} rx={0.07} ry={0.04} fill="#fff" opacity={0.8} />
          <SeatMark seat={0} x={0} y={0.03} colour={INK} />
        </>
      )}
      {seat === 1 && (
        <>
          <ellipse rx={0.23} ry={0.17} fill="#3B2117" transform="rotate(-20)" />
          <ellipse cx={-0.08} cy={-0.07} rx={0.08} ry={0.035} fill="#fff" opacity={0.35} />
          <SeatMark seat={1} x={0} y={0.02} colour={CHALK} />
        </>
      )}
      {seat === 2 && (
        <>
          <path
            d="M.06 0A.06 .06 0 0 0-.06 0A.1 .1 0 0 0 .14 0A.14 .14 0 0 0-.14 0A.18 .18 0 0 0 .22 0"
            fill="none"
            stroke="#D9731A"
            strokeWidth={0.075}
            strokeLinecap="round"
          />
          <SeatMark seat={2} x={0} y={0} colour={INK} />
        </>
      )}
      {seat === 3 && (
        <>
          <ellipse rx={0.17} ry={0.24} fill="#F2B134" transform="rotate(35)" />
          <ellipse cx={0.1} cy={-0.16} rx={0.07} ry={0.05} fill="#7FA33A" transform="rotate(35)" />
          <ellipse cx={-0.06} cy={-0.06} rx={0.05} ry={0.08} fill="#fff" opacity={0.35} />
          <SeatMark seat={3} x={0} y={0.03} colour={INK} />
        </>
      )}
    </>
  );
}

/** A clay tea cup seen from above: terracotta lip, glaze in the seat colour, milk tea. */
function Bhar({ seat }: { seat: Seat }) {
  return (
    <>
      <Shadow />
      <circle r={0.36} fill="#B5653D" stroke={INK} strokeWidth={rim(seat)} />
      <circle r={0.3} fill={SEAT_FILL[seat]} />
      <circle cx={0.03} cy={0.04} r={0.26} fill="#000" opacity={0.12} />
      <circle r={0.17} fill="#9A5A2B" />
      <ellipse cx={-0.06} cy={-0.07} rx={0.07} ry={0.035} fill="#E8C9A0" opacity={0.6} />
      <SeatMark seat={seat} x={0} y={0.01} colour={CHALK} />
    </>
  );
}

/** A glass marble with a light swirl and a bright highlight. */
function Marble({ seat }: { seat: Seat }) {
  return (
    <>
      <Shadow />
      <circle r={0.33} fill={SEAT_FILL[seat]} stroke={INK} strokeWidth={rim(seat)} />
      <circle cx={0.05} cy={0.06} r={0.26} fill="#000" opacity={0.14} />
      <circle cx={-0.03} cy={-0.04} r={0.22} fill="#fff" opacity={0.16} />
      <path
        d="M-.22 .1C-.08-.2 .08 .26 .22-.08"
        fill="none"
        stroke="#fff"
        strokeOpacity={0.55}
        strokeWidth={0.05}
        strokeLinecap="round"
      />
      <circle cx={-0.13} cy={-0.15} r={0.065} fill="#fff" opacity={0.9} />
      <SeatMark seat={seat} x={0} y={0.03} colour={onSeat(seat)} />
    </>
  );
}

/** A sewing button: raised rim, four holes, the mark stitched in the middle. */
function Button({ seat }: { seat: Seat }) {
  return (
    <>
      <Shadow />
      <circle r={0.34} fill={SEAT_FILL[seat]} stroke={INK} strokeWidth={rim(seat)} />
      <circle r={0.29} fill="none" stroke="#fff" strokeOpacity={0.35} strokeWidth={0.025} />
      <circle r={0.25} fill="none" stroke="#000" strokeOpacity={0.2} strokeWidth={0.04} />
      {[
        [-0.15, -0.15],
        [0.15, -0.15],
        [-0.15, 0.15],
        [0.15, 0.15],
      ].map(([x, y]) => (
        <circle key={`${x}${y}`} cx={x} cy={y} r={0.035} fill="#000" opacity={0.45} />
      ))}
      <SeatMark seat={seat} x={0} y={0} colour={onSeat(seat)} />
    </>
  );
}

/** A scallop shell (jhinuk) with ribs fanning from the hinge. */
function Shell({ seat }: { seat: Seat }) {
  return (
    <>
      <Shadow />
      <path
        d="M-.1 .34L-.14 .22H.14L.1 .34Z"
        fill={SEAT_FILL[seat]}
        stroke={INK}
        strokeWidth={0.03}
      />
      <path
        d="M0 .26L-.33-.03C-.33-.4 .33-.4 .33-.03Z"
        fill={SEAT_FILL[seat]}
        stroke={INK}
        strokeWidth={rim(seat)}
        strokeLinejoin="round"
      />
      <g stroke="#000" strokeOpacity={0.2} strokeWidth={0.025} strokeLinecap="round">
        {[-0.24, -0.12, 0, 0.12, 0.24].map((x) => (
          <line key={x} x1={0} y1={0.2} x2={x} y2={-0.24 + Math.abs(x) * 0.5} />
        ))}
      </g>
      <ellipse cx={-0.1} cy={-0.17} rx={0.09} ry={0.04} fill="#fff" opacity={0.4} />
      <SeatMark seat={seat} x={0} y={-0.04} colour={onSeat(seat)} />
    </>
  );
}

/** Bagh-chal's tiger: an orange face with stripes, seen head on. */
function Tiger() {
  return (
    <>
      <Shadow />
      <circle cx={-0.23} cy={-0.25} r={0.11} fill="#E8891C" stroke={INK} strokeWidth={0.035} />
      <circle cx={0.23} cy={-0.25} r={0.11} fill="#E8891C" stroke={INK} strokeWidth={0.035} />
      <circle r={0.34} fill="#E8891C" stroke={INK} strokeWidth={0.04} />
      <path
        d="M0-.33V-.2M-.11-.31L-.08-.2M.11-.31L.08-.2M-.33-.02H-.21M.33-.02H.21M-.31.1L-.2.07M.31.1L.2.07"
        stroke={INK}
        strokeWidth={0.05}
        strokeLinecap="round"
      />
      <ellipse cy={0.14} rx={0.17} ry={0.13} fill="#FBEFD9" />
      <circle cx={-0.12} cy={-0.06} r={0.04} fill={INK} />
      <circle cx={0.12} cy={-0.06} r={0.04} fill={INK} />
      <path d="M-.05.08H.05L0 .14Z" fill={INK} />
      <path
        d="M0 .14V.2M-.07.22Q0 .26 .07.22"
        fill="none"
        stroke={INK}
        strokeWidth={0.025}
        strokeLinecap="round"
      />
    </>
  );
}

/** Bagh-chal's goat: a cream face with horns and floppy ears. */
function Goat() {
  return (
    <>
      <Shadow />
      <path
        d="M-.12-.26Q-.26-.42-.36-.3M.12-.26Q.26-.42.36-.3"
        fill="none"
        stroke="#6B4423"
        strokeWidth={0.07}
        strokeLinecap="round"
      />
      <ellipse
        cx={-0.33}
        cy={-0.02}
        rx={0.12}
        ry={0.07}
        fill="#E6DCC4"
        stroke={INK}
        strokeWidth={0.035}
        transform="rotate(25 -0.33 -0.02)"
      />
      <ellipse
        cx={0.33}
        cy={-0.02}
        rx={0.12}
        ry={0.07}
        fill="#E6DCC4"
        stroke={INK}
        strokeWidth={0.035}
        transform="rotate(-25 0.33 -0.02)"
      />
      <ellipse rx={0.27} ry={0.33} fill="#F7F4EC" stroke={INK} strokeWidth={0.05} />
      <ellipse cy={0.19} rx={0.13} ry={0.09} fill="#E9B9A8" />
      <circle cx={-0.11} cy={-0.05} r={0.04} fill={INK} />
      <circle cx={0.11} cy={-0.05} r={0.04} fill={INK} />
      <path d="M-.04.17H.04" stroke={INK} strokeWidth={0.03} strokeLinecap="round" />
    </>
  );
}

const SETS = { foods: Food, bhar: Bhar, marbles: Marble, buttons: Button, shells: Shell } as const;

/** One piece of a set at the origin. In Bagh-chal (`board`) the sides are tigers and goats in every set. */
export function Guti({ set, seat, board }: { set: PieceSetId; seat: Seat; board?: BoardId }) {
  if (board === 'bagh') return seat === 0 ? <Tiger /> : <Goat />;
  if (set === 'pebbles') return <Pebble seat={seat} />;
  const Piece = SETS[set];
  return <Piece seat={seat} />;
}
