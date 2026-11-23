import type { AiLevel, BoardId, GameState, PointId, Seat } from './types.ts';

// HTTP
//   POST /api/rooms           body CreateRoomRequest, returns CreateRoomResponse
//   GET  /api/rooms           returns RoomListResponse: public and locked rooms with someone connected
//   GET  /api/rooms/live      upgrades to a WebSocket that sends a RoomListResponse now and on every change
//   GET  /api/rooms/:code/ws  upgrades to a WebSocket carrying the JSON messages below

/** Court surfaces and piece sets. Cosmetic only: rules never read them. */
export const COURTS = ['earth', 'wood', 'kantha', 'slate', 'sand', 'night'] as const;
export const PIECE_SETS = ['pebbles', 'foods', 'bhar', 'marbles', 'buttons', 'shells'] as const;
export type CourtId = (typeof COURTS)[number];
export type PieceSetId = (typeof PIECE_SETS)[number];

export interface Look {
  court: CourtId;
  pieces: PieceSetId;
}

export const DEFAULT_LOOK: Look = { court: 'earth', pieces: 'pebbles' };

/** A well-formed look, copied without any extra fields; null otherwise. */
export function parseLook(x: unknown): Look | null {
  if (typeof x !== 'object' || x === null) return null;
  const { court, pieces } = x as Record<string, unknown>;
  return (COURTS as readonly unknown[]).includes(court) &&
    (PIECE_SETS as readonly unknown[]).includes(pieces)
    ? { court: court as CourtId, pieces: pieces as PieceSetId }
    : null;
}

/** Who can find and enter a room. Private rooms are link-only; public and locked rooms are listed. */
export const ACCESS = ['private', 'public', 'locked'] as const;
export type Access = (typeof ACCESS)[number];
export const PASSWORD_MAX = 32;

/** Preset reactions. Ids only: each client draws the emoji art and words in its own language. */
export const REACTIONS = [
  'hello',
  'haha',
  'nice',
  'wow',
  'gg',
  'fire',
  'sorry',
  'oops',
  'sad',
  'noo',
  'hurry',
  'thinking',
  'watch-out',
  'my-turn',
  'too-easy',
  'gotcha',
] as const;
export type ReactionId = (typeof REACTIONS)[number];

export interface CreateRoomRequest {
  turnstileToken: string;
}

export interface CreateRoomResponse {
  code: string; // 5 letters, no vowels
}

export interface SeatInfo {
  seat: Seat;
  kind: 'empty' | 'human' | 'ai';
  name: string;
  connected: boolean;
  level: AiLevel | null;
}

export interface RoomState {
  code: string;
  phase: 'lobby' | 'playing' | 'ended';
  hostId: string;
  board: BoardId; // the host picks it in the lobby
  look: Look; // the host picks it in the lobby; cosmetic only
  seats: SeatInfo[]; // always 4 entries
  game: GameState | null;
  turnDeadline: number | null; // epoch ms
  access: Access; // the host picks it in the lobby; 'locked' needs a password to join
  watchers: number; // connected people in the room without a seat
  // Before a successful join, a locked room sends sockets a RoomState with game: null,
  // turnDeadline: null and every seat { kind: 'empty', name: '' }.
}

/** One row of GET /api/rooms. Only public and locked rooms with someone connected are listed. */
export interface RoomListing {
  code: string;
  board: BoardId;
  phase: RoomState['phase'];
  access: 'public' | 'locked';
  host: string; // the host's name
  seated: number; // seats held by a person
  ai: number; // seats held by an AI
  seats: number; // seats the board has
  watchers: number;
  look: Look;
}
export interface RoomListResponse {
  rooms: RoomListing[];
}

/**
 * Client to server. `playerId` is a random id the client keeps in localStorage;
 * rejoining with the same id restores the seat.
 */
export type ClientMessage =
  | { t: 'join'; playerId: string; name: string; password?: string } // password: only for a locked room the player has not joined before
  | { t: 'sit'; seat: Seat }
  | { t: 'stand' }
  | { t: 'set-ai'; seat: Seat; level: AiLevel | null }
  | { t: 'set-board'; board: BoardId } // host, lobby only; seats the board lacks are cleared
  | { t: 'set-look'; look: Look } // host, lobby only; cosmetic
  | { t: 'set-access'; access: Access; password?: string } // host, lobby only; password required for 'locked'
  | { t: 'react'; id: ReactionId } // seated players only, any phase, about 1 a second
  | { t: 'remove'; seat: Seat } // host, lobby only: the person in that seat leaves and can't come back
  | { t: 'start' }
  | { t: 'move'; from: PointId; to: PointId }
  | { t: 'end-chain' }
  | { t: 'rematch' };

/**
 * Server to client. `state` is sent after every change.
 * Error codes added for rooms: 'need-password', 'wrong-password', 'password-required', 'not-seated',
 * 'removed' (the host removed this person; the socket closes), 'cannot-remove'.
 */
export type ServerMessage =
  | { t: 'state'; room: RoomState; you: { playerId: string; seat: Seat | null } }
  | { t: 'reaction'; seat: Seat; id: ReactionId }
  | { t: 'error'; code: string };
