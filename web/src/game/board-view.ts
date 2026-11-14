import type { Board, PointId, Seat } from '@guti-arena/engine';

export type Pos = Record<PointId, { x: number; y: number }>;
export interface View {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Quarter turns clockwise that bring `bottom` to the south edge; none on a board drawn one way up. */
export const turnsFor = (board: Board, bottom: Seat | null) =>
  bottom === null || board.fixed ? 0 : (2 - bottom + 4) % 4;

/** Board positions with `bottom` turned to the south edge. */
export function positions(board: Board, bottom: Seat | null): Pos {
  const turns = turnsFor(board, bottom);
  const pos: Pos = {};
  for (const p of board.points) {
    let [x, y] = [p.x, p.y];
    for (let k = 0; k < turns; k++) [x, y] = [board.size - 1 - y, x];
    pos[p.id] = { x, y };
  }
  return pos;
}

/** The box around every point, with room for a piece on the edge. Tall boards get a tall view. */
export function viewOf(pos: Pos): View {
  const xs = Object.values(pos).map((p) => p.x);
  const ys = Object.values(pos).map((p) => p.y);
  const [x, y] = [Math.min(...xs) - 0.6, Math.min(...ys) - 0.6];
  return { x, y, w: Math.max(...xs) + 0.6 - x, h: Math.max(...ys) + 0.6 - y };
}
