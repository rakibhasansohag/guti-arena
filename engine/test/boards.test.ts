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

describe.each([
  ['three', 37, 21, 12, [0, 1, 2]],
  ['lau', 19, 9, 9, [0, 2]],
] as const)('%s board', (id, points, lines, perSeat, seats) => {
  const board = BOARDS[id];
  const xy = at(id);

  it(`has ${points} points, ${lines} straight lines and symmetric short links`, () => {
    expect(new Set(board.points.map((p) => p.id)).size).toBe(points);
    expect(board.lines).toHaveLength(lines);
    for (const line of board.lines) {
      const [p, q] = [xy[line[0]!]!, xy[line[1]!]!];
      for (const pid of line) {
        const r = xy[pid]!;
        expect(Math.abs((q.x - p.x) * (r.y - p.y) - (q.y - p.y) * (r.x - p.x))).toBeLessThan(1e-9);
      }
    }
    for (const [a, list] of Object.entries(board.neighbours)) {
      expect(new Set(list).size).toBe(list.length);
      for (const b of list) expect(board.neighbours[b]).toContain(a);
    }
  });

  it(`gives every seat ${perSeat} pieces and leaves only the centre empty`, () => {
    expect(board.seats).toEqual(seats);
    const s = createGame([...seats], id);
    for (const seat of seats) expect(board.start[seat]).toHaveLength(perSeat);
    expect(Object.keys(s.pieces)).toHaveLength(points - 1);
    expect(s.pieces[board.centre]).toBeUndefined();
    // Every seat can reach the centre, so nobody starts blocked.
    for (const seat of seats) {
      expect(board.neighbours[board.centre]!.some((p) => s.pieces[p] === seat)).toBe(true);
    }
  });

  it.each(['easy', 'medium', 'hard'] as const)(
    'plays full %s AI games to the end',
    (level) => {
      for (let i = 0; i < 5; i++) {
        let s = createGame([...seats], id);
        for (let ply = 0; s.winner === null; ply++) {
          if (ply > 10_000) throw new Error('game did not finish');
          const choice = chooseMove(s, level, { nodeBudget: 2000 });
          s = choice === 'end-chain' ? endChain(s) : applyMove(s, choice);
        }
        expect(s.winner).not.toBeNull();
      }
    },
    120_000,
  );
});

it('turns the three-player start a third of a turn onto itself', () => {
  const board = BOARDS.three;
  const xy = at('three');
  const [c, s] = [Math.cos((2 * Math.PI) / 3), Math.sin((2 * Math.PI) / 3)];
  for (const p of board.start[0]) {
    const [dx, dy] = [xy[p]!.x - 3, xy[p]!.y - 3];
    const [x, y] = [3 + dx * c - dy * s, 3 + dx * s + dy * c];
    const hit = board.points.find((q) => Math.hypot(q.x - x, q.y - y) < 1e-6)!;
    expect(board.start[1]).toContain(hit.id);
  }
});

describe('bagh-chal', () => {
  const play = (s: GameState, from: PointId, to: PointId) => applyMove(s, { from, to });

  it('starts with four tigers, twenty goats in hand and the goats to move', () => {
    const s = createGame([0, 2], 'bagh');
    expect(Object.values(s.pieces)).toEqual([0, 0, 0, 0]);
    expect(s).toMatchObject({ turn: 2, inHand: 20 });
    expect(legalMoves(s)).toHaveLength(21);
    expect(legalMoves(s).every((m) => m.from === 'hand')).toBe(true);
  });

  it('lets only tigers capture, one goat a jump, and tigers win on the fifth', () => {
    let s = play(createGame([0, 2], 'bagh'), 'hand', 'g-1-1');
    expect(s).toMatchObject({ turn: 0, inHand: 19 });
    s = play(s, 'g-0-0', 'g-2-2');
    expect(s.pieces['g-1-1']).toBeUndefined();
    expect(s.chainFrom).toBeNull();
    expect(s.turn).toBe(2);
    // Goats may not move while any are in hand, and never jump.
    expect(() => play({ ...s, pieces: { ...s.pieces, 'g-3-3': 2 } }, 'g-3-3', 'g-3-2')).toThrow(
      'illegal move',
    );
    const last = {
      ...s,
      inHand: 0,
      turn: 0 as Seat,
      pieces: { 'g-0-0': 0 as Seat, 'g-1-1': 2 as Seat },
    };
    // 20 goats, none in hand, one on the board: 19 taken already.
    expect(play(last, 'g-0-0', 'g-2-2').winner).toBe(0);
  });

  it('gives the goats the win when no tiger can move', () => {
    const pieces: Record<PointId, Seat> = {
      'g-0-0': 0,
      'g-0-1': 2,
      'g-1-0': 2,
      'g-1-1': 2,
      'g-0-2': 2,
      'g-2-0': 2,
    };
    const s: GameState = {
      board: 'bagh',
      seats: [0, 2],
      pieces,
      turn: 2,
      chainFrom: null,
      quietRounds: 0,
      winner: null,
      inHand: 15,
    };
    expect(play(s, 'hand', 'g-2-2').winner).toBe(2);
  });

  it.each(['easy', 'medium', 'hard'] as const)(
    'plays full %s AI games to the end',
    (level) => {
      for (let i = 0; i < 3; i++) {
        let s = createGame([0, 2], 'bagh');
        for (let ply = 0; s.winner === null; ply++) {
          if (ply > 5000) throw new Error('game did not finish');
          s = applyMove(s, chooseMove(s, level) as { from: PointId; to: PointId });
        }
        expect(s.winner).not.toBeNull();
      }
    },
    120_000,
  );
});
