import type { BoardId, PieceSetId, Seat } from '@guti-arena/engine';
import { Pebble, SeatMark } from './board-art.tsx';
import { SEAT_FILL } from './seat-colours.ts';

/*
 * Piece sets, each drawn at the origin about 0.35 board units across, like `Pebble`.
 * Every set keeps the seat colour as its largest area and shows the seat's colour-blind mark
 * (in the middle, or on a rim tag for the foods), so seats stay apart whatever the look. The contact shadow takes `--piece-shadow` from
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

/**
 * Sweets and fruit on a plate in the seat colour: rosogolla, kalojam, jilapi, mango.
 * The food fills the plate, so the seat mark sits on a small tag at the rim instead of on top of it.
 */
function Food({ seat }: { seat: Seat }) {
  return (
    <>
      <Shadow />
      <circle r={0.37} fill={SEAT_FILL[seat]} stroke={INK} strokeWidth={rim(seat)} />
      {seat === 0 && (
        <>
          <circle r={0.27} fill="#F6EFDC" stroke="#B89F6E" strokeWidth={0.03} />
          <path
            d="M-.2 .1A.23 .23 0 0 0 .2 .1"
            fill="none"
            stroke="#D9C79C"
            strokeWidth={0.05}
            strokeLinecap="round"
          />
          <ellipse
            cx={-0.09}
            cy={-0.12}
            rx={0.1}
            ry={0.055}
            fill="#fff"
            transform="rotate(-25 -0.09 -0.12)"
          />
        </>
      )}
      {seat === 1 && (
        <>
          <ellipse
            rx={0.3}
            ry={0.21}
            fill="#3B2117"
            stroke="#1F100A"
            strokeWidth={0.03}
            transform="rotate(-20)"
          />
          <ellipse
            cx={-0.1}
            cy={-0.09}
            rx={0.1}
            ry={0.04}
            fill="#fff"
            opacity={0.4}
            transform="rotate(-20 -0.1 -0.09)"
          />
          {[
            [0.02, -0.02],
            [0.12, 0.03],
            [-0.06, 0.07],
          ].map(([x, y]) => (
            <circle key={`${x}${y}`} cx={x} cy={y} r={0.025} fill="#F6EFDC" />
          ))}
        </>
      )}
      {seat === 2 && (
        <g fill="none" strokeLinecap="round">
          <path
            d="M.07 0A.07 .07 0 0 0-.07 0A.12 .12 0 0 0 .17 0A.17 .17 0 0 0-.17 0A.22 .22 0 0 0 .27 0"
            stroke="#B8540F"
            strokeWidth={0.11}
          />
          <path
            d="M.07 0A.07 .07 0 0 0-.07 0A.12 .12 0 0 0 .17 0A.17 .17 0 0 0-.17 0A.22 .22 0 0 0 .27 0"
            stroke="#F08A1D"
            strokeWidth={0.07}
          />
        </g>
      )}
      {seat === 3 && (
        <g transform="rotate(35)">
          <path
            d="M0-.3C.2-.3 .24 0 .16 .18C.1 .3-.1 .3-.16 .18C-.24 0-.2-.3 0-.3Z"
            fill="#F2B134"
            stroke="#B5791A"
            strokeWidth={0.03}
          />
          <path
            d="M0 .1C.1 .1 .16-.02 .14-.14"
            fill="none"
            stroke="#E2572B"
            strokeOpacity={0.6}
            strokeWidth={0.06}
            strokeLinecap="round"
          />
          <ellipse cx={-0.07} cy={-0.1} rx={0.045} ry={0.09} fill="#fff" opacity={0.4} />
          <path
            d="M0-.3Q.14-.42 .26-.3Q.12-.22 0-.3Z"
            fill="#6E9A2E"
            stroke="#3F5E17"
            strokeWidth={0.02}
          />
        </g>
      )}
      <circle
        cx={0.25}
        cy={0.25}
        r={0.13}
        fill={SEAT_FILL[seat]}
        stroke={INK}
        strokeWidth={0.035}
      />
      <g transform="translate(0.25 0.25) scale(0.7)">
        <SeatMark seat={seat} x={0} y={0} colour={onSeat(seat)} />
      </g>
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
