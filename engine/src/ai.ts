import { LINES, NEIGHBOURS, POINTS } from './board.ts';
import { applyLegalMove, countPieces, endChain, jumpedPoint, legalMoves } from './rules.ts';
import type { AiLevel, GameState, Move, PointId, Seat } from './types.ts';

type Choice = Move | 'end-chain';

export interface AiOptions {
  /** Hard search budget in visited nodes. Lower it only for tests. */
  nodeBudget?: number;
}

/**
 * Hard search budget in visited nodes, not wall time: Workers freeze the clock during CPU work.
 * About 20 to 30 ms in Node on a laptop (search depth 3 in the middle game, deeper near the end),
 * which keeps a mid-range phone under the 300 ms target.
 */
const HARD_NODE_BUDGET = 10_000;
const WIN = 1_000_000;

const pick = <T>(xs: T[]): T => xs[Math.floor(Math.random() * xs.length)]!;
const isJump = (m: Move) => jumpedPoint(m) !== null;

export function chooseMove(s: GameState, level: AiLevel, opts: AiOptions = {}): Choice {
  const moves = legalMoves(s);
  if (moves.length === 0) {
    if (s.chainFrom !== null) return 'end-chain';
    throw new Error('no legal move');
  }
  if (level === 'easy') {
    const captures = moves.filter(isJump);
    return pick(captures.length > 0 ? captures : moves);
  }
  if (level === 'medium') return medium(s, moves);
  return hard(s, moves, opts.nodeBudget ?? HARD_NODE_BUDGET);
}

// Index-based board tables shared by medium's exposure count and hard's search.
const IDS = POINTS.map((p) => p.id);
const INDEX = new Map(IDS.map((id, i) => [id, i]));
const at = (id: PointId) => INDEX.get(id)!;
const NB: number[][] = IDS.map((id) => NEIGHBOURS[id]!.map(at));
/** JP[from] holds pairs: over, to. */
const JP: number[][] = IDS.map(() => []);
/** Every three consecutive points on a line: a, b, c. */
const TRIPLES: number[] = [];
for (const line of LINES) {
  for (let i = 0; i + 2 < line.length; i++) {
    const [a, b, c] = [at(line[i]!), at(line[i + 1]!), at(line[i + 2]!)];
    JP[a]!.push(b, c);
    JP[c]!.push(b, a);
    TRIPLES.push(a, b, c);
  }
}

const EMPTY = -1;

function toBoard(pieces: Record<PointId, Seat>): Int8Array {
  const board = new Int8Array(IDS.length).fill(EMPTY);
  for (const id in pieces) board[at(id)] = pieces[id]!;
  return board;
}

/** How many of `seat`'s pieces some other seat could jump right now. */
function exposed(board: Int8Array, seat: number): number {
  let hit = 0;
  const seen = new Set<number>();
  for (let i = 0; i < TRIPLES.length; i += 3) {
    const b = TRIPLES[i + 1]!;
    if (board[b] !== seat || seen.has(b)) continue;
    const pa = board[TRIPLES[i]!]!;
    const pc = board[TRIPLES[i + 2]!]!;
    if (
      (pa !== EMPTY && pa !== seat && pc === EMPTY) ||
      (pc !== EMPTY && pc !== seat && pa === EMPTY)
    ) {
      seen.add(b);
      hit++;
    }
  }
  return hit;
}

/** Best immediate result: pieces captured minus own pieces left open to capture. */
function medium(s: GameState, moves: Move[]): Choice {
  const me = s.turn;
  const before = countPieces(s);
  const score = (next: GameState): number => {
    if (next.winner === me) return WIN;
    const after = countPieces(next);
    let captured = 0;
    for (const seat of s.seats) if (seat !== me) captured += before[seat] - after[seat];
    return captured - exposed(toBoard(next.pieces), me);
  };
  const options: [Choice, number][] = moves.map((m) => [m, score(applyLegalMove(s, m))]);
  if (s.chainFrom !== null) options.push(['end-chain', score(endChain(s))]);
  const best = Math.max(...options.map(([, v]) => v));
  return pick(options.filter(([, v]) => v === best))[0];
}

class OutOfBudget extends Error {}

const END = -1;
// A move packs from, to and over (+1, so 0 means a plain step) into one number.
const pack = (from: number, to: number, over: number) => from | (to << 7) | ((over + 1) << 14);

/**
 * Depth-limited alpha-beta on a compact board with make/unmake. With three or four seats
 * every other seat is treated as one opponent (paranoid search): they minimise my score
 * whoever's turn it is. Quiet-round endings are ignored inside the search horizon.
 */
function hard(s: GameState, rootMoves: Move[], budget: number): Choice {
  const me = s.turn;
  const seats = s.seats;
  const board = toBoard(s.pieces);
  const counts = [0, 0, 0, 0];
  for (const p of board) if (p !== EMPTY) counts[p]!++;
  let turn: number = s.turn;
  let chain = s.chainFrom === null ? EMPTY : at(s.chainFrom);
  let nodes = 0;

  const canJumpFrom = (from: number, seat: number): boolean => {
    const jp = JP[from]!;
    for (let k = 0; k < jp.length; k += 2) {
      const v = board[jp[k]!]!;
      if (v !== EMPTY && v !== seat && board[jp[k + 1]!] === EMPTY) return true;
    }
    return false;
  };

  const hasMove = (seat: number): boolean => {
    for (let i = 0; i < board.length; i++) {
      if (board[i] !== seat) continue;
      for (const n of NB[i]!) if (board[n] === EMPTY) return true;
      if (canJumpFrom(i, seat)) return true;
    }
    return false;
  };

  /** Next seat clockwise with pieces and a move, or EMPTY when nobody can move. */
  const nextTurn = (): number => {
    const n = seats.length;
    const start = seats.indexOf(turn as Seat);
    for (let k = 1; k <= n; k++) {
      const seat = seats[(start + k) % n]!;
      if (counts[seat]! > 0 && hasMove(seat)) return seat;
    }
    return EMPTY;
  };

  /** Moves for the side to move, captures first. */
  const gen = (): number[] => {
    const jumps: number[] = [];
    const steps: number[] = [];
    const addJumps = (from: number) => {
      const jp = JP[from]!;
      for (let k = 0; k < jp.length; k += 2) {
        const v = board[jp[k]!]!;
        if (v !== EMPTY && v !== turn && board[jp[k + 1]!] === EMPTY)
          jumps.push(pack(from, jp[k + 1]!, jp[k]!));
      }
    };
    if (chain !== EMPTY) {
      addJumps(chain);
      jumps.push(END);
      return jumps;
    }
    for (let i = 0; i < board.length; i++) {
      if (board[i] !== turn) continue;
      addJumps(i);
      for (const n of NB[i]!) if (board[n] === EMPTY) steps.push(pack(i, n, -1));
    }
    return jumps.concat(steps);
  };

  const alive = () => seats.filter((seat) => counts[seat]! > 0);

  /** Piece difference first (me against the average live opponent), then mobility. */
  const evaluate = (): number => {
    const others = alive().filter((seat) => seat !== me);
    const avg =
      others.reduce((sum: number, seat) => sum + counts[seat]!, 0) / Math.max(1, others.length);
    const mobility = turn === EMPTY ? 0 : (turn === me ? 1 : -1) * gen().length;
    return (counts[me]! - avg) * 100 - exposed(board, me) * 30 + mobility;
  };

  /** Play `mv`, search below it, undo it. */
  const visit = (mv: number, depth: number, alpha: number, beta: number): number => {
    const savedTurn = turn;
    const savedChain = chain;
    let value: number;
    if (mv === END) {
      chain = EMPTY;
      turn = nextTurn();
      value = search(depth, alpha, beta);
    } else {
      const from = mv & 127;
      const to = (mv >> 7) & 127;
      const over = (mv >> 14) - 1;
      board[to] = turn;
      board[from] = EMPTY;
      let victim = EMPTY;
      if (over !== EMPTY) {
        victim = board[over]!;
        board[over] = EMPTY;
        counts[victim]!--;
      }
      const left = alive();
      if (left.length === 1) {
        value = left[0] === me ? WIN + depth : -WIN - depth; // prefer quick wins, slow losses
      } else {
        if (over !== EMPTY && canJumpFrom(to, turn)) chain = to;
        else {
          chain = EMPTY;
          turn = nextTurn();
        }
        value = search(depth, alpha, beta);
      }
      board[from] = savedTurn;
      board[to] = EMPTY;
      if (over !== EMPTY) {
        board[over] = victim;
        counts[victim]!++;
      }
    }
    turn = savedTurn;
    chain = savedChain;
    return value;
  };

  const search = (depth: number, alpha: number, beta: number): number => {
    if (++nodes > budget) throw new OutOfBudget();
    if (depth === 0 || turn === EMPTY) return evaluate();
    const maximise = turn === me;
    let best = maximise ? -Infinity : Infinity;
    for (const mv of gen()) {
      const v = visit(mv, depth - 1, alpha, beta);
      if (maximise) {
        if (v > best) best = v;
        if (v > alpha) alpha = v;
      } else {
        if (v < best) best = v;
        if (v < beta) beta = v;
      }
      if (beta <= alpha) break;
    }
    return best;
  };

  // Root choices come from the real rules, captures first.
  const ordered = [...rootMoves.filter(isJump), ...rootMoves.filter((m) => !isJump(m))];
  const roots: [Choice, number][] = ordered.map((m) => [
    m,
    pack(at(m.from), at(m.to), jumpedPoint(m) === null ? -1 : at(jumpedPoint(m)!)),
  ]);
  if (s.chainFrom !== null) roots.push(['end-chain', END]);

  let bestChoice: Choice = roots[0]![0];
  // Iterative deepening: keep the last depth that finished inside the budget.
  for (let depth = 1; depth <= 12; depth++) {
    try {
      let bestValue = -Infinity;
      let ties: Choice[] = [];
      for (const [choice, mv] of roots) {
        // Window just below the best so far: worse moves fail low, equal ones stay exact for ties.
        const v = visit(mv, depth - 1, bestValue - 1e-6, Infinity);
        if (v > bestValue) [bestValue, ties] = [v, [choice]];
        else if (v === bestValue) ties.push(choice);
      }
      bestChoice = pick(ties);
      if (bestValue >= WIN) break;
    } catch (e) {
      if (e instanceof OutOfBudget) break;
      throw e;
    }
  }
  return bestChoice;
}
