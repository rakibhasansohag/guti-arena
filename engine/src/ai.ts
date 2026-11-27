import { BOARDS, boardOf, type Board } from './board.ts';
import {
  GOAT,
  TIGER,
  applyLegalMove,
  countPieces,
  endChain,
  goatsTaken,
  jumpedPoint,
  legalMoves,
} from './rules.ts';
import type { AiLevel, BoardId, GameState, Move, PointId, Seat } from './types.ts';

type Choice = Move | 'end-chain';

export interface AiOptions {
  /** Hard search budget in visited nodes (the fast search on four-sided and hexagon boards). */
  nodeBudget?: number;
  /** Node budget for the full-rules search used on Bagh-chal and Lau kata kati; none by default. */
  plainNodeBudget?: number;
}

/**
 * Hard search budget in visited nodes, not wall time: Workers freeze the clock during CPU work.
 * About 20 to 30 ms in Node on a laptop (search depth 3 in the middle game, deeper near the end),
 * which keeps a mid-range phone under the 300 ms target.
 */
const HARD_NODE_BUDGET = 10_000;
const WIN = 1_000_000;

const pick = <T>(xs: T[]): T => xs[Math.floor(Math.random() * xs.length)]!;

export function chooseMove(s: GameState, level: AiLevel, opts: AiOptions = {}): Choice {
  const moves = legalMoves(s);
  if (moves.length === 0) {
    if (s.chainFrom !== null) return 'end-chain';
    throw new Error('no legal move');
  }
  const isJump = (m: Move) => jumpedPoint(m, boardOf(s)) !== null;
  const id = boardOf(s).id;
  if (level !== 'easy') {
    const budget = opts.plainNodeBudget;
    if (id === 'bagh') return plain(s, moves, level === 'hard' ? 4 : 2, baghScore, budget);
    if (id === 'lau') return plain(s, moves, level === 'hard' ? 6 : 2, lauScore, budget);
  }
  if (level === 'easy') {
    const captures = moves.filter(isJump);
    return pick(captures.length > 0 ? captures : moves);
  }
  const tables = TABLES[boardOf(s).id];
  if (level === 'medium') return medium(s, moves, tables);
  return hard(s, moves, tables, opts.nodeBudget ?? HARD_NODE_BUDGET);
}

/** How good a Bagh-chal position is for the tigers: goats taken, then tigers that can still move. */
function baghScore(s: GameState): number {
  if (s.winner !== null) return s.winner === TIGER ? WIN : s.winner === GOAT ? -WIN : 0;
  const board = boardOf(s);
  let free = 0;
  for (const p in s.pieces) {
    if (s.pieces[p] !== TIGER) continue;
    if (board.neighbours[p]!.some((n) => s.pieces[n] === undefined)) free++;
    else if (board.jumps[p]!.some((j) => s.pieces[j.over] === GOAT && s.pieces[j.to] === undefined))
      free++;
  }
  return goatsTaken(s) * 1000 + free * 120;
}

/** Lau kata kati for seat 0: the difference in pieces. */
function lauScore(s: GameState): number {
  if (s.winner !== null) return s.winner === 0 ? WIN : s.winner === 2 ? -WIN : 0;
  const counts = countPieces(s);
  return (counts[0] - counts[2]) * 100;
}

/**
 * Plain alpha-beta `depth` plies deep over the real rules, for the two-sided games whose rules
 * the fast search below does not know. `score` rates a position for seat 0, who maximises.
 * Ties are broken at random. With a node `budget` it deepens one ply at a time and keeps the
 * deepest search that finished inside it; without one it searches `depth` straight away.
 */
function plain(
  s: GameState,
  moves: Move[],
  depth: number,
  score: (s: GameState) => number,
  budget = Infinity,
): Move {
  let nodes = 0;
  const search = (st: GameState, d: number, alpha: number, beta: number): number => {
    if (++nodes > budget) throw new OutOfBudget();
    if (d === 0 || st.winner !== null)
      return score(st) + (st.winner === null ? 0 : d * Math.sign(score(st)));
    const max = st.turn === 0;
    let best = max ? -Infinity : Infinity;
    for (const m of legalMoves(st)) {
      const v = search(applyLegalMove(st, m), d - 1, alpha, beta);
      if (max ? v > best : v < best) best = v;
      if (max) alpha = Math.max(alpha, v);
      else beta = Math.min(beta, v);
      if (alpha >= beta) break;
    }
    return best;
  };
  const sign = s.turn === 0 ? 1 : -1;
  let chosen = pick(moves); // if even one ply does not fit the budget
  for (let d = Number.isFinite(budget) ? 1 : depth; d <= depth; d++) {
    let best: Move[] = [];
    let bestV = -Infinity;
    try {
      for (const m of moves) {
        const v = sign * search(applyLegalMove(s, m), d - 1, -Infinity, Infinity);
        if (v > bestV) [best, bestV] = [[m], v];
        else if (v === bestV) best.push(m);
      }
    } catch (e) {
      if (e instanceof OutOfBudget) break;
      throw e;
    }
    chosen = pick(best);
  }
  return chosen;
}

/** Index-based board tables shared by medium's exposure count and hard's search. */
interface Tables {
  board: Board;
  at: (id: PointId) => number;
  size: number;
  nb: number[][];
  /** jp[from] holds pairs: over, to. */
  jp: number[][];
  /** Every three consecutive points on a line: a, b, c. */
  triples: number[];
}

function makeTables(board: Board): Tables {
  const ids = board.points.map((p) => p.id);
  const index = new Map(ids.map((id, i) => [id, i]));
  const at = (id: PointId) => index.get(id)!;
  const jp: number[][] = ids.map(() => []);
  const triples: number[] = [];
  for (const line of board.lines) {
    for (let i = 0; i + 2 < line.length; i++) {
      const [a, b, c] = [at(line[i]!), at(line[i + 1]!), at(line[i + 2]!)];
      jp[a]!.push(b, c);
      jp[c]!.push(b, a);
      triples.push(a, b, c);
    }
  }
  const nb = ids.map((id) => board.neighbours[id]!.map(at));
  return { board, at, size: ids.length, nb, jp, triples };
}

const TABLES = Object.fromEntries(
  Object.values(BOARDS).map((b) => [b.id, makeTables(b)]),
) as Record<BoardId, Tables>;

const EMPTY = -1;

function toBoard(pieces: Record<PointId, Seat>, { size, at }: Tables): Int8Array {
  const board = new Int8Array(size).fill(EMPTY);
  for (const id in pieces) board[at(id)] = pieces[id]!;
  return board;
}

/** How many of `seat`'s pieces some other seat could jump right now. */
function exposed(board: Int8Array, seat: number, triples: number[]): number {
  let hit = 0;
  const seen = new Set<number>();
  for (let i = 0; i < triples.length; i += 3) {
    const b = triples[i + 1]!;
    if (board[b] !== seat || seen.has(b)) continue;
    const pa = board[triples[i]!]!;
    const pc = board[triples[i + 2]!]!;
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
function medium(s: GameState, moves: Move[], tables: Tables): Choice {
  const me = s.turn;
  const before = countPieces(s);
  const score = (next: GameState): number => {
    if (next.winner === me) return WIN;
    const after = countPieces(next);
    let captured = 0;
    for (const seat of s.seats) if (seat !== me) captured += before[seat] - after[seat];
    return captured - exposed(toBoard(next.pieces, tables), me, tables.triples);
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
function hard(s: GameState, rootMoves: Move[], tables: Tables, budget: number): Choice {
  const { at, nb: NB, jp: JP, triples } = tables;
  const me = s.turn;
  const seats = s.seats;
  const board = toBoard(s.pieces, tables);
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
    return (counts[me]! - avg) * 100 - exposed(board, me, triples) * 30 + mobility;
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
  const over = (m: Move) => jumpedPoint(m, tables.board);
  const ordered = [
    ...rootMoves.filter((m) => over(m) !== null),
    ...rootMoves.filter((m) => over(m) === null),
  ];
  const roots: [Choice, number][] = ordered.map((m) => {
    const o = over(m);
    return [m, pack(at(m.from), at(m.to), o === null ? -1 : at(o))];
  });
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
