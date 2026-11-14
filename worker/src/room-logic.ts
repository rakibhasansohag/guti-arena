import {
  applyMove,
  chooseMove,
  createGame,
  endChain,
  type AiLevel,
  type ClientMessage,
  type GameState,
  type RoomState,
  type Seat,
  type SeatInfo,
} from '@guti-arena/engine';

export const TURN_MS = 30_000;
export const AI_DELAY_MS = 700;
export const COVER_AFTER_MS = 20_000;
export const NAME_MAX = 20;
export const CODE_LETTERS = 'BCDFGHJKLMNPQRSTVWXYZ';
export const CODE_RE = /^[BCDFGHJKLMNPQRSTVWXYZ]{5}$/;

const SEATS: Seat[] = [0, 1, 2, 3];
const LEVELS: AiLevel[] = ['easy', 'medium', 'hard'];

export interface Player {
  id: string;
  name: string;
  seat: Seat | null;
  connected: boolean;
  /** When the player's last socket closed; null while connected. */
  goneAt: number | null;
}

/** Everything the room persists. The public `RoomState` is derived from it by `view`. */
export interface Room {
  code: string;
  phase: RoomState['phase'];
  hostId: string;
  players: Player[]; // join order, used to pass the host on
  ai: (AiLevel | null)[]; // per seat
  game: GameState | null;
  turnDeadline: number | null;
}

export function newRoom(code: string): Room {
  return {
    code,
    phase: 'lobby',
    hostId: '',
    players: [],
    ai: [null, null, null, null],
    game: null,
    turnDeadline: null,
  };
}

export function view(r: Room): RoomState {
  const seats = SEATS.map((seat): SeatInfo => {
    const p = r.players.find((x) => x.seat === seat);
    if (p) return { seat, kind: 'human', name: p.name, connected: p.connected, level: null };
    const level = r.ai[seat] ?? null;
    if (level) return { seat, kind: 'ai', name: '', connected: true, level };
    return { seat, kind: 'empty', name: '', connected: false, level: null };
  });
  const { code, phase, hostId, game, turnDeadline } = r;
  return { code, phase, hostId, seats, game, turnDeadline };
}

const graphemes = new Intl.Segmenter();

/** Strip control and bidi-override characters, then keep 20 characters. ZWJ and ZWNJ stay: Bangla needs them. */
export function cleanName(raw: string): string {
  const stripped = raw.replace(/[\p{Cc}\p{Bidi_Control}]/gu, '').trim();
  const name = [...graphemes.segment(stripped)]
    .slice(0, NAME_MAX)
    .map((x) => x.segment)
    .join('')
    .trim();
  return name || 'Player';
}

const isSeat = (x: unknown): x is Seat => x === 0 || x === 1 || x === 2 || x === 3;
const isStr = (x: unknown, max: number): x is string =>
  typeof x === 'string' && x.length > 0 && x.length <= max;

/** Validate an untrusted message. Returns null when it is not a well-formed `ClientMessage`. */
export function parseMessage(raw: string): ClientMessage | null {
  let m: Record<string, unknown>;
  try {
    m = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return null;
  }
  if (typeof m !== 'object' || m === null) return null;
  switch (m.t) {
    case 'join':
      return isStr(m.playerId, 64) && typeof m.name === 'string'
        ? { t: 'join', playerId: m.playerId, name: m.name }
        : null;
    case 'sit':
      return isSeat(m.seat) ? { t: 'sit', seat: m.seat } : null;
    case 'set-ai':
      return isSeat(m.seat) && (m.level === null || LEVELS.includes(m.level as AiLevel))
        ? { t: 'set-ai', seat: m.seat, level: m.level as AiLevel | null }
        : null;
    case 'move':
      return isStr(m.from, 16) && isStr(m.to, 16) ? { t: 'move', from: m.from, to: m.to } : null;
    case 'stand':
    case 'start':
    case 'end-chain':
    case 'rematch':
      return { t: m.t };
    default:
      return null;
  }
}

const seatTaken = (r: Room, seat: Seat) =>
  r.players.some((p) => p.seat === seat) || r.ai[seat] != null;

/**
 * Apply one client message from `playerId` (null before `join`). Mutates `r`.
 * Returns an error code, or null when the room changed.
 */
export function handle(
  r: Room,
  playerId: string | null,
  m: ClientMessage,
  now: number,
): string | null {
  if (m.t === 'join') {
    let p = r.players.find((x) => x.id === m.playerId);
    if (!p) {
      p = { id: m.playerId, name: '', seat: null, connected: true, goneAt: null };
      r.players.push(p);
    }
    p.name = cleanName(m.name);
    p.connected = true;
    p.goneAt = null;
    if (!r.players.find((x) => x.id === r.hostId)?.connected) r.hostId = p.id;
    return null;
  }

  const p = r.players.find((x) => x.id === playerId);
  if (!p) return 'not-joined';
  const isHost = p.id === r.hostId;

  switch (m.t) {
    case 'sit':
      if (r.phase !== 'lobby') return 'not-lobby';
      if (p.seat === m.seat) return null;
      if (seatTaken(r, m.seat)) return 'seat-taken';
      p.seat = m.seat;
      return null;
    case 'stand':
      if (r.phase !== 'lobby') return 'not-lobby';
      p.seat = null;
      return null;
    case 'set-ai':
      if (!isHost) return 'not-host';
      if (r.phase !== 'lobby') return 'not-lobby';
      if (r.players.some((x) => x.seat === m.seat)) return 'seat-taken';
      r.ai[m.seat] = m.level;
      return null;
    case 'start': {
      if (!isHost) return 'not-host';
      if (r.phase !== 'lobby') return 'not-lobby';
      const filled = SEATS.filter((s) => seatTaken(r, s));
      if (filled.length < 2) return 'need-two-seats';
      r.game = createGame(filled);
      r.phase = 'playing';
      r.turnDeadline = now + TURN_MS;
      return null;
    }
    case 'move':
    case 'end-chain': {
      if (r.phase !== 'playing' || !r.game) return 'not-playing';
      if (p.seat !== r.game.turn) return 'not-your-turn';
      try {
        setGame(r, m.t === 'move' ? applyMove(r.game, m) : endChain(r.game), now);
      } catch {
        return 'illegal-move';
      }
      return null;
    }
    case 'rematch':
      if (!isHost) return 'not-host';
      if (r.phase !== 'ended') return 'not-ended';
      r.phase = 'lobby';
      r.game = null;
      r.turnDeadline = null;
      return null;
  }
}

function setGame(r: Room, g: GameState, now: number) {
  r.game = g;
  if (g.winner !== null) {
    r.phase = 'ended';
    r.turnDeadline = null;
  } else {
    r.turnDeadline = now + TURN_MS;
  }
}

/** Mark a player's last socket closed and pass the host on if needed. */
export function disconnect(r: Room, playerId: string, now: number) {
  const p = r.players.find((x) => x.id === playerId);
  if (!p) return;
  p.connected = false;
  p.goneAt = now;
  if (r.hostId === p.id) {
    const next = r.players.find((x) => x.connected);
    if (next) r.hostId = next.id;
  }
}

/** When the seat on turn should be played by the server, or null if a human is expected to move. */
export function botDueAt(r: Room): number | null {
  const g = r.game;
  if (r.phase !== 'playing' || !g || r.turnDeadline === null) return null;
  // Nobody is watching: pause until someone comes back, then cleanup takes over.
  if (!r.players.some((x) => x.connected)) return null;
  const p = r.players.find((x) => x.seat === g.turn);
  const lastChange = r.turnDeadline - TURN_MS;
  if (!p) return lastChange + AI_DELAY_MS;
  if (p.connected || p.goneAt === null) return r.turnDeadline;
  return Math.min(r.turnDeadline, Math.max(lastChange + AI_DELAY_MS, p.goneAt + COVER_AFTER_MS));
}

/** Play one server move if one is due: an AI seat, a timed-out turn or a covered disconnect. */
export function tick(r: Room, now: number): boolean {
  const due = botDueAt(r);
  const g = r.game;
  if (due === null || due > now || !g) return false;
  // Timeouts and covered disconnects play at medium; AI seats at their own level.
  const level = r.players.some((x) => x.seat === g.turn) ? 'medium' : (r.ai[g.turn] ?? 'medium');
  const choice = chooseMove(g, level);
  setGame(r, choice === 'end-chain' ? endChain(g) : applyMove(g, choice), now);
  return true;
}

export function randomCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(5));
  return [...bytes].map((b) => CODE_LETTERS[b % CODE_LETTERS.length]).join('');
}
