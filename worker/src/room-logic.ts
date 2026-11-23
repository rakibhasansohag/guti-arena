import {
  BOARDS,
  applyMove,
  chooseMove,
  isBoardId,
  createGame,
  endChain,
  parseLook,
  DEFAULT_LOOK,
  type Access,
  type AiLevel,
  type BoardId,
  type ClientMessage,
  type GameState,
  type Look,
  type RoomState,
  type Seat,
  type SeatInfo,
} from '@guti-arena/engine';

export const TURN_MS = 30_000;
export const AI_DELAY_MS = 700;
export const COVER_AFTER_MS = 20_000;
/** How long the host can be gone (phone share sheet, reload) before another player is made host. */
export const HOST_GRACE_MS = 20_000;
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
  /** The first player who joined; gets the host back on return. Missing in older rooms: the host then. */
  ownerId?: string;
  players: Player[]; // join order, used to pass the host on
  ai: (AiLevel | null)[]; // per seat
  access?: Access; // missing in rooms saved before access existed: 'private'
  board?: BoardId; // missing in rooms saved before boards existed: 'four'
  look?: Look; // missing in rooms saved before looks existed: DEFAULT_LOOK
  game: GameState | null;
  turnDeadline: number | null;
}

export function newRoom(code: string): Room {
  return {
    code,
    phase: 'lobby',
    hostId: '',
    ownerId: '',
    players: [],
    ai: [null, null, null, null],
    board: 'four',
    look: DEFAULT_LOOK,
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
  const board = r.board ?? 'four';
  const watchers = r.players.filter((x) => x.connected && x.seat === null).length;
  return {
    code,
    phase,
    hostId,
    board,
    look: r.look ?? DEFAULT_LOOK,
    seats,
    game,
    turnDeadline,
    access: r.access ?? 'private',
    watchers,
  };
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
    case 'set-board':
      return isBoardId(m.board) ? { t: 'set-board', board: m.board } : null;
    case 'set-look': {
      const look = parseLook(m.look);
      return look ? { t: 'set-look', look } : null;
    }
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

const onBoard = (r: Room, seat: Seat) => BOARDS[r.board ?? 'four'].seats.includes(seat);
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
  r.ownerId ||= r.hostId; // rooms saved before owners existed (or still empty)
  passHost(r, now);

  if (m.t === 'join') {
    let p = r.players.find((x) => x.id === m.playerId);
    if (!p) {
      p = { id: m.playerId, name: '', seat: null, connected: true, goneAt: null };
      r.players.push(p);
    }
    p.name = cleanName(m.name);
    p.connected = true;
    p.goneAt = null;
    if (r.hostId === '') r.ownerId = r.hostId = p.id; // first joiner owns the room
    else if (p.id === r.ownerId) r.hostId = p.id; // the owner is back
    else passHost(r, now); // the host's grace may have run out while nobody else was here
    return null;
  }

  const p = r.players.find((x) => x.id === playerId);
  if (!p) return 'not-joined';
  const isHost = p.id === r.hostId;

  switch (m.t) {
    case 'sit':
      if (r.phase !== 'lobby') return 'not-lobby';
      if (p.seat === m.seat) return null;
      if (!onBoard(r, m.seat)) return 'seat-off-board';
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
      if (!onBoard(r, m.seat)) return 'seat-off-board';
      if (r.players.some((x) => x.seat === m.seat)) return 'seat-taken';
      r.ai[m.seat] = m.level;
      return null;
    case 'set-board':
      if (!isHost) return 'not-host';
      if (r.phase !== 'lobby') return 'not-lobby';
      r.board = m.board;
      // Players on seats the new board lacks stand up; AI there is removed.
      for (const x of r.players) if (x.seat !== null && !onBoard(r, x.seat)) x.seat = null;
      for (const seat of SEATS) if (!onBoard(r, seat)) r.ai[seat] = null;
      return null;
    case 'set-look':
      if (!isHost) return 'not-host';
      if (r.phase !== 'lobby') return 'not-lobby'; // the look stays for the whole game
      r.look = m.look;
      return null;
    case 'start': {
      if (!isHost) return 'not-host';
      if (r.phase !== 'lobby') return 'not-lobby';
      // The board sets the player count: every seat needs a player or an AI.
      const seats = BOARDS[r.board ?? 'four'].seats;
      if (!seats.every((s) => seatTaken(r, s))) return 'need-all-seats';
      r.game = createGame(seats, r.board ?? 'four');
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
    case 'set-access':
    case 'react':
      return 'bad-message'; // placeholder until chat A builds them
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

/** Mark a player's last socket closed. The host is passed on later, by `passHost`. */
export function disconnect(r: Room, playerId: string, now: number) {
  const p = r.players.find((x) => x.id === playerId);
  if (!p) return;
  p.connected = false;
  p.goneAt = now;
}

/** When the host passes to someone else: the host has been gone for the grace period and another player is here. */
export function hostDueAt(r: Room): number | null {
  const host = r.players.find((x) => x.id === r.hostId);
  if (!host || host.connected || host.goneAt === null) return null;
  return r.players.some((x) => x.connected) ? host.goneAt + HOST_GRACE_MS : null;
}

/** Pass the host to the first connected player (join order) once it is due. True when the host changed. */
export function passHost(r: Room, now: number): boolean {
  const due = hostDueAt(r);
  if (due === null || due > now) return false;
  const next = r.players.find((x) => x.connected);
  if (!next) return false;
  r.hostId = next.id;
  return true;
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
