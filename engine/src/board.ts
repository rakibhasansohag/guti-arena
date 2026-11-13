import type { PointId, Seat } from './types.ts';

export interface Point {
  id: PointId;
  x: number; // grid units; the grid spans 0..6, triangles reach -2 and 8
  y: number;
}

/** Triangle side letter per seat, clockwise from north. */
export const SIDES = ['n', 'e', 's', 'w'] as const;
export const CENTRE: PointId = 'g-3-3';

const SIZE = 7;
const SEATS: Seat[] = [0, 1, 2, 3];
const grid = (r: number, c: number): PointId => `g-${r}-${c}`;
const tri = (seat: Seat, row: 'm' | 'b', i: number): PointId => `t-${SIDES[seat]}-${row}-${i}`;

/** Rotate (x, y) a quarter turn clockwise `times` times around the board centre (3, 3). */
function rotate(x: number, y: number, times: number): [number, number] {
  for (let k = 0; k < times; k++) [x, y] = [6 - y, x];
  return [x, y];
}

// North triangle points as [row, index, x, y]; the other three triangles are this rotated.
const NORTH_TRIANGLE: ['m' | 'b', number, number, number][] = [
  ['m', 0, 2.25, -1],
  ['m', 1, 3, -1],
  ['m', 2, 3.75, -1],
  ['b', 0, 1.5, -2],
  ['b', 1, 3, -2],
  ['b', 2, 4.5, -2],
];

export const POINTS: Point[] = [];
for (let r = 0; r < SIZE; r++) {
  for (let c = 0; c < SIZE; c++) POINTS.push({ id: grid(r, c), x: c, y: r });
}
for (const seat of SEATS) {
  for (const [row, i, x0, y0] of NORTH_TRIANGLE) {
    const [x, y] = rotate(x0, y0, seat);
    POINTS.push({ id: tri(seat, row, i), x, y });
  }
}

/** The grid's mid-edge point on `seat`'s side, where its triangle joins. */
function apex(seat: Seat): PointId {
  const [x, y] = rotate(3, 0, seat);
  return grid(y, x);
}

/** Every straight drawn line as an ordered list. A jump needs three consecutive points on one line. */
export const LINES: PointId[][] = [];
for (let r = 0; r < SIZE; r++) {
  const row = Array.from({ length: SIZE }, (_, c) => grid(r, c));
  // The middle row runs on through the west and east triangle spokes.
  LINES.push(
    r === 3 ? [tri(3, 'b', 1), tri(3, 'm', 1), ...row, tri(1, 'm', 1), tri(1, 'b', 1)] : row,
  );
}
for (let c = 0; c < SIZE; c++) {
  const col = Array.from({ length: SIZE }, (_, r) => grid(r, c));
  // The middle column runs on through the north and south triangle spokes.
  LINES.push(
    c === 3 ? [tri(0, 'b', 1), tri(0, 'm', 1), ...col, tri(2, 'm', 1), tri(2, 'b', 1)] : col,
  );
}
for (const seat of SEATS) {
  const a = apex(seat);
  LINES.push(
    [a, tri(seat, 'm', 0), tri(seat, 'b', 0)],
    [a, tri(seat, 'm', 2), tri(seat, 'b', 2)],
    [tri(seat, 'm', 0), tri(seat, 'm', 1), tri(seat, 'm', 2)],
    [tri(seat, 'b', 0), tri(seat, 'b', 1), tri(seat, 'b', 2)],
  );
}

/** Adjacent points: consecutive points on any line. */
export const NEIGHBOURS: Record<PointId, PointId[]> = Object.fromEntries(
  POINTS.map((p) => [p.id, []]),
);
for (const line of LINES) {
  for (let i = 1; i < line.length; i++) {
    const a = line[i - 1]!;
    const b = line[i]!;
    NEIGHBOURS[a]!.push(b);
    NEIGHBOURS[b]!.push(a);
  }
}

// North's 12 grid start points as [r, c]: row 0 cols 0-5, row 1 cols 1-4, row 2 cols 2-3.
const NORTH_GRID_START: [number, number][] = [
  [0, 0], [0, 1], [0, 2], [0, 3], [0, 4], [0, 5],
  [1, 1], [1, 2], [1, 3], [1, 4],
  [2, 2], [2, 3],
]; // prettier-ignore

/** The 18 points a seat starts on: its 6 triangle points plus 12 grid points. */
export function startPoints(seat: Seat): PointId[] {
  const triangle = NORTH_TRIANGLE.map(([row, i]) => tri(seat, row, i));
  const cells = NORTH_GRID_START.map(([r, c]) => {
    const [x, y] = rotate(c, r, seat);
    return grid(y, x);
  });
  return [...triangle, ...cells];
}
