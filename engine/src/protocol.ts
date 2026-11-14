import type { AiLevel, BoardId, GameState, PointId, Seat } from './types.ts';

// HTTP
//   POST /api/rooms           body CreateRoomRequest, returns CreateRoomResponse
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
  look: Look; // the host picks it any time; cosmetic only
  seats: SeatInfo[]; // always 4 entries
  game: GameState | null;
  turnDeadline: number | null; // epoch ms
}

/**
 * Client to server. `playerId` is a random id the client keeps in localStorage;
 * rejoining with the same id restores the seat.
 */
export type ClientMessage =
  | { t: 'join'; playerId: string; name: string }
  | { t: 'sit'; seat: Seat }
  | { t: 'stand' }
  | { t: 'set-ai'; seat: Seat; level: AiLevel | null }
  | { t: 'set-board'; board: BoardId } // host, lobby only; seats the board lacks are cleared
  | { t: 'set-look'; look: Look } // host, any phase; cosmetic only
  | { t: 'start' }
  | { t: 'move'; from: PointId; to: PointId }
  | { t: 'end-chain' }
  | { t: 'rematch' };

/** Server to client. `state` is sent after every change. */
export type ServerMessage =
  | { t: 'state'; room: RoomState; you: { playerId: string; seat: Seat | null } }
  | { t: 'error'; code: string };
