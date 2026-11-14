import { describe, expect, it } from 'vitest';
import { chooseMove } from '../src/ai.ts';
import { BOARDS, boardOf } from '../src/board.ts';
import { applyMove, createGame, endChain, legalMoves } from '../src/rules.ts';
import type { AiLevel, BoardId, GameState, PointId, Seat } from '../src/types.ts';

const at = (board: BoardId) => Object.fromEntries(BOARDS[board].points.map((p) => [p.id, p]));

function pos(board: BoardId, pieces: Record<PointId, Seat>, turn: Seat = 0): GameState {
  return { board, seats: [0, 2], pieces, turn, chainFrom: null, quietRounds: 0, winner: null };
}

function playGame(board: BoardId, level: AiLevel): GameState {
  let s = createGame([0, 2], board);
  for (let ply = 0; s.winner === null; ply++) {
    if (ply > 10_000) throw new Error('game did not finish');
    const choice = chooseMove(s, level, { nodeBudget: 2000 });
    s = choice === 'end-chain' ? endChain(s) : applyMove(s, choice);
  }
  return s;
}

describe.each([
  ['classic', 37, 20, 16],
  ['quick', 25, 16, 12],
] as const)('%s board', (id, points, lines, perSeat) => {
  const board = BOARDS[id];
  const ids = new Set(board.points.map((p) => p.id));
  const xy = at(id);

  it(`has ${points} unique points and ${lines} straight lines`, () => {
    expect(board.points).toHaveLength(points);
    expect(ids.size).toBe(points);
    expect(board.lines).toHaveLength(lines);
    for (const line of board.lines) {
      const [p, q] = [xy[line[0]!]!, xy[line[1]!]!];
      for (const pid of line) {
        const r = xy[pid]!;
        expect(Math.abs((q.x - p.x) * (r.y - p.y) - (q.y - p.y) * (r.x - p.x))).toBeLessThan(1e-9);
      }
    }
  });

  it('has symmetric neighbours, no self or duplicate links, only short links', () => {
    expect(new Set(Object.keys(board.neighbours))).toEqual(ids);
    for (const [a, list] of Object.entries(board.neighbours)) {
      expect(new Set(list).size).toBe(list.length);
      for (const b of list) {
        expect(b).not.toBe(a);
        expect(board.neighbours[b]).toContain(a);
        // diagonals are sqrt 2; the classic triangle's base row steps 2 units
        expect(Math.hypot(xy[a]!.x - xy[b]!.x, xy[a]!.y - xy[b]!.y)).toBeLessThanOrEqual(2);
      }
    }
  });

  it('only lets north and south play', () => {
    expect(board.seats).toEqual([0, 2]);
    expect(() => createGame([0, 1], id)).toThrow('seat not on this board');
    expect(() => createGame([0, 1, 2], id)).toThrow('seat not on this board');
  });

  it(`splits ${perSeat} start points each, mirrored, leaving the right points empty`, () => {
    const s = createGame([0, 2], id);
    expect(s.board).toBe(id);
    const north = board.start[0];
    const south = board.start[2];
    expect(north).toHaveLength(perSeat);
    expect(south).toHaveLength(perSeat);
    expect(new Set([...north, ...south]).size).toBe(2 * perSeat);
    for (const p of north) {
      const q = xy[p]!;
      expect(south).toContain(board.points.find((r) => r.x === 4 - q.x && r.y === 4 - q.y)!.id);
    }
    const empty = [...ids].filter((p) => s.pieces[p] === undefined).sort();
    expect(empty).toEqual(
      id === 'classic' ? ['g-2-0', 'g-2-1', 'g-2-2', 'g-2-3', 'g-2-4'] : ['g-2-2'],
    );
    expect(legalMoves(s).length).toBeGreaterThan(0);
  });

  it('captures along a diagonal', () => {
    const s = pos(id, { 'g-0-0': 0, 'g-1-1': 2, 'g-4-0': 2 });
    const next = applyMove(s, { from: 'g-0-0', to: 'g-2-2' });
    expect(next.pieces).toEqual({ 'g-2-2': 0, 'g-4-0': 2 });
  });

  it('has no diagonal on odd points', () => {
    const s = pos(id, { 'g-0-1': 0, 'g-4-4': 2 });
    expect(legalMoves(s).map((m) => m.to)).not.toContain('g-1-2');
  });

  it.each(['easy', 'medium', 'hard'] as const)(
    'plays full %s AI games to the end',
    (level) => {
      for (let i = 0; i < 10; i++) expect(playGame(id, level).winner).not.toBeNull();
    },
    120_000,
  );
});

describe('classic triangles', () => {
  it('jumps from the grid into the triangle along a diagonal', () => {
    // g-1-1 → over g-0-2 → north middle-row point at x 3, y -1
    const s = pos('classic', { 'g-1-1': 2, 'g-0-2': 0, 'g-4-4': 0 }, 2);
    const next = applyMove(s, { from: 'g-1-1', to: 't-n-m-2' });
    expect(next.pieces['t-n-m-2']).toBe(2);
    expect(next.pieces['g-0-2']).toBeUndefined();
  });

  it('runs the middle column through both triangles', () => {
    expect(BOARDS.classic.lines.some((l) => l.length === 9)).toBe(true);
  });
});

it('treats games without a board id as the four-colour board', () => {
  const { board: _, ...old } = createGame([0, 2]);
  expect(boardOf(old).id).toBe('four');
  expect(legalMoves(old)).toEqual(legalMoves(createGame([0, 2])));
});
