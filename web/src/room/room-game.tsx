import { Link } from 'react-router';
import { AnimatePresence, motion } from 'motion/react';
import {
  countPieces,
  type ClientMessage,
  type GameState,
  type RoomState,
  type Seat,
} from '@guti-arena/engine';
import { Button } from '@/components/ui/button';
import { GameBoard, SeatPip, useNum } from '@/game';
import { useT } from '@/i18n';
import { cn } from '@/lib/utils';
import { SEAT_COLOUR_NAME, ShareCard } from '@/share';
import { CTA } from '@/share/site-chrome';

/** Live play from server state. The client never applies a move; it waits for the next `state`. */
export function RoomGame({
  room,
  game,
  you,
  send,
}: {
  room: RoomState;
  game: GameState;
  you: { playerId: string; seat: Seat | null };
  send: (m: ClientMessage) => void;
}) {
  const t = useT('room');
  const name = (s: Seat) => room.seats[s]?.name || t(`colour.${SEAT_COLOUR_NAME[s]}`);
  const turn = room.seats[game.turn];
  const away = game.winner === null && turn?.kind === 'human' && !turn.connected;
  return (
    <div className="relative w-[min(100vw,calc(100dvh-10rem))] max-w-full">
      <GameBoard
        state={game}
        mySeat={you.seat}
        seats={room.seats}
        turnDeadline={room.turnDeadline}
        onMove={(m) => send({ t: 'move', from: m.from, to: m.to })}
        onEndChain={() => send({ t: 'end-chain' })}
      />
      {away && (
        <p className="px-4 text-center text-sm sm:text-base">
          {t('game.away', { name: name(game.turn) })}
        </p>
      )}
      <AnimatePresence>
        {room.phase === 'ended' && (
          <RoomEnd room={room} game={game} you={you} send={send} name={name} />
        )}
      </AnimatePresence>
    </div>
  );
}

function RoomEnd({
  room,
  game,
  you,
  send,
  name,
}: {
  room: RoomState;
  game: GameState;
  you: { playerId: string; seat: Seat | null };
  send: (m: ClientMessage) => void;
  name: (s: Seat) => string;
}) {
  const t = useT('room');
  const num = useNum();
  const counts = countPieces(game);
  const w = game.winner;
  const isHost = room.hostId === you.playerId;
  const title =
    w === null || w === 'draw'
      ? t('end.draw')
      : w === you.seat
        ? t('end.youWin')
        : t('end.wins', { name: name(w) });
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ delay: 0.8, duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className="absolute inset-0 flex items-start justify-center overflow-y-auto bg-charcoal/40 p-3 sm:items-center sm:p-4"
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="end-title"
        className="w-full max-w-md rounded-clay bg-card p-5 shadow-clay-lift sm:p-6 3xl:max-w-lg 3xl:p-8"
      >
        <h2 id="end-title" className="font-display text-3xl font-extrabold 3xl:text-4xl">
          {title}
        </h2>
        <ul className="mt-3 flex flex-col gap-1.5">
          {game.seats.map((s) => (
            <li key={s} className={cn('flex items-center gap-3', s === w && 'font-extrabold')}>
              <SeatPip seat={s} className="size-6" />
              <span className="flex-1 truncate font-display font-extrabold">{name(s)}</span>
              <span>{num(counts[s])}</span>
            </li>
          ))}
        </ul>
        <div className="mt-4">
          <ShareCard
            result={{
              winnerName: w === null || w === 'draw' ? '' : name(w),
              seatColour: w === null || w === 'draw' ? null : w,
              pieceCounts: Object.fromEntries(game.seats.map((s) => [s, counts[s]])),
              roomCode: room.code,
            }}
          />
        </div>
        <div className="mt-5 flex flex-col gap-2">
          {isHost ? (
            <Button autoFocus onClick={() => send({ t: 'rematch' })} className={CTA}>
              {t('end.rematch')}
            </Button>
          ) : (
            <p className="text-center font-display font-extrabold">{t('end.waitHost')}</p>
          )}
          <Button asChild variant="ghost" className={cn(CTA, 'shadow-none')}>
            <Link to="/">{t('end.leave')}</Link>
          </Button>
        </div>
      </section>
    </motion.div>
  );
}
