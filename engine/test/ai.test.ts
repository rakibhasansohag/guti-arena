import { describe, expect, it } from 'vitest';
import { chooseMove } from '../src/ai.ts';
import { applyMove, createGame, endChain, legalMoves } from '../src/rules.ts';
import type { AiLevel, GameState, PointId, Seat } from '../src/types.ts';
import { playGame } from './play.ts';

function pos(
  pieces: Record<PointId, Seat>,
  seats: Seat[],
  turn: Seat,
  extra: Partial<GameState> = {},
): GameState {
  return { seats, pieces, turn, chainFrom: null, quietRounds: 0, winner: null, ...extra };
}

const LEVELS: AiLevel[] = ['easy', 'medium', 'hard'];

describe('chooseMove', () => {
  it('always returns a legal move from the opening', () => {
    for (const level of LEVELS) {
      for (const seats of [
        [0, 2],
        [0, 1, 3],
        [0, 1, 2, 3],
      ] as Seat[][]) {
        const s = createGame(seats);
        const c = chooseMove(s, level);
        expect(c).not.toBe('end-chain');
        expect(legalMoves(s)).toContainEqual(c);
      }
    }
  });

  it('takes an available capture at every level', () => {
    const s = pos({ 'g-3-1': 0, 'g-3-2': 1, 'g-6-6': 1, 'g-6-0': 1 }, [0, 1], 0);
    for (const level of LEVELS) {
      for (let i = 0; i < 10; i++)
        expect(chooseMove(s, level)).toEqual({ from: 'g-3-1', to: 'g-3-3' });
    }
  });

  it('medium and hard avoid stepping next to a piece that can jump them', () => {
    // East at g-3-5 jumps west along row 3. Moving north to g-3-4 would be captured.
    const s = pos({ 'g-2-4': 0, 'g-3-5': 1, 'g-6-6': 1 }, [0, 1], 0);
    for (const level of ['medium', 'hard'] as const) {
      for (let i = 0; i < 10; i++)
        expect(chooseMove(s, level)).not.toEqual({ from: 'g-2-4', to: 'g-3-4' });
    }
  });

  it('hard finishes a two-jump win instead of stopping', () => {
    const s = pos({ 'g-1-1': 0, 'g-1-2': 1, 'g-1-4': 1 }, [0, 1], 0);
    const mid = applyMove(s, chooseMove(s, 'hard') as { from: string; to: string });
    expect(chooseMove(mid, 'hard')).toEqual({ from: 'g-1-3', to: 'g-1-5' });
  });

  it('returns end-chain only during a chain', () => {
    const s = pos({ 'g-1-1': 0, 'g-1-2': 1, 'g-1-4': 1, 'g-6-6': 1 }, [0, 1], 0);
    const mid = applyMove(s, { from: 'g-1-1', to: 'g-1-3' });
    for (const level of LEVELS) {
      const c = chooseMove(mid, level);
      const next = c === 'end-chain' ? endChain(mid) : applyMove(mid, c);
      expect(next.turn).toBe(1);
    }
  });

  it('stays legal on Bagh-chal and Lau kata kati under any full-rules search budget', () => {
    for (const board of ['bagh', 'lau'] as const) {
      let s = createGame([0, 2], board);
      for (let ply = 0; ply < 40 && s.winner === null; ply++) {
        const legal = legalMoves(s);
        // 1 node: not even one ply fits, so it falls back to a legal move; 300: the server's budget.
        for (const plainNodeBudget of [1, 300]) {
          for (const level of ['medium', 'hard'] as const) {
            const c = chooseMove(s, level, { plainNodeBudget });
            expect(c !== 'end-chain' && legal.some((m) => m.from === c.from && m.to === c.to)).toBe(
              true,
            );
          }
        }
        const c = chooseMove(s, 'easy');
        s = c === 'end-chain' ? endChain(s) : applyMove(s, c);
      }
    }
  });

  it('plays a full four-seat hard game at the default budget', () => {
    const end = playGame([0, 1, 2, 3], { 0: 'hard', 1: 'medium', 2: 'easy', 3: 'medium' });
    expect(end.winner).not.toBeNull();
  }, 120_000);
});

// Opt-in strength check: BENCH=1 pnpm --filter @guti-arena/engine test
// The engine has no Node or DOM types, so reach these through globalThis.
const g = globalThis as unknown as {
  process?: { env: Record<string, string | undefined> };
  console: { log(msg: string): void };
};
const env = g.process?.env;
describe.runIf(env?.BENCH)('strength', () => {
  it('hard beats easy in at least 80 of 100 two-seat games', () => {
    let wins = 0;
    for (let i = 0; i < 100; i++) {
      const hardSeat: Seat = i % 2 === 0 ? 0 : 2; // alternate who moves first
      const easySeat: Seat = hardSeat === 0 ? 2 : 0;
      const end = playGame([0, 2], { [hardSeat]: 'hard', [easySeat]: 'easy' });
      if (end.winner === hardSeat) wins++;
    }
    g.console.log(`hard beat easy in ${wins} of 100 games`);
    expect(wins).toBeGreaterThanOrEqual(80);
  }, 1_800_000);
});
