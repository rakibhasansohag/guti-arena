import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { AnimatePresence, motion } from 'motion/react';
import {
  BOARDS,
  applyMove,
  countPieces,
  createGame,
  endChain,
  type AiLevel,
  type BoardId,
  type GameState,
  type Move,
  type Seat,
  type SeatInfo,
} from '@guti-arena/engine';
import { Button } from '@/components/ui/button';
import { askAi } from '@/game/ask-ai';
import { useNum } from '@/game/use-num';
import { BoardPicker, GameBoard, GameHeader, SEGMENT, SeatPip } from '@/game';
import { useT } from '@/i18n';
import { cn } from '@/lib/utils';
import { SEAT_COLOUR_NAME, Seo } from '@/share';
import { CTA, WRAP } from '@/share/site-chrome';

type Kind = 'human' | AiLevel;
type Count = 2 | 3 | 4;

const SEATS: Seat[] = [0, 1, 2, 3];
const KINDS: Kind[] = ['human', 'easy', 'medium', 'hard'];
/** Seats in play per player count; you sit south (seat 2, bottom) by default. */
const SEATS_FOR: Record<Count, Seat[]> = { 2: [0, 2], 3: [0, 1, 2], 4: [0, 1, 2, 3] };
/** Time an AI move stays on screen before the next one, so moves are readable. */
const AI_DELAY_MS = 700;

interface Setup {
  board: BoardId;
  /** Players on the four-colour board; the two-player boards always seat north and south. */
  count: Count;
  kinds: Record<Seat, Kind>;
}

const DEFAULT_SETUP: Setup = {
  board: 'four',
  count: 2,
  kinds: { 0: 'medium', 1: 'medium', 2: 'human', 3: 'medium' },
};

const seatsOf = (s: Setup): Seat[] =>
  s.board === 'four' ? SEATS_FOR[s.count] : BOARDS[s.board].seats;

function apply(s: GameState, choice: Move | 'end-chain'): GameState {
  return choice === 'end-chain' ? endChain(s) : applyMove(s, choice);
}

export default function Page() {
  const t = useT('game');
  const [setup, setSetup] = useState<Setup>(DEFAULT_SETUP);
  const [state, setState] = useState<GameState | null>(null);

  const seats = seatsOf(setup);
  const humans = seats.filter((s) => setup.kinds[s] === 'human');
  const turnKind = state ? setup.kinds[state.turn] : 'human';

  // AI turns: think in the worker, then wait out the rest of the delay.
  useEffect(() => {
    if (!state || state.winner !== null || turnKind === 'human') return;
    let live = true;
    const started = Date.now();
    void askAi(state, turnKind).then((choice) => {
      const wait = Math.max(0, AI_DELAY_MS - (Date.now() - started));
      setTimeout(() => {
        if (live) setState((s) => (s === state ? apply(s, choice) : s));
      }, wait);
    });
    return () => {
      live = false;
    };
  }, [state, turnKind]);

  const solo = humans.length === 1 ? humans[0]! : null;
  // Pass-and-play: whoever's turn it is moves; the board keeps south at the bottom.
  const mySeat =
    solo ?? (state && state.winner === null && turnKind === 'human' ? state.turn : null);

  const seatInfo: SeatInfo[] = SEATS.map((seat) => {
    const kind = setup.kinds[seat];
    const inGame = seats.includes(seat);
    return {
      seat,
      kind: !inGame ? 'empty' : kind === 'human' ? 'human' : 'ai',
      name: seat === solo ? t('you') : '',
      connected: true,
      level: kind === 'human' ? null : kind,
    };
  });

  return (
    <div className="flex min-h-dvh flex-col">
      <Seo path="/play" title={t('seo.title')} description={t('seo.description')} />
      <GameHeader />

      <main className="flex flex-1 flex-col items-center justify-center pb-4">
        {state ? (
          <div className="relative w-[min(100vw,calc(100dvh-8.5rem))] max-w-full">
            <GameBoard
              state={state}
              mySeat={mySeat}
              bottomSeat={solo}
              seats={seatInfo}
              turnDeadline={null}
              onMove={(m) => setState((s) => s && applyMove(s, m))}
              onEndChain={() => setState((s) => s && endChain(s))}
            />
            <AnimatePresence>
              {state.winner !== null && (
                <EndCard
                  state={state}
                  seatInfo={seatInfo}
                  solo={solo}
                  onRematch={() => setState(createGame(seats, setup.board))}
                  onSetup={() => setState(null)}
                />
              )}
            </AnimatePresence>
          </div>
        ) : (
          <SetupCard
            setup={setup}
            onChange={setSetup}
            onStart={() => setState(createGame(seats, setup.board))}
          />
        )}
      </main>
    </div>
  );
}

function SetupCard({
  setup,
  onChange,
  onStart,
}: {
  setup: Setup;
  onChange: (s: Setup) => void;
  onStart: () => void;
}) {
  const t = useT('game');
  const num = useNum();
  return (
    <section className={cn(WRAP, 'max-w-2xl py-6 sm:py-10 4xl:max-w-4xl')}>
      <h1 className="font-display text-3xl font-extrabold leading-tight sm:text-4xl 3xl:text-5xl">
        {t('setup.title')}
      </h1>
      <p className="mt-2 max-w-prose text-base sm:text-lg">{t('setup.lead')}</p>

      <div className="mt-6 rounded-clay bg-card p-4 shadow-clay sm:p-6 3xl:p-8">
        <BoardPicker value={setup.board} onChange={(board) => onChange({ ...setup, board })} />

        {setup.board === 'four' && (
          <>
            <h2 className="mt-6 font-display text-lg font-extrabold">{t('setup.players')}</h2>
            <div
              role="group"
              aria-label={t('setup.players')}
              className="mt-2 flex gap-1 rounded-full bg-chalk/70 p-1"
            >
              {([2, 3, 4] as const).map((n) => (
                <button
                  key={n}
                  type="button"
                  aria-pressed={setup.count === n}
                  onClick={() => onChange({ ...setup, count: n })}
                  className={SEGMENT}
                >
                  {t('setup.count', { n: num(n) })}
                </button>
              ))}
            </div>
          </>
        )}

        <h2 className="mt-6 font-display text-lg font-extrabold">{t('setup.seats')}</h2>
        <ul className="mt-2 flex flex-col gap-3">
          {seatsOf(setup).map((seat) => (
            <li key={seat} className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <span className="flex w-36 items-center gap-2 font-display font-extrabold">
                <SeatPip seat={seat} />
                {t(`colour.${SEAT_COLOUR_NAME[seat]}`)}
              </span>
              <div
                role="group"
                aria-label={t('setup.seatKind', { colour: t(`colour.${SEAT_COLOUR_NAME[seat]}`) })}
                className="flex flex-1 gap-1 rounded-full bg-chalk/70 p-1"
              >
                {KINDS.map((k) => (
                  <button
                    key={k}
                    type="button"
                    aria-pressed={setup.kinds[seat] === k}
                    onClick={() => onChange({ ...setup, kinds: { ...setup.kinds, [seat]: k } })}
                    className={SEGMENT}
                  >
                    {t(k === 'human' ? 'kind.human' : `level.${k}`)}
                  </button>
                ))}
              </div>
            </li>
          ))}
        </ul>

        <Button onClick={onStart} className={cn(CTA, 'mt-8 w-full sm:w-auto')}>
          {t('setup.start')}
        </Button>
      </div>
    </section>
  );
}

function EndCard({
  state,
  seatInfo,
  solo,
  onRematch,
  onSetup,
}: {
  state: GameState;
  seatInfo: SeatInfo[];
  solo: Seat | null;
  onRematch: () => void;
  onSetup: () => void;
}) {
  const t = useT('game');
  const num = useNum();
  const counts = countPieces(state);
  const w = state.winner;
  const name = (s: Seat) => seatInfo[s]?.name || t(`colour.${SEAT_COLOUR_NAME[s]}`);
  const title =
    w === 'draw' || w === null
      ? t('end.draw')
      : solo !== null
        ? w === solo
          ? t('end.youWin')
          : t('end.youLose', { name: name(w) })
        : t('end.wins', { name: name(w) });
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ delay: 0.8, duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className="absolute inset-0 flex items-center justify-center bg-charcoal/40 p-4"
    >
      <motion.section
        role="dialog"
        aria-modal="true"
        aria-labelledby="end-title"
        initial={{ y: 16, scale: 0.96 }}
        animate={{ y: 0, scale: 1 }}
        transition={{ delay: 0.8, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-sm rounded-clay bg-card p-6 shadow-clay-lift 3xl:max-w-md 3xl:p-8"
      >
        <h2 id="end-title" className="font-display text-3xl font-extrabold 3xl:text-4xl">
          {title}
        </h2>
        <ul className="mt-4 flex flex-col gap-2">
          {state.seats.map((s) => (
            <li key={s} className={cn('flex items-center gap-3', s === w && 'font-extrabold')}>
              <SeatPip seat={s} />
              <span className="flex-1 truncate font-display font-extrabold">{name(s)}</span>
              <span>
                {t(counts[s] === 1 ? 'badge.onePiece' : 'badge.pieces', { n: num(counts[s]) })}
              </span>
            </li>
          ))}
        </ul>
        <div className="mt-6 flex flex-col gap-2">
          <Button autoFocus onClick={onRematch} className={CTA}>
            {t('end.rematch')}
          </Button>
          <Button variant="outline" onClick={onSetup} className={cn(CTA, 'bg-chalk shadow-none')}>
            {t('end.setup')}
          </Button>
          <Button asChild variant="ghost" className={cn(CTA, 'shadow-none')}>
            <Link to="/">{t('end.home')}</Link>
          </Button>
        </div>
      </motion.section>
    </motion.div>
  );
}
