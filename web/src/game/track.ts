import { POINTS, jumpedPoint, type PointId, type Seat } from '@guti-arena/engine';

const AT = Object.fromEntries(POINTS.map((p) => [p.id, p]));
const dist = (a: PointId, b: PointId) => Math.hypot(AT[a]!.x - AT[b]!.x, AT[a]!.y - AT[b]!.y);

export interface Tracked {
  pieces: Record<PointId, Seat>;
  /** A stable key per piece, so the same pebble slides instead of being redrawn. */
  keys: Record<PointId, number>;
  /** Pieces that moved since the previous state, with the point they came from. */
  moved: Record<number, { from: PointId; jump: boolean }>;
  /** Points whose pieces were captured since the previous state. */
  captured: PointId[];
  lastMove: { from: PointId; to: PointId } | null;
}

let seq = 0;

/**
 * Work out what changed between two boards: which piece moved where and which were taken.
 * The board state has no piece identities, so a moved piece is matched to the nearest vacated
 * point of the same seat. A big difference (a new game) gets fresh keys and no move.
 */
export function track(prev: Tracked | null, pieces: Record<PointId, Seat>): Tracked {
  const fresh = (): Tracked => ({
    pieces,
    keys: Object.fromEntries(Object.keys(pieces).map((id) => [id, seq++])),
    moved: {},
    captured: [],
    lastMove: null,
  });
  if (!prev) return fresh();

  const added = Object.keys(pieces).filter((id) => prev.pieces[id] !== pieces[id]);
  const removed = Object.keys(prev.pieces).filter((id) => prev.pieces[id] !== pieces[id]);
  if (added.length + removed.length > 8) return fresh();

  const keys: Record<PointId, number> = {};
  for (const id of Object.keys(pieces)) if (!added.includes(id)) keys[id] = prev.keys[id]!;
  const moved: Tracked['moved'] = {};
  let lastMove: Tracked['lastMove'] = null;
  for (const to of added) {
    const from = removed
      .filter((r) => prev.pieces[r] === pieces[to])
      .sort((a, b) => dist(a, to) - dist(b, to))[0];
    if (from === undefined) {
      keys[to] = seq++;
      continue;
    }
    removed.splice(removed.indexOf(from), 1);
    keys[to] = prev.keys[from]!;
    moved[keys[to]] = { from, jump: jumpedPoint({ from, to }) !== null };
    lastMove = { from, to };
  }
  return { pieces, keys, moved, captured: removed, lastMove };
}
