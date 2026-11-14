import { BOARDS, boardOf, type Board } from './board.ts';
import type { BoardId, GameState, Move, PointId, Seat } from './types.ts';

/** Quiet rounds (no capture) after which the game ends on piece count. */
export const QUIET_ROUND_LIMIT = 40;

/** The point jumped over by `m` on `board`, or null when `m` is a plain step. */
export function jumpedPoint(m: Move, board: Board): PointId | null {
  return board.jumps[m.from]?.find((j) => j.to === m.to)?.over ?? null;
}

function jumpsFrom(board: Board, pieces: Record<PointId, Seat>, from: PointId, seat: Seat): Move[] {
  const out: Move[] = [];
  for (const { over, to } of board.jumps[from] ?? []) {
    const victim = pieces[over];
    if (victim !== undefined && victim !== seat && pieces[to] === undefined) out.push({ from, to });
  }
  return out;
}

/** Whether `seat` has any step or jump, stopping at the first one. */
function hasMove(board: Board, pieces: Record<PointId, Seat>, seat: Seat): boolean {
  for (const from in pieces) {
    if (pieces[from] !== seat) continue;
    for (const to of board.neighbours[from]!) if (pieces[to] === undefined) return true;
    if (jumpsFrom(board, pieces, from, seat).length > 0) return true;
  }
  return false;
}

/** All moves for `seat` with no chain in progress: steps and jumps. */
function movesFor(board: Board, pieces: Record<PointId, Seat>, seat: Seat): Move[] {
  const out: Move[] = [];
  for (const from in pieces) {
    if (pieces[from] !== seat) continue;
    for (const to of board.neighbours[from]!) if (pieces[to] === undefined) out.push({ from, to });
    out.push(...jumpsFrom(board, pieces, from, seat));
  }
  return out;
}

export function countPieces(s: GameState): Record<Seat, number> {
  const counts: Record<Seat, number> = { 0: 0, 1: 0, 2: 0, 3: 0 };
  for (const id in s.pieces) counts[s.pieces[id]!]++;
  return counts;
}

/** Most pieces wins; a tie for most is a draw. */
function winnerByCount(s: GameState): Seat | 'draw' {
  const counts = countPieces(s);
  const best = Math.max(...s.seats.map((seat) => counts[seat]));
  const leaders = s.seats.filter((seat) => counts[seat] === best);
  return leaders.length === 1 ? leaders[0]! : 'draw';
}

/** A new game on `board`. Every seat must be one the board has; two-player boards use seats 0 and 2. */
export function createGame(seats: Seat[], board: BoardId = 'four'): GameState {
  const inPlay = [...new Set(seats)].sort((a, b) => a - b);
  if (inPlay.length < 2 || inPlay.length !== seats.length) {
    throw new Error('need 2 to 4 distinct seats');
  }
  const b = BOARDS[board];
  if (!inPlay.every((seat) => b.seats.includes(seat))) throw new Error('seat not on this board');
  const pieces: Record<PointId, Seat> = {};
  for (const seat of inPlay) for (const p of b.start[seat]) pieces[p] = seat;
  return {
    board,
    seats: inPlay,
    pieces,
    turn: inPlay[0]!,
    chainFrom: null,
    quietRounds: 0,
    winner: null,
  };
}

export function legalMoves(s: GameState): Move[] {
  if (s.winner !== null) return [];
  const board = boardOf(s);
  if (s.chainFrom !== null) return jumpsFrom(board, s.pieces, s.chainFrom, s.turn);
  return movesFor(board, s.pieces, s.turn);
}

/**
 * Pass the turn clockwise to the next seat that has pieces and a legal move.
 * A full round is counted each time the turn wraps past the last seat.
 * Mutates `s`, which must be a fresh copy.
 */
function passTurn(s: GameState): void {
  s.chainFrom = null;
  const counts = countPieces(s);
  const n = s.seats.length;
  const start = s.seats.indexOf(s.turn);
  let wrapped = false;
  for (let k = 1; k <= n; k++) {
    if (start + k >= n) wrapped = true;
    const seat = s.seats[(start + k) % n]!;
    if (counts[seat] > 0 && hasMove(boardOf(s), s.pieces, seat)) {
      s.turn = seat;
      if (wrapped) s.quietRounds++;
      if (s.quietRounds >= QUIET_ROUND_LIMIT) s.winner = winnerByCount(s);
      return;
    }
  }
  // Nobody can move: settle on piece count.
  s.winner = winnerByCount(s);
}

/** Returns a new state; throws on an illegal move. Never mutates `s`. */
export function applyMove(s: GameState, m: Move): GameState {
  if (!legalMoves(s).some((l) => l.from === m.from && l.to === m.to)) {
    throw new Error(`illegal move ${m.from} -> ${m.to}`);
  }
  return applyLegalMove(s, m);
}

/** `applyMove` without the legality check, for search over moves that came from `legalMoves`. */
export function applyLegalMove(s: GameState, m: Move): GameState {
  const next: GameState = { ...s, seats: [...s.seats], pieces: { ...s.pieces } };
  next.pieces[m.to] = s.turn;
  delete next.pieces[m.from];

  const board = boardOf(s);
  const over = jumpedPoint(m, board);
  if (over === null) {
    passTurn(next);
    return next;
  }

  delete next.pieces[over];
  next.quietRounds = 0;
  const counts = countPieces(next);
  const alive = next.seats.filter((seat) => counts[seat] > 0);
  if (alive.length === 1) {
    next.winner = alive[0]!;
    next.chainFrom = null;
    return next;
  }
  // The same piece may keep jumping; if it cannot, the turn passes on its own.
  if (jumpsFrom(board, next.pieces, m.to, s.turn).length > 0) next.chainFrom = m.to;
  else passTurn(next);
  return next;
}

/** Stop a multi-jump and pass the turn. Throws when no chain is in progress. */
export function endChain(s: GameState): GameState {
  if (s.chainFrom === null || s.winner !== null) throw new Error('no chain to end');
  const next: GameState = { ...s, seats: [...s.seats], pieces: { ...s.pieces } };
  passTurn(next);
  return next;
}
