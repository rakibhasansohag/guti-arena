import type { BoardId, GameState, PointId, Seat } from './types.ts';

export interface Point {
  id: PointId;
  x: number; // grid units; the grid spans 0..size-1, triangles reach two units past it
  y: number;
}

export interface Jump {
  over: PointId;
  to: PointId;
}

export interface Board {
  id: BoardId;
  /** Grid points per side. Seats turn around the grid centre. */
  size: number;
  centre: PointId;
  points: Point[];
  /** Every straight drawn line as an ordered list. A jump needs three consecutive points on one line. */
  lines: PointId[][];
  /** Adjacent points: consecutive points on any line. */
  neighbours: Record<PointId, PointId[]>;
  /** Every jump from each point: three consecutive points on one line, either direction. */
  jumps: Record<PointId, Jump[]>;
  /** Seats that can play on this board, clockwise. */
  seats: Seat[];
  /** Start points per seat; empty for seats not on this board. */
  start: Record<Seat, PointId[]>;
}

/** Triangle side letter per seat, clockwise from north. */
export const SIDES = ['n', 'e', 's', 'w'] as const;

const ALL_SEATS: Seat[] = [0, 1, 2, 3];
const grid = (r: number, c: number): PointId => `g-${r}-${c}`;
const tri = (seat: Seat, row: 'm' | 'b', i: number): PointId => `t-${SIDES[seat]}-${row}-${i}`;

/** Rotate (x, y) a quarter turn clockwise `times` times around the centre of a `size` grid. */
function rotate(x: number, y: number, times: number, size: number): [number, number] {
  for (let k = 0; k < times; k++) [x, y] = [size - 1 - y, x];
  return [x, y];
}

function makeBoard(
  id: BoardId,
  size: number,
  points: Point[],
  lines: PointId[][],
  start: Record<Seat, PointId[]>,
): Board {
  const neighbours: Record<PointId, PointId[]> = Object.fromEntries(points.map((p) => [p.id, []]));
  const jumps: Record<PointId, Jump[]> = Object.fromEntries(points.map((p) => [p.id, []]));
  for (const line of lines) {
    for (let i = 1; i < line.length; i++) {
      const [a, b] = [line[i - 1]!, line[i]!];
      neighbours[a]!.push(b);
      neighbours[b]!.push(a);
    }
    for (let i = 0; i + 2 < line.length; i++) {
      const [a, b, c] = [line[i]!, line[i + 1]!, line[i + 2]!];
      jumps[a]!.push({ over: b, to: c });
      jumps[c]!.push({ over: b, to: a });
    }
  }
  const half = (size - 1) / 2;
  const seats = ALL_SEATS.filter((s) => start[s].length > 0);
  return { id, size, centre: grid(half, half), points, lines, neighbours, jumps, seats, start };
}

// ---- Four-colour board: 7 by 7 grid, no diagonals, a small triangle on every side. ----

// North triangle points as [row, index, x, y]; the other three triangles are this rotated.
const NORTH_TRIANGLE: ['m' | 'b', number, number, number][] = [
  ['m', 0, 2.25, -1],
  ['m', 1, 3, -1],
  ['m', 2, 3.75, -1],
  ['b', 0, 1.5, -2],
  ['b', 1, 3, -2],
  ['b', 2, 4.5, -2],
];

// North's 12 grid start points as [r, c]: row 0 cols 0-5, row 1 cols 1-4, row 2 cols 2-3.
const NORTH_GRID_START: [number, number][] = [
  [0, 0], [0, 1], [0, 2], [0, 3], [0, 4], [0, 5],
  [1, 1], [1, 2], [1, 3], [1, 4],
  [2, 2], [2, 3],
]; // prettier-ignore

function fourBoard(): Board {
  const SIZE = 7;
  const points: Point[] = [];
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) points.push({ id: grid(r, c), x: c, y: r });
  }
  for (const seat of ALL_SEATS) {
    for (const [row, i, x0, y0] of NORTH_TRIANGLE) {
      const [x, y] = rotate(x0, y0, seat, SIZE);
      points.push({ id: tri(seat, row, i), x, y });
    }
  }

  /** The grid's mid-edge point on `seat`'s side, where its triangle joins. */
  const apex = (seat: Seat): PointId => {
    const [x, y] = rotate(3, 0, seat, SIZE);
    return grid(y, x);
  };

  const lines: PointId[][] = [];
  for (let r = 0; r < SIZE; r++) {
    const row = Array.from({ length: SIZE }, (_, c) => grid(r, c));
    // The middle row runs on through the west and east triangle spokes.
    lines.push(
      r === 3 ? [tri(3, 'b', 1), tri(3, 'm', 1), ...row, tri(1, 'm', 1), tri(1, 'b', 1)] : row,
    );
  }
  for (let c = 0; c < SIZE; c++) {
    const col = Array.from({ length: SIZE }, (_, r) => grid(r, c));
    // The middle column runs on through the north and south triangle spokes.
    lines.push(
      c === 3 ? [tri(0, 'b', 1), tri(0, 'm', 1), ...col, tri(2, 'm', 1), tri(2, 'b', 1)] : col,
    );
  }
  for (const seat of ALL_SEATS) {
    const a = apex(seat);
    lines.push(
      [a, tri(seat, 'm', 0), tri(seat, 'b', 0)],
      [a, tri(seat, 'm', 2), tri(seat, 'b', 2)],
      [tri(seat, 'm', 0), tri(seat, 'm', 1), tri(seat, 'm', 2)],
      [tri(seat, 'b', 0), tri(seat, 'b', 1), tri(seat, 'b', 2)],
    );
  }

  /** The 18 points a seat starts on: its 6 triangle points plus 12 grid points. */
  const startOf = (seat: Seat): PointId[] => [
    ...NORTH_TRIANGLE.map(([row, i]) => tri(seat, row, i)),
    ...NORTH_GRID_START.map(([r, c]) => {
      const [x, y] = rotate(c, r, seat, SIZE);
      return grid(y, x);
    }),
  ];
  return makeBoard('four', SIZE, points, lines, {
    0: startOf(0),
    1: startOf(1),
    2: startOf(2),
    3: startOf(3),
  });
}

// ---- Two-player boards: 5 by 5 grid with alternating diagonals, north (blue) against south (white). ----

/**
 * A 5 by 5 board. `triangles` adds the classic full-width triangle on the north and south sides:
 * its centre line continues the middle column and its sides continue the grid's short diagonals.
 * `northStart` lists north's start points as [x, y]; south starts on the same points turned half way.
 */
function fiveBoard(id: BoardId, triangles: boolean, northStart: [number, number][]): Board {
  const SIZE = 5;
  const points: Point[] = [];
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) points.push({ id: grid(r, c), x: c, y: r });
  }
  if (triangles) {
    for (const seat of [0, 2] as Seat[]) {
      for (let i = 0; i < 3; i++) {
        const [mx, my] = rotate(1 + i, -1, seat, SIZE);
        const [bx, by] = rotate(2 * i, -2, seat, SIZE);
        points.push({ id: tri(seat, 'm', i), x: mx, y: my });
        points.push({ id: tri(seat, 'b', i), x: bx, y: by });
      }
    }
  }
  const byXY = new Map(points.map((p) => [`${p.x},${p.y}`, p.id]));
  const at = (x: number, y: number): PointId => {
    const found = byXY.get(`${x},${y}`);
    if (!found) throw new Error(`no point at ${x},${y}`);
    return found;
  };
  /** `n` points from (x, y) in steps of (dx, dy). */
  const walk = (x: number, y: number, dx: number, dy: number, n: number): PointId[] =>
    Array.from({ length: n }, (_, k) => at(x + k * dx, y + k * dy));

  const t = triangles ? 2 : 0; // how far the middle column and short diagonals run past the grid
  const lines: PointId[][] = [];
  for (let k = 0; k < SIZE; k++) {
    lines.push(walk(0, k, 1, 0, SIZE));
    lines.push(k === 2 ? walk(2, -t, 0, 1, SIZE + 2 * t) : walk(k, 0, 0, 1, SIZE));
  }
  lines.push(
    walk(0, 0, 1, 1, SIZE),
    walk(4, 0, -1, 1, SIZE),
    // The diamond through the mid-edge points; each side runs on into a triangle.
    walk(2 - t, -t, 1, 1, 3 + t),
    walk(2 + t, -t, -1, 1, 3 + t),
    walk(0, 2, 1, 1, 3 + t),
    walk(4, 2, -1, 1, 3 + t),
  );
  if (triangles) {
    lines.push(
      walk(1, -1, 1, 0, 3),
      walk(0, -2, 2, 0, 3),
      walk(1, 5, 1, 0, 3),
      walk(0, 6, 2, 0, 3),
    );
  }

  const startOf = (seat: Seat) => northStart.map(([x, y]) => at(...rotate(x, y, seat, SIZE)));
  return makeBoard(id, SIZE, points, lines, { 0: startOf(0), 1: [], 2: startOf(2), 3: [] });
}

/** Grid rows 0 and 1 as [x, y]. */
const TWO_ROWS = Array.from({ length: 10 }, (_, k): [number, number] => [k % 5, Math.floor(k / 5)]);

export const BOARDS: Record<BoardId, Board> = {
  four: fourBoard(),
  // 16 each: the triangle plus the two nearest rows. The middle row starts empty.
  classic: fiveBoard('classic', true, [
    [0, -2], [2, -2], [4, -2],
    [1, -1], [2, -1], [3, -1],
    ...TWO_ROWS,
  ]), // prettier-ignore
  // 12 each: two rows plus the two right-hand points of the middle row. The centre starts empty.
  quick: fiveBoard('quick', false, [...TWO_ROWS, [3, 2], [4, 2]]),
};

export const BOARD_IDS = Object.keys(BOARDS) as BoardId[];

export const isBoardId = (x: unknown): x is BoardId =>
  typeof x === 'string' && Object.hasOwn(BOARDS, x);

/** The board a game is played on. Games saved before boards existed have no id: the four-colour board. */
export const boardOf = (s: GameState): Board => BOARDS[s.board ?? 'four'];

// The four-colour board's tables, kept for drawings of the default board.
export const CENTRE: PointId = BOARDS.four.centre;
export const POINTS: Point[] = BOARDS.four.points;
export const LINES: PointId[][] = BOARDS.four.lines;
export const NEIGHBOURS: Record<PointId, PointId[]> = BOARDS.four.neighbours;

/** The 18 points a seat starts on in the four-colour board: its 6 triangle points plus 12 grid points. */
export const startPoints = (seat: Seat): PointId[] => BOARDS.four.start[seat];
