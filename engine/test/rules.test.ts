import { describe, expect, it } from 'vitest';
import { applyMove, countPieces, createGame, endChain, legalMoves } from '../src/rules.ts';
import type { GameState, PointId, Seat } from '../src/types.ts';

/** A hand-built position. */
function pos(
  pieces: Record<PointId, Seat>,
  seats: Seat[],
  turn: Seat,
  extra: Partial<GameState> = {},
): GameState {
  return { seats, pieces, turn, chainFrom: null, quietRounds: 0, winner: null, ...extra };
}

const targets = (s: GameState, from: PointId) =>
  legalMoves(s)
    .filter((m) => m.from === from)
    .map((m) => m.to)
    .sort();

describe('createGame', () => {
  it('fills every point but the centre with four seats', () => {
    const s = createGame([0, 1, 2, 3]);
    expect(Object.keys(s.pieces)).toHaveLength(72);
    expect(s.pieces['g-3-3']).toBeUndefined();
    expect(countPieces(s)).toEqual({ 0: 18, 1: 18, 2: 18, 3: 18 });
    expect(s).toMatchObject({ turn: 0, chainFrom: null, quietRounds: 0, winner: null });
  });

  it('leaves unused seats empty in two and three seat games', () => {
    expect(countPieces(createGame([0, 2]))).toEqual({ 0: 18, 1: 0, 2: 18, 3: 0 });
    const three = createGame([3, 0, 1]);
    expect(three.seats).toEqual([0, 1, 3]);
    expect(countPieces(three)).toEqual({ 0: 18, 1: 18, 2: 0, 3: 18 });
  });

  it('rejects fewer than two or repeated seats', () => {
    expect(() => createGame([0])).toThrow('need 2 to 4 distinct seats');
    expect(() => createGame([0, 0])).toThrow('need 2 to 4 distinct seats');
  });

  it('gives the first seat a legal opening move', () => {
    expect(legalMoves(createGame([0, 1, 2, 3]))).toEqual([{ from: 'g-2-3', to: 'g-3-3' }]);
    expect(legalMoves(createGame([0, 2])).length).toBeGreaterThan(1);
  });
});

describe('steps', () => {
  it('moves one step along a line to any empty neighbour', () => {
    const s = pos({ 'g-3-3': 0, 'g-6-6': 1 }, [0, 1], 0);
    expect(targets(s, 'g-3-3')).toEqual(['g-2-3', 'g-3-2', 'g-3-4', 'g-4-3']);
  });

  it('never steps onto an occupied point', () => {
    const s = pos({ 'g-3-3': 0, 'g-3-4': 0, 'g-2-3': 1, 'g-6-6': 1 }, [0, 1], 0);
    expect(targets(s, 'g-3-3')).not.toContain('g-3-4');
  });

  it('passes the turn and never mutates its input', () => {
    const s = pos({ 'g-3-3': 0, 'g-6-6': 1 }, [0, 1], 0);
    const copy = JSON.parse(JSON.stringify(s)) as GameState;
    const next = applyMove(s, { from: 'g-3-3', to: 'g-3-4' });
    expect(s).toEqual(copy);
    expect(next.pieces).toEqual({ 'g-3-4': 0, 'g-6-6': 1 });
    expect(next.turn).toBe(1);
  });

  it('throws on an illegal move', () => {
    const s = pos({ 'g-3-3': 0, 'g-6-6': 1 }, [0, 1], 0);
    expect(() => applyMove(s, { from: 'g-3-3', to: 'g-5-3' })).toThrow('illegal move');
    expect(() => applyMove(s, { from: 'g-6-6', to: 'g-6-5' })).toThrow('illegal move'); // not their turn
  });
});

describe('captures', () => {
  it('jumps an adjacent enemy to the empty point beyond and removes it', () => {
    const s = pos({ 'g-3-1': 0, 'g-3-2': 1, 'g-6-6': 1 }, [0, 1], 0);
    const next = applyMove(s, { from: 'g-3-1', to: 'g-3-3' });
    expect(next.pieces).toEqual({ 'g-3-3': 0, 'g-6-6': 1 });
    expect(next.turn).toBe(1);
    expect(next.chainFrom).toBeNull();
  });

  it('cannot jump its own piece or onto an occupied point', () => {
    const own = pos({ 'g-3-1': 0, 'g-3-2': 0, 'g-6-6': 1 }, [0, 1], 0);
    expect(targets(own, 'g-3-1')).not.toContain('g-3-3');
    const blocked = pos({ 'g-3-1': 0, 'g-3-2': 1, 'g-3-3': 1, 'g-6-6': 1 }, [0, 1], 0);
    expect(targets(blocked, 'g-3-1')).not.toContain('g-3-3');
  });

  it('chains jumps with the same piece, only that piece may move', () => {
    const s = pos({ 'g-1-1': 0, 'g-1-2': 1, 'g-1-4': 1, 'g-6-0': 0, 'g-6-6': 1 }, [0, 1], 0);
    const mid = applyMove(s, { from: 'g-1-1', to: 'g-1-3' });
    expect(mid.turn).toBe(0);
    expect(mid.chainFrom).toBe('g-1-3');
    expect(legalMoves(mid)).toEqual([{ from: 'g-1-3', to: 'g-1-5' }]);
    const done = applyMove(mid, { from: 'g-1-3', to: 'g-1-5' });
    expect(done.pieces).toEqual({ 'g-1-5': 0, 'g-6-0': 0, 'g-6-6': 1 });
    expect(done).toMatchObject({ turn: 1, chainFrom: null });
  });

  it('lets the player stop a chain with endChain', () => {
    const s = pos({ 'g-1-1': 0, 'g-1-2': 1, 'g-1-4': 1, 'g-6-6': 1 }, [0, 1], 0);
    const mid = applyMove(s, { from: 'g-1-1', to: 'g-1-3' });
    const stopped = endChain(mid);
    expect(stopped).toMatchObject({ turn: 1, chainFrom: null });
    expect(stopped.pieces['g-1-4']).toBe(1);
    expect(() => endChain(stopped)).toThrow('no chain to end');
  });

  it('may capture any other seat, and capturing is optional', () => {
    const s = pos({ 'g-3-1': 0, 'g-3-2': 2, 'g-6-6': 1, 'g-6-0': 2 }, [0, 1, 2], 0);
    expect(targets(s, 'g-3-1')).toEqual(['g-2-1', 'g-3-0', 'g-3-3', 'g-4-1']);
  });

  it('jumps along triangle lines', () => {
    const leg = pos({ 'g-0-3': 0, 't-n-m-0': 1, 'g-6-6': 1 }, [0, 1], 0);
    expect(targets(leg, 'g-0-3')).toContain('t-n-b-0');
    const spoke = pos({ 'g-1-3': 0, 'g-0-3': 1, 'g-6-6': 1 }, [0, 1], 0);
    expect(targets(spoke, 'g-1-3')).toContain('t-n-m-1');
    const throughCentreSpoke = pos({ 'g-0-3': 0, 't-n-m-1': 1, 'g-6-6': 1 }, [0, 1], 0);
    expect(targets(throughCentreSpoke, 'g-0-3')).toContain('t-n-b-1');
    const middleRow = pos({ 't-e-m-0': 0, 't-e-m-1': 1, 'g-6-6': 1 }, [0, 1], 0);
    expect(targets(middleRow, 't-e-m-0')).toContain('t-e-m-2');
    const baseRow = pos({ 't-s-b-0': 0, 't-s-b-1': 1, 'g-0-0': 1 }, [0, 1], 0);
    expect(targets(baseRow, 't-s-b-0')).toContain('t-s-b-2');
  });

  it('never jumps around a corner', () => {
    const apex = pos({ 'g-0-2': 0, 'g-0-3': 1, 'g-6-6': 1 }, [0, 1], 0);
    expect(targets(apex, 'g-0-2')).toEqual(['g-0-1', 'g-0-4', 'g-1-2']);
    const corner = pos({ 'g-1-0': 0, 'g-0-0': 1, 'g-6-6': 1 }, [0, 1], 0);
    expect(targets(corner, 'g-1-0')).toEqual(['g-1-1', 'g-2-0']);
    const triangle = pos({ 't-n-m-0': 0, 'g-0-3': 1, 'g-6-6': 1 }, [0, 1], 0);
    expect(targets(triangle, 't-n-m-0')).not.toContain('g-0-4');
    expect(targets(triangle, 't-n-m-0')).not.toContain('g-1-3');
  });
});

describe('turns and endings', () => {
  it('skips a seat with no legal move', () => {
    const blocked = { 'g-0-0': 1, 'g-0-1': 2, 'g-1-0': 2, 'g-0-2': 2, 'g-2-0': 2 } as const;
    const s = pos({ ...blocked, 'g-6-6': 0 }, [0, 1, 2], 0);
    expect(applyMove(s, { from: 'g-6-6', to: 'g-6-5' }).turn).toBe(2);
  });

  it('skips an eliminated seat and plays on with the rest', () => {
    const s = pos({ 'g-3-1': 0, 'g-3-2': 1, 'g-6-6': 2 }, [0, 1, 2], 0);
    const next = applyMove(s, { from: 'g-3-1', to: 'g-3-3' });
    expect(next).toMatchObject({ turn: 2, winner: null });
    expect(countPieces(next)[1]).toBe(0);
  });

  it('ends when one seat has pieces left', () => {
    const s = pos({ 'g-3-1': 0, 'g-3-2': 1 }, [0, 1], 0);
    const next = applyMove(s, { from: 'g-3-1', to: 'g-3-3' });
    expect(next.winner).toBe(0);
    expect(legalMoves(next)).toEqual([]);
  });

  it('counts a quiet round each time the turn wraps, and a capture resets it', () => {
    const s = pos({ 'g-0-0': 0, 'g-6-6': 2, 'g-3-2': 2, 'g-3-1': 0 }, [0, 2], 2, {
      quietRounds: 5,
    });
    expect(applyMove(s, { from: 'g-6-6', to: 'g-6-5' }).quietRounds).toBe(6);
    const first = pos(s.pieces, [0, 2], 0, { quietRounds: 5 });
    expect(applyMove(first, { from: 'g-0-0', to: 'g-0-1' }).quietRounds).toBe(5);
    expect(applyMove(first, { from: 'g-3-1', to: 'g-3-3' }).quietRounds).toBe(0);
  });

  it('ends on piece count after 40 quiet rounds, or a draw on a tie', () => {
    const ahead = pos({ 'g-0-0': 0, 'g-0-2': 0, 'g-6-6': 2 }, [0, 2], 2, { quietRounds: 39 });
    expect(applyMove(ahead, { from: 'g-6-6', to: 'g-6-5' })).toMatchObject({
      quietRounds: 40,
      winner: 0,
    });
    const tied = pos({ 'g-0-0': 0, 'g-6-6': 2 }, [0, 2], 2, { quietRounds: 39 });
    expect(applyMove(tied, { from: 'g-6-6', to: 'g-6-5' }).winner).toBe('draw');
  });

  it('follows clockwise order in a three seat game', () => {
    let s = createGame([0, 1, 3]);
    const order: Seat[] = [];
    for (let i = 0; i < 6; i++) {
      order.push(s.turn);
      s = applyMove(s, legalMoves(s)[0]!);
    }
    expect(order.slice(0, 3)).toEqual([0, 1, 3]);
  });
});
