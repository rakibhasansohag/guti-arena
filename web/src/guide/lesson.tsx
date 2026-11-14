import { useState } from 'react';
import {
  applyMove,
  endChain,
  type BoardId,
  type GameState,
  type PointId,
  type Seat,
  type SeatInfo,
} from '@guti-arena/engine';
import { Button } from '@/components/ui/button';
import { GameBoard } from '@/game';
import type { GuideContent } from './content.ts';

/** A tiny position per game where blue (seat 0, you) can win in one turn. */
const START: Record<BoardId, { seats: Seat[]; pieces: Record<PointId, Seat>; inHand?: number }> = {
  four: { seats: [0, 1], pieces: { 'g-1-1': 0, 'g-1-2': 1, 'g-1-4': 1 } },
  three: { seats: [0, 1, 2], pieces: { 'g-3-1': 0, 'g-3-2': 1, 'g-2-4': 2 } },
  classic: { seats: [0, 2], pieces: { 'g-2-0': 0, 'g-2-1': 2, 'g-3-3': 2 } },
  quick: { seats: [0, 2], pieces: { 'g-2-0': 0, 'g-2-1': 2, 'g-3-3': 2 } },
  lau: { seats: [0, 2], pieces: { 'g-2-3': 0, 'g-3-3': 2, 'g-5-3': 2 } },
  // Four goats are already taken (20 - 15 in hand - 1 on the board), so this one wins the game.
  bagh: { seats: [0, 2], pieces: { 'g-0-0': 0, 'g-1-1': 2 }, inHand: 15 },
};

const fresh = (board: BoardId): GameState => ({
  board,
  ...START[board],
  turn: 0,
  chainFrom: null,
  quietRounds: 0,
  winner: null,
});

/** A one-move puzzle on the real board: make the capture the guide just showed. */
export default function Lesson({ board, content }: { board: BoardId; content: GuideContent }) {
  const [state, setState] = useState(() => fresh(board));
  const { ui, games } = content;
  const seats = ([0, 1, 2, 3] as Seat[]).map((seat): SeatInfo => ({
    seat,
    kind: state.seats.includes(seat) ? 'human' : 'empty',
    name: seat === 0 ? ui.you : '',
    connected: true,
    level: null,
  }));
  const won = state.winner === 0;
  // The turn passed without the win: the capture was missed.
  const missed = !won && state.turn !== 0;
  return (
    <div className="flex flex-col gap-4">
      <p className="text-lg">{games[board].lesson}</p>
      <div className="mx-auto w-full max-w-md">
        <GameBoard
          state={state}
          mySeat={won || missed ? null : 0}
          bottomSeat={board === 'three' ? null : 0}
          seats={seats}
          turnDeadline={null}
          onMove={(m) => setState((s) => applyMove(s, m))}
          onEndChain={() => setState((s) => endChain(s))}
        />
      </div>
      <div className="flex min-h-11 flex-wrap items-center justify-center gap-3" aria-live="polite">
        {(won || missed) && (
          <>
            <p className="font-display text-lg font-extrabold">
              {won ? ui.lessonDone : ui.lessonMissed}
            </p>
            <Button
              variant="outline"
              onClick={() => setState(fresh(board))}
              className="h-11 rounded-full bg-chalk px-5 font-display font-extrabold"
            >
              {ui.lessonAgain}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
