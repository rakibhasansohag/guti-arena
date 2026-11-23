import {
  memo,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent,
  type CSSProperties,
  type ReactNode,
} from 'react';
import { AnimatePresence, MotionConfig, motion, type Transition } from 'motion/react';
import { Bot } from 'lucide-react';
import {
  BAGH_GOATS_TO_WIN,
  GOAT,
  HAND,
  boardOf,
  countPieces,
  goatsTaken,
  jumpedPoint,
  mustCapture,
  legalMoves,
  type BoardId,
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
import { BoardBase } from './board-base.tsx';
import { positions, turnsFor, viewOf, type Pos } from './board-view.ts';
import { COURT, shadeOf, useLook } from './look.ts';
import { useSeatName } from './use-seat-name.ts';
import { play } from './sound.ts';
import { buzz, motionPolicy, useSettings } from './settings.ts';
import { track, type Tracked } from './track.ts';
import { useNum } from './use-num.ts';

const SEATS: Seat[] = [0, 1, 2, 3];
/** The server's turn length (worker/src/room-logic.ts); the timer ring drains from here. */
const TURN_MS = 30_000;

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
  /** A speech bubble over a seat's panel (reactions); it opens away from the board's edge it sits on. */
  bubbles?: Partial<Record<Seat, ReactNode>>;
  className?: string;
}

/** Renders any game state and animates the change from the previous one. */
export function GameBoard({
  state,
  mySeat,
  onMove,
  onEndChain,
  seats,
  turnDeadline,
  bottomSeat = mySeat,
  bubbles,
  className,
}: GameBoardProps) {
  const t = useT('game');
  const num = useNum();
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const svgRef = useRef<SVGSVGElement>(null);
  const board = boardOf(state);
  const pos = useMemo(() => positions(board, bottomSeat), [board, bottomSeat]);
  const view = useMemo(() => viewOf(pos), [pos]);
  const turns = turnsFor(board, bottomSeat);
  const look = useLook();
  const court = COURT[look.court];
  const motion_ = motionPolicy(useSettings());

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

  // Sounds follow what the board shows. A jump from where the last jump landed is a chain.
  const prevTurn = useRef<Seat | null>(null);
  const lastLanding = useRef<PointId | null>(null);
  const fresh = isFresh(state);
  useEffect(() => {
    const m = tracked.lastMove;
    if (tracked.captured.length > 0 && m) {
      play(lastLanding.current === m.from ? 'chain' : 'capture');
      buzz(40);
      lastLanding.current = m.to;
      return;
    }
    lastLanding.current = null;
    if (m) play('move');
    else if (fresh) play('start');
    // `fresh` only changes along with the pieces, so this still runs once per board state.
  }, [tracked, fresh]);
  useEffect(() => {
    if (state.winner !== null) {
      const w = state.winner;
      const won = w !== 'draw' && seats[w]?.kind === 'human' && (mySeat === null || w === mySeat);
      play(w === 'draw' ? 'draw' : won ? 'win' : 'lose');
    } else if (myTurn && prevTurn.current !== state.turn) {
      play('turn');
      buzz([20, 60, 20]);
    }
    prevTurn.current = state.turn;
  }, [state.turn, state.winner, myTurn, mySeat, seats]);
  // A wooden tick for each of your last five seconds on the clock.
  useEffect(() => {
    if (!myTurn || turnDeadline === null) return;
    const ids: ReturnType<typeof setTimeout>[] = [];
    for (let s = 5; s >= 1; s--) {
      const wait = turnDeadline - s * 1000 - Date.now();
      if (wait >= 0) ids.push(setTimeout(() => play('tick'), wait));
    }
    return () => ids.forEach(clearTimeout);
  }, [myTurn, turnDeadline]);

  const placing = legal[0]?.from === HAND;
  const forced = mustCapture(state.board);
  /** My pieces that have a move, ringed while nothing is selected so nobody hunts for them. */
  const movable = useMemo(
    () => [...new Set(legal.map((m) => m.from))].filter((id) => id !== HAND),
    [legal],
  );

  // Why the last tap did nothing; shown in place of the status for a moment.
  const [hint, setHint] = useState<{ state: GameState; key: string } | null>(null);
  useEffect(() => {
    if (!hint) return;
    const id = setTimeout(() => setHint(null), 2500);
    return () => clearTimeout(id);
  }, [hint]);
  const explain = (id: PointId) => {
    if (state.winner !== null) return;
    const piece = state.pieces[id];
    const key = !myTurn
      ? mySeat === null
        ? 'hint.watching'
        : 'hint.wait'
      : state.chainFrom || placing
        ? null // the status line already says what to do
        : piece === mySeat
          ? 'hint.blocked'
          : piece !== undefined
            ? 'hint.notYours'
            : selected
              ? null // tapping away from a selected piece just lets go of it
              : 'hint.pickFirst';
    if (key) {
      setHint({ state, key });
      play('invalid');
    }
  };

  function tap(id: PointId) {
    // A goat from the hand (Bagh-chal) goes straight onto the tapped point.
    const move =
      targets.find((m) => m.to === id) ?? (placing ? legal.find((m) => m.to === id) : undefined);
    if (move) {
      onMove(move);
      setSel(null);
      setHint(null);
    } else if (!state.chainFrom && legal.some((m) => m.from === id)) {
      if (id !== selected) play('select');
      setSel({ state, point: id });
      setHint(null);
    } else {
      explain(id);
      if (!state.chainFrom) setSel(null);
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
  const seatName = useSeatName(state.board);
  const name = (s: Seat) => seats[s]?.name || seatName(s);
  const bagh = state.board === 'bagh';
  /** The line under a seat's name: its pieces, or in Bagh-chal the goats placed and taken. */
  const note = (s: Seat) =>
    bagh && s === GOAT
      ? t('bagh.goatNote', { hand: num(state.inHand ?? 0), taken: num(goatsTaken(state)) })
      : bagh
        ? t('bagh.tigerNote', { taken: num(goatsTaken(state)), goal: num(BAGH_GOATS_TO_WIN) })
        : counts[s] === 0
          ? t('badge.out')
          : t(counts[s] === 1 ? 'badge.onePiece' : 'badge.pieces', { n: num(counts[s]) });
  const status =
    state.winner !== null
      ? ''
      : myTurn
        ? t(
            state.chainFrom
              ? forced
                ? 'status.mustChain'
                : 'status.chain'
              : placing
                ? 'status.place'
                : selected
                  ? 'status.pickTarget'
                  : forced && legal.some((m) => jumpedPoint(m, board) !== null)
                    ? 'status.mustCapture'
                    : 'status.yourTurn',
          )
        : seats[state.turn]?.kind === 'ai'
          ? t('status.thinking', { name: name(state.turn) })
          : t('status.turn', { name: name(state.turn) });

  // Seat panels sit outside the board: a row above and a row below. On the four-sided boards the
  // top row holds screen sides left and top; on the hexagon you sit below, the other two above.
  const meanX = (seat: Seat) =>
    board.start[seat].reduce((sum, p) => sum + pos[p]!.x, 0) / board.start[seat].length;
  const rows: Seat[][] =
    board.fixed && bottomSeat !== null
      ? [
          state.seats.filter((s) => s !== bottomSeat).sort((a, b) => meanX(a) - meanX(b)),
          [bottomSeat],
        ]
      : [
          [3, 0],
          [2, 1],
        ].map((sides) =>
          sides.flatMap((side) => state.seats.filter((s) => (s + turns) % 4 === side)),
        );
  // Portrait: a row of panels above the board and one below. Landscape (desktop, a turned
  // phone): the board fills the height, with the top row's panels on its left, the rest on its right.
  const panels = (row: 0 | 1) => (
    <div
      className={cn(
        'flex gap-2 px-2 sm:landscape:w-full sm:landscape:max-w-72 sm:landscape:flex-col-reverse sm:landscape:justify-center sm:landscape:px-0 3xl:landscape:max-w-80',
        row === 0 ? 'sm:landscape:justify-self-end' : 'sm:landscape:justify-self-start',
      )}
    >
      {rows[row]!.map((s) => (
        <SeatPanel
          key={s}
          seat={s}
          info={seats[s]}
          name={name(s)}
          board={state.board}
          note={note(s)}
          out={!bagh && counts[s] === 0}
          active={state.winner === null && state.turn === s}
          deadline={state.turn === s ? turnDeadline : null}
          bubble={bubbles?.[s]}
          bubbleBelow={row === 0}
        />
      ))}
    </div>
  );

  return (
    <MotionConfig reducedMotion={motion_}>
      <div
        className={cn(
          'mx-auto grid w-full max-w-(--board-max) gap-2 sm:landscape:max-w-none sm:landscape:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] sm:landscape:items-center sm:landscape:gap-x-4 sm:landscape:px-4',
          className,
        )}
        style={
          {
            // Portrait: as wide as the screen allows while the panels and status fit its height.
            '--board-max': `max(17rem, calc((100dvh - 18rem) * ${view.w / view.h}))`,
            '--ar': view.w / view.h,
          } as CSSProperties
        }
      >
        {panels(0)}
        <div
          // Landscape: as tall as the screen under the header and status, leaving the panels room.
          className="relative w-full sm:landscape:h-[min(calc(100dvh-9rem),calc((100vw-30rem)/var(--ar)))] sm:landscape:w-auto"
          style={{ aspectRatio: `${view.w} / ${view.h}` }}
        >
          <svg
            ref={svgRef}
            viewBox={`${view.x} ${view.y} ${view.w} ${view.h}`}
            className="block size-full touch-manipulation select-none"
            style={shadeOf(look)}
            onClick={onClick}
            role="group"
            aria-label={t('board.label')}
          >
            <defs>
              {SEATS.map((s) => (
                <g key={s} id={`pebble-${s}-${uid}`}>
                  <Guti set={look.pieces} seat={s} board={state.board} />
                </g>
              ))}
            </defs>
            <BoardBase board={board} pos={pos} view={view} uid={uid} look={look} />

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

            {!selected &&
              movable.map((id) => (
                <motion.circle
                  key={`can-${id}`}
                  cx={pos[id]!.x}
                  cy={pos[id]!.y}
                  r={0.47}
                  fill="none"
                  stroke="var(--color-chalk)"
                  strokeWidth={0.07}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: [0.45, 1, 0.45] }}
                  // Waits for the last move to land, then breathes slowly.
                  transition={{ delay: 0.4, duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
                  className="pointer-events-none"
                />
              ))}

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
        </div>
        {panels(1)}

        <div className="flex min-h-12 flex-wrap items-center justify-center gap-3 px-4 sm:landscape:col-span-3 3xl:min-h-14">
          <p aria-live="polite" className="font-display text-lg font-extrabold 3xl:text-xl">
            {hint?.state === state ? (
              <motion.span
                key={hint.key}
                className="inline-block"
                initial={{ x: 0 }}
                animate={{ x: [0, -6, 6, -3, 0] }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
              >
                {t(hint.key, { name: name(state.turn) })}
              </motion.span>
            ) : (
              status
            )}
          </p>
          {myTurn && state.chainFrom && !forced && (
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

/** Whether no piece has moved yet: every start point is filled and nothing else is. */
function isFresh(state: GameState): boolean {
  const board = boardOf(state);
  if (state.quietRounds !== 0 || state.chainFrom) return false;
  const start = state.seats.flatMap((s) => board.start[s].map((p) => [p, s] as const));
  return (
    start.length === Object.keys(state.pieces).length &&
    start.every(([p, s]) => state.pieces[p] === s)
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

function SeatPanel({
  seat,
  info,
  name,
  note,
  out,
  active,
  deadline,
  board,
  bubble,
  bubbleBelow,
}: {
  bubble: ReactNode;
  /** The top row's bubble opens downward, the bottom row's upward. */
  bubbleBelow: boolean;
  board: BoardId | undefined;
  seat: Seat;
  info: SeatInfo | undefined;
  name: string;
  note: string;
  out: boolean;
  active: boolean;
  deadline: number | null;
}) {
  const t = useT('game');
  const pieces = useLook().pieces;
  return (
    <div
      className={cn(
        'relative flex min-w-0 flex-1 items-center gap-2 rounded-clay sm:landscape:flex-none bg-chalk/90 px-2.5 py-1.5 text-charcoal shadow-clay ring-clay transition-[translate,box-shadow,opacity] duration-[350ms] ease-clay sm:gap-3 sm:px-4 sm:py-2',
        active && '-translate-y-0.5 shadow-clay-lift ring-[3px]',
        out && 'opacity-50',
      )}
    >
      <svg
        viewBox="-0.6 -0.6 1.2 1.2"
        aria-hidden="true"
        className="size-10 shrink-0 overflow-visible sm:size-12"
      >
        <Guti set={pieces} seat={seat} board={board} />
        {active && deadline !== null && <TimerRing key={deadline} deadline={deadline} />}
      </svg>
      <span className="min-w-0 flex-1 leading-tight">
        <span className="flex items-center gap-1.5">
          <span className="truncate font-display text-sm font-extrabold sm:text-base 3xl:text-lg">
            {name}
          </span>
          {info?.kind === 'ai' && info.level && (
            <span className="flex shrink-0 items-center gap-1 rounded-full bg-charcoal px-1.5 py-0.5 font-display text-xs font-extrabold text-chalk">
              <Bot aria-hidden="true" className="size-3.5" />
              {t(`level.${info.level}`)}
            </span>
          )}
          {info?.kind === 'human' && !info.connected && (
            <span className="shrink-0 rounded-full bg-clay-deep px-1.5 font-display text-xs font-extrabold text-chalk sm:text-sm">
              {t('badge.away')}
            </span>
          )}
        </span>
        <span className="block truncate text-xs sm:text-sm">{note}</span>
      </span>
      <AnimatePresence>
        {bubble && (
          <motion.div
            key="bubble"
            className={cn(
              'pointer-events-none absolute left-1/2 z-10 -translate-x-1/2',
              bubbleBelow ? 'top-full mt-1.5 origin-top' : 'bottom-full mb-1.5 origin-bottom',
            )}
            initial={{ opacity: 0, scale: 0.6, y: bubbleBelow ? -6 : 6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8 }}
          >
            {bubble}
          </motion.div>
        )}
      </AnimatePresence>
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
