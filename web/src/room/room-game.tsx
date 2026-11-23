import { useEffect, useRef } from 'react';
import { Link } from 'react-router';
import { AnimatePresence, motion } from 'motion/react';
import { Eye } from 'lucide-react';
import {
  countPieces,
  type ClientMessage,
  type GameState,
  type ReactionId,
  type RoomState,
  type Seat,
} from '@guti-arena/engine';
import { Button } from '@/components/ui/button';
import { GameBoard, SeatPip, play, useNum } from '@/game';
import { useT } from '@/i18n';
import { cn } from '@/lib/utils';
import { useReactionBubbles } from '@/game/settings';
import { useSeatName } from '@/game/use-seat-name';
import type { Reactions } from '@/net';
import { ShareCard } from '@/share';
import { CTA } from '@/share/site-chrome';
import { ReactionBubble, ReactionButton } from './reactions.tsx';

/** What a seated player can do with reactions. */
export interface ReactProps {
  onReact: (id: ReactionId) => void;
  cooling: boolean;
}

/** Live play from server state. The client never applies a move; it waits for the next `state`. */
export function RoomGame({
  room,
  game,
  you,
  send,
  reactions,
  react,
}: {
  room: RoomState;
  game: GameState;
  you: { playerId: string; seat: Seat | null };
  send: (m: ClientMessage) => void;
  reactions: Reactions;
  /** Null hides the reaction button: only seated players react. */
  react: ReactProps | null;
}) {
  const t = useT('room');
  const num = useNum();
  const seatName = useSeatName(game.board);
  const name = (s: Seat) => room.seats[s]?.name || seatName(s);
  const turn = room.seats[game.turn];
  const away = game.winner === null && turn?.kind === 'human' && !turn.connected;
  const wrap = useRef<HTMLDivElement>(null);
  const othersBubbles = useReactionBubbles();

  // Your own reactions always show; other people's follow the setting.
  const shown = (Object.entries(reactions) as [string, { id: ReactionId; at: number }][])
    .map(([s, r]) => ({ seat: Number(s) as Seat, ...r }))
    .filter((r) => othersBubbles || r.seat === you.seat);
  const latest = shown.reduce<(typeof shown)[number] | null>(
    (a, r) => (a && a.at > r.at ? a : r),
    null,
  );
  const latestAt = latest?.at;
  useEffect(() => {
    if (latestAt) play('reaction');
  }, [latestAt]);

  return (
    <div ref={wrap} className="relative w-full">
      {you.seat === null && (
        <div className="mx-auto mb-2 flex w-fit items-center gap-3 rounded-full bg-chalk/90 py-1 pr-1 pl-4 font-display font-extrabold text-charcoal shadow-clay">
          <span className="flex items-center gap-1.5">
            <Eye aria-hidden="true" className="size-4" />
            {t('watch.bar')}
          </span>
          {room.watchers > 0 && (
            <span className="text-sm opacity-80">{t('watchers', { n: num(room.watchers) })}</span>
          )}
          <Button asChild variant="ghost" className="h-11 rounded-full px-4 font-display">
            <Link to="/rooms">{t('watch.leave')}</Link>
          </Button>
        </div>
      )}
      <GameBoard
        state={game}
        mySeat={you.seat}
        seats={room.seats}
        turnDeadline={room.turnDeadline}
        onMove={(m) => send({ t: 'move', from: m.from, to: m.to })}
        onEndChain={() => send({ t: 'end-chain' })}
        bubbles={Object.fromEntries(
          shown.map((r) => [r.seat, <ReactionBubble key={r.at} id={r.id} />]),
        )}
      />
      {away && (
        // Side padding keeps the text clear of the reaction button in the corner.
        <p className="px-16 text-center text-sm sm:text-base">
          {t('game.away', { name: name(game.turn) })}
        </p>
      )}
      {react && room.phase !== 'ended' && (
        // The board fills the screen height, so the button sits in the bottom corner, beside the
        // status line and clear of the seat panels, instead of in a row the screen has no room for.
        <ReactionButton
          onReact={react.onReact}
          cooling={react.cooling}
          board={wrap}
          className="fixed right-[max(1rem,env(safe-area-inset-right))] bottom-[max(1rem,env(safe-area-inset-bottom))] z-20 sm:right-6 sm:bottom-6"
        />
      )}
      <p className="sr-only" aria-live="polite">
        {latest && t('react.said', { name: name(latest.seat), words: t(`reaction.${latest.id}`) })}
      </p>
      <AnimatePresence>
        {room.phase === 'ended' && (
          <RoomEnd
            room={room}
            game={game}
            you={you}
            send={send}
            name={name}
            react={react}
            said={Object.fromEntries(shown.map((r) => [r.seat, r]))}
          />
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
  react,
  said,
}: {
  room: RoomState;
  game: GameState;
  you: { playerId: string; seat: Seat | null };
  send: (m: ClientMessage) => void;
  name: (s: Seat) => string;
  react: ReactProps | null;
  /** Reactions on screen; the card covers the seat panels, so each shows on its player's row. */
  said: Reactions;
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
        <div className="flex items-start justify-between gap-3">
          <h2 id="end-title" className="font-display text-3xl font-extrabold 3xl:text-4xl">
            {title}
          </h2>
          {react && <ReactionButton onReact={react.onReact} cooling={react.cooling} />}
        </div>
        <ul className="mt-3 flex flex-col gap-1.5">
          {game.seats.map((s) => (
            <li
              key={s}
              className={cn('flex min-h-10 items-center gap-3', s === w && 'font-extrabold')}
            >
              <SeatPip seat={s} board={game.board} className="size-6" />
              <span className="flex-1 truncate font-display font-extrabold">{name(s)}</span>
              <AnimatePresence>
                {said[s] && (
                  <motion.span
                    key={said[s].at}
                    initial={{ opacity: 0, scale: 0.6 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    className="origin-right"
                  >
                    <ReactionBubble id={said[s].id} />
                  </motion.span>
                )}
              </AnimatePresence>
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
            <Link to={room.access === 'private' ? '/' : '/rooms'}>{t('end.leave')}</Link>
          </Button>
        </div>
      </section>
    </motion.div>
  );
}
