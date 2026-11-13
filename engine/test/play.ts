import { chooseMove } from '../src/ai.ts';
import { applyMove, createGame, endChain } from '../src/rules.ts';
import type { AiLevel, GameState, Seat } from '../src/types.ts';

const SEAT_SETS: Seat[][] = [
  [0, 2],
  [0, 1, 3],
  [0, 1, 2, 3],
];

/** Plays one full AI-vs-AI game and returns the final state. Fails on a runaway game. */
export function playGame(
  seats: Seat[],
  levels: Partial<Record<Seat, AiLevel>>,
  nodeBudget?: number,
): GameState {
  let s = createGame(seats);
  for (let ply = 0; s.winner === null; ply++) {
    if (ply > 10_000) throw new Error('game did not finish');
    const choice = chooseMove(s, levels[s.turn]!, { nodeBudget });
    s = choice === 'end-chain' ? endChain(s) : applyMove(s, choice);
  }
  return s;
}

/** `count` games at one level, cycling through two, three and four seats. */
export function playMany(level: AiLevel, count: number, nodeBudget?: number): GameState[] {
  const all: Record<Seat, AiLevel> = { 0: level, 1: level, 2: level, 3: level };
  return Array.from({ length: count }, (_, i) => playGame(SEAT_SETS[i % 3]!, all, nodeBudget));
}
