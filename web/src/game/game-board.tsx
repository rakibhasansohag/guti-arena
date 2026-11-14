import {
  memo,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type MouseEvent,
} from 'react';
import { AnimatePresence, MotionConfig, motion, type Transition } from 'motion/react';
import { Bot } from 'lucide-react';
import {
  boardOf,
  countPieces,
  legalMoves,
  type Board,
  type GameState,
  type Move,
  type PointId,
  type Seat,
  type SeatInfo,
} from '@guti-arena/engine';
import { Button } from '@/components/ui/button';
import { useT } from '@/i18n';
import { cn } from '@/lib/utils';
import { Guti } from '@/share/guti';
import { SEAT_COLOUR_NAME } from '@/share/seat-colours';
import { CourtGround } from './court.tsx';
import { COURT, useLook } from './look.ts';
import { play } from './sound.ts';
import { track, type Tracked } from './track.ts';
import { useNum } from './use-num.ts';

const SEATS: Seat[] = [0, 1, 2, 3];
/** The server's turn length (worker/src/room-logic.ts); the timer ring drains from here. */
const TURN_MS = 30_000;
type Pos = Record<PointId, { x: number; y: number }>;

export interface GameBoardProps {
  state: GameState;
  /** The seat this player moves; null to watch only. */
  mySeat: Seat | null;
  onMove: (m: Move) => void;
  onEndChain: () => void;
  /** Always four entries, as in `RoomState.seats`. */
  seats: SeatInfo[];
  turnDeadline: number | null;
  /** Seat drawn at the bottom; defaults to `mySeat`. Null keeps north at the top. */
  bottomSeat?: Seat | null;
  className?: string;
}

/** Board positions with `bottom` turned to the south edge. */
function positions(board: Board, bottom: Seat | null): Pos {
  const turns = bottom === null ? 0 : (2 - bottom + 4) % 4; // quarter turns clockwise
  const pos: Pos = {};
  for (const p of board.points) {
    let [x, y] = [p.x, p.y];
    for (let k = 0; k < turns; k++) [x, y] = [board.size - 1 - y, x];
    pos[p.id] = { x, y };
  }
  return pos;
}

/**
 * Half the view box per board, from the grid centre. The two-player boards are tall and narrow,
 * so their badges stand upright in the free columns beside the board.
 */
const HALF_VIEW = { four: 5.6, classic: 4.6, quick: 4.6 } as const;
const BADGE_SIZE = { wide: 'h-[16%] w-[31%]', tall: 'h-[30%] w-[22%]' } as const;

/** Badge corner per screen side (0 top, 1 right, 2 bottom, 3 left), beside that side's triangle. */
const CORNER = [
  'top-[1%] right-[1%]',
  'bottom-[1%] right-[1%]',
  'bottom-[1%] left-[1%]',
  'top-[1%] left-[1%]',
] as const;

/** Renders any game state and animates the change from the previous one. */
export function GameBoard({
  state,
  mySeat,
  onMove,
  onEndChain,
  seats,
  turnDeadline,
  bottomSeat = mySeat,
  className,
}: GameBoardProps) {
  const t = useT('game');
  const num = useNum();
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const svgRef = useRef<SVGSVGElement>(null);
  const board = boardOf(state);
  const pos = useMemo(() => positions(board, bottomSeat), [board, bottomSeat]);
  const mid = (board.size - 1) / 2;
  const half = HALF_VIEW[board.id];
  const badge = board.seats.length > 2 ? 'wide' : 'tall';
  const turns = bottomSeat === null ? 0 : (2 - bottomSeat + 4) % 4;
  const look = useLook();
  const court = COURT[look.court];

  // Piece identities across states, so pebbles slide rather than blink.
  // Updated while rendering when the pieces change (React's "adjust state on prop change" pattern).
  let [tracked, setTracked] = useState(() => track(null, state.pieces, board));
  if (tracked.pieces !== state.pieces) {
    tracked = track(tracked, state.pieces, board);
    setTracked(tracked);
  }

  const myTurn = mySeat !== null && state.turn === mySeat && state.winner === null;
  const legal = useMemo(() => (myTurn ? legalMoves(state) : []), [myTurn, state]);

  // Selection belongs to one state; a new state clears it without an effect.
  const [sel, setSel] = useState<{ state: GameState; point: PointId } | null>(null);
  const selected = state.chainFrom ?? (sel?.state === state ? sel.point : null);
  const targets = selected ? legal.filter((m) => m.from === selected) : [];

  const [focus, setFocus] = useState<PointId | null>(null);
  const [keyboard, setKeyboard] = useState(false);
  const rovingPoint = focus ?? selected ?? board.centre;

  // Sounds follow what the board shows.
  const prevTurn = useRef<Seat | null>(null);
  useEffect(() => {
    if (tracked.captured.length > 0) play('capture');
    else if (tracked.lastMove) play('move');
  }, [tracked]);
  useEffect(() => {
    if (state.winner !== null) {
      const w = state.winner;
      const won = w !== 'draw' && seats[w]?.kind === 'human' && (mySeat === null || w === mySeat);
      play(won ? 'win' : 'lose');
    } else if (myTurn && prevTurn.current !== state.turn) {
      play('turn');
    }
    prevTurn.current = state.turn;
  }, [state.turn, state.winner, myTurn, mySeat, seats]);

  function tap(id: PointId) {
    const move = targets.find((m) => m.to === id);
    if (move) {
      onMove(move);
      setSel(null);
    } else if (!state.chainFrom && legal.some((m) => m.from === id)) {
      setSel({ state, point: id });
    } else if (!state.chainFrom) {
      setSel(null);
    }
  }

  /** Pointer taps snap to the nearest point, so each point's whole cell is its target. */
  function onClick(e: MouseEvent<SVGSVGElement>) {
    const own = (e.target as Element).getAttribute('data-point');
    if (own) return tap(own);
    const svg = svgRef.current;
    const ctm = svg?.getScreenCTM();
    if (!svg || !ctm) return;
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(ctm.inverse());
    let best: PointId | null = null;
    let bestD = 0.62; // farther than this from every point is a miss
    for (const id in pos) {
      const d = Math.hypot(pos[id]!.x - p.x, pos[id]!.y - p.y);
      if (d < bestD) [best, bestD] = [id, d];
    }
    if (best) tap(best);
  }

  function onKeyDown(e: KeyboardEvent, id: PointId) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      return tap(id);
    }
    const dir = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] }[
      e.key
    ];
    if (!dir) return;
    e.preventDefault();
    const from = pos[id]!;
    let best: PointId | null = null;
    let bestScore = Infinity;
    for (const other in pos) {
      const dx = pos[other]!.x - from.x;
      const dy = pos[other]!.y - from.y;
      const ahead = dx * dir[0]! + dy * dir[1]!;
      if (ahead <= 0.01) continue;
      const score = ahead + 2 * Math.abs(dx * dir[1]! - dy * dir[0]!);
      if (score < bestScore) [best, bestScore] = [other, score];
    }
    if (best) {
      setFocus(best);
      svgRef.current?.querySelector<SVGElement>(`[data-point="${best}"]`)?.focus();
    }
  }

  function label(id: PointId): string {
    const [kind, a, b, c] = id.split('-');
    const place =
      kind === 'g'
        ? t('point.grid', { row: num(Number(a) + 1), col: num(Number(b) + 1) })
        : t('point.triangle', { side: t(`side.${a}`), row: t(`row.${b}`), n: num(Number(c) + 1) });
    const seat = state.pieces[id];
    const what = seat === undefined ? t('point.empty') : t(`piece.${SEAT_COLOUR_NAME[seat]}`);
    const extra = targets.some((m) => m.to === id)
      ? t('point.target')
      : id === selected
        ? t('point.selected')
        : '';
    return [place, what, extra].filter(Boolean).join(', ');
  }

  const counts = countPieces(state);
  const name = (s: Seat) => seats[s]?.name || t(`colour.${SEAT_COLOUR_NAME[s]}`);
  const status =
    state.winner !== null
      ? ''
      : myTurn
        ? t(state.chainFrom ? 'status.chain' : 'status.yourTurn')
        : seats[state.turn]?.kind === 'ai'
          ? t('status.thinking', { name: name(state.turn) })
          : t('status.turn', { name: name(state.turn) });

  return (
    <MotionConfig reducedMotion="user">
      <div className={cn('flex flex-col items-center gap-3', className)}>
        <div className="relative aspect-square w-full">
          <svg
            ref={svgRef}
            viewBox={`${mid - half} ${mid - half} ${2 * half} ${2 * half}`}
            className="block size-full touch-manipulation select-none"
            style={
              { '--piece-shadow': court.dark ? 'var(--color-chalk)' : undefined } as CSSProperties
            }
            onClick={onClick}
            role="group"
            aria-label={t('board.label')}
          >
            <defs>
              <filter id={`wobble-${uid}`} x="-5%" y="-5%" width="110%" height="110%">
                <feTurbulence type="fractalNoise" baseFrequency="1.6" numOctaves="2" seed="7" />
                <feDisplacementMap in="SourceGraphic" scale="0.09" />
              </filter>
              {SEATS.map((s) => (
                <g key={s} id={`pebble-${s}-${uid}`}>
                  <Guti set={look.pieces} seat={s} />
                </g>
              ))}
            </defs>

            <CourtGround
              court={look.court}
              uid={uid}
              x={mid - half}
              y={mid - half}
              width={2 * half}
              height={2 * half}
            />

            <g
              filter={`url(#wobble-${uid})`}
              stroke={court.line}
              strokeWidth={0.1}
              strokeLinecap="round"
            >
              {board.lines.map((line) => {
                const a = pos[line[0]!]!;
                const b = pos[line[line.length - 1]!]!;
                return <line key={line.join()} x1={a.x} y1={a.y} x2={b.x} y2={b.y} />;
              })}
            </g>
            {board.points.map((p) => (
              <circle key={p.id} cx={pos[p.id]!.x} cy={pos[p.id]!.y} r={0.08} fill={court.line} />
            ))}

            {tracked.lastMove && (
              <g fill="none" stroke="var(--color-clay)" strokeWidth={0.07} opacity={0.85}>
                <circle
                  cx={pos[tracked.lastMove.from]!.x}
                  cy={pos[tracked.lastMove.from]!.y}
                  r={0.3}
                  strokeDasharray="0.12 0.1"
                />
                <circle
                  cx={pos[tracked.lastMove.to]!.x}
                  cy={pos[tracked.lastMove.to]!.y}
                  r={0.47}
                />
              </g>
            )}

            <Pieces tracked={tracked} pos={pos} uid={uid} />

            {selected && (
              <circle
                cx={pos[selected]!.x}
                cy={pos[selected]!.y}
                r={0.46}
                fill="none"
                stroke="var(--color-chalk)"
                strokeWidth={0.09}
                className="pointer-events-none"
              />
            )}
            <AnimatePresence>
              {targets.map((m) => (
                <motion.circle
                  key={`${selected}-${m.to}`}
                  cx={pos[m.to]!.x}
                  cy={pos[m.to]!.y}
                  r={0.17}
                  fill="var(--color-chalk)"
                  stroke="var(--color-charcoal)"
                  strokeWidth={0.035}
                  initial={{ opacity: 0, scale: 0.4 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2, ease: 'easeOut' }}
                  className="pointer-events-none"
                />
              ))}
            </AnimatePresence>
            {keyboard && focus && (
              <circle
                cx={pos[focus]!.x}
                cy={pos[focus]!.y}
                r={0.52}
                fill="none"
                stroke={court.dark ? 'var(--color-chalk)' : 'var(--color-clay-deep)'}
                strokeWidth={0.07}
                strokeDasharray="0.16 0.08"
                className="pointer-events-none"
              />
            )}

            {/* One tab stop; arrow keys move between points, Enter selects or moves. */}
            {board.points.map((p) => (
              <circle
                key={`hit-${p.id}`}
                data-point={p.id}
                cx={pos[p.id]!.x}
                cy={pos[p.id]!.y}
                r={0.3}
                fill="transparent"
                pointerEvents="none"
                role="button"
                tabIndex={p.id === rovingPoint ? 0 : -1}
                aria-label={label(p.id)}
                onKeyDown={(e) => onKeyDown(e, p.id)}
                onFocus={() => {
                  setFocus(p.id);
                  setKeyboard(true);
                }}
                onBlur={() => setKeyboard(false)}
                className="outline-none"
              />
            ))}
          </svg>

          {state.seats.map((s) => (
            <SeatBadge
              key={s}
              seat={s}
              info={seats[s]}
              name={name(s)}
              count={counts[s]}
              active={state.winner === null && state.turn === s}
              deadline={state.turn === s ? turnDeadline : null}
              corner={CORNER[(s + turns) % 4]!}
              layout={badge}
            />
          ))}
        </div>

        <div className="flex min-h-12 flex-wrap items-center justify-center gap-3 px-4 3xl:min-h-14">
          <p aria-live="polite" className="font-display text-lg font-extrabold 3xl:text-xl">
            {status}
          </p>
          {myTurn && state.chainFrom && (
            <Button
              onClick={onEndChain}
              className="h-11 rounded-full px-5 font-display text-base font-extrabold shadow-clay"
            >
              {t('action.endTurn')}
            </Button>
          )}
        </div>
      </div>
    </MotionConfig>
  );
}

/** The pebbles. Memoised on the tracked state, so selection changes never replay a move. */
const Pieces = memo(function Pieces({
  tracked,
  pos,
  uid,
}: {
  tracked: Tracked;
  pos: Pos;
  uid: string;
}) {
  return (
    <g className="pointer-events-none">
      <AnimatePresence>
        {Object.entries(tracked.keys).map(([id, key]) => {
          const seat = tracked.pieces[id]!;
          const to = pos[id]!;
          const move = tracked.moved[key];
          const from = move ? pos[move.from]! : to;
          // A jump arcs up over the piece it takes; a step slides, then settles.
          const animate = !move
            ? { x: to.x, y: to.y, scale: 1 }
            : move.jump
              ? {
                  x: [from.x, to.x],
                  y: [from.y, Math.min(from.y, to.y) - 0.7, to.y],
                  scale: [1, 1.22, 1],
                }
              : { x: [from.x, to.x], y: [from.y, to.y], scale: [1, 1, 0.92, 1] };
          const transition: Transition = move?.jump
            ? {
                x: { duration: 0.45, ease: 'easeInOut' },
                y: { duration: 0.45, times: [0, 0.5, 1], ease: ['easeOut', 'easeIn'] },
                scale: { duration: 0.45 },
              }
            : {
                x: { duration: 0.35, ease: 'easeOut' },
                y: { duration: 0.35, ease: 'easeOut' },
                scale: { duration: 0.47, times: [0, 0.74, 0.87, 1] },
              };
          return (
            <motion.g
              key={key}
              initial={false}
              animate={animate}
              transition={transition}
              exit={{ opacity: 0, scale: 0.4, transition: { delay: 0.3, duration: 0.25 } }}
            >
              <use href={`#pebble-${seat}-${uid}`} />
            </motion.g>
          );
        })}
      </AnimatePresence>
    </g>
  );
});

function SeatBadge({
  seat,
  info,
  name,
  count,
  active,
  deadline,
  corner,
  layout,
}: {
  seat: Seat;
  info: SeatInfo | undefined;
  name: string;
  count: number;
  active: boolean;
  deadline: number | null;
  corner: string;
  layout: keyof typeof BADGE_SIZE;
}) {
  const t = useT('game');
  const num = useNum();
  const pieces = useLook().pieces;
  const out = count === 0;
  return (
    <div
      className={cn(
        'absolute flex items-center gap-2 rounded-clay bg-chalk/90 px-2 shadow-clay ring-clay transition-[translate,box-shadow,opacity] duration-[350ms] ease-clay sm:gap-3 sm:px-3',
        BADGE_SIZE[layout],
        layout === 'tall' && 'flex-col justify-center text-center sm:gap-2',
        corner,
        active && '-translate-y-0.5 shadow-clay-lift ring-[3px]',
        out && 'opacity-50',
      )}
    >
      <span
        className={cn('relative aspect-square shrink-0', layout === 'tall' ? 'h-[36%]' : 'h-[62%]')}
      >
        <svg viewBox="-0.6 -0.6 1.2 1.2" aria-hidden="true" className="size-full overflow-visible">
          <Guti set={pieces} seat={seat} />
          {active && deadline !== null && <TimerRing key={deadline} deadline={deadline} />}
        </svg>
      </span>
      <span className={cn('min-w-0 leading-tight', layout === 'tall' && 'w-full')}>
        <span
          className={cn(
            'flex items-center gap-1.5',
            layout === 'tall' && 'flex-wrap justify-center gap-1',
          )}
        >
          <span className="truncate font-display text-sm font-extrabold sm:text-base 3xl:text-lg">
            {name}
          </span>
          {info?.kind === 'ai' && info.level && (
            <span className="flex shrink-0 items-center gap-1 rounded-full bg-charcoal px-1.5 py-0.5 font-display text-xs font-extrabold text-chalk sm:py-0 sm:text-sm">
              <Bot aria-hidden="true" className="size-3.5 sm:hidden" />
              {/* Phones show only the robot icon; the level stays readable to screen readers. */}
              <span className="sr-only sm:not-sr-only">{t(`level.${info.level}`)}</span>
            </span>
          )}
          {info?.kind === 'human' && !info.connected && (
            <span className="shrink-0 rounded-full bg-clay-deep px-1.5 font-display text-xs font-extrabold text-chalk sm:text-sm">
              {t('badge.away')}
            </span>
          )}
        </span>
        <span className="block truncate text-xs sm:text-sm">
          {out
            ? t('badge.out')
            : t(count === 1 ? 'badge.onePiece' : 'badge.pieces', { n: num(count) })}
        </span>
      </span>
    </div>
  );
}

/** Drains linearly to the deadline and pulses in the last five seconds. */
function TimerRing({ deadline }: { deadline: number }) {
  const [left] = useState(() => Math.max(0, deadline - Date.now()));
  return (
    <motion.circle
      r={0.5}
      fill="none"
      stroke="var(--color-clay-deep)"
      strokeWidth={0.09}
      strokeLinecap="round"
      transform="rotate(-90)"
      initial={{ pathLength: left / TURN_MS }}
      animate={{ pathLength: 0, scale: [1, 1.12, 1] }}
      transition={{
        pathLength: { duration: left / 1000, ease: 'linear' },
        scale: { delay: Math.max(0, left - 5000) / 1000, duration: 0.5, repeat: 9 },
      }}
    />
  );
}
