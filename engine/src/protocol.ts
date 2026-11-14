import type { AiLevel, BoardId, GameState, PointId, Seat } from './types.ts';

// HTTP
//   POST /api/rooms           body CreateRoomRequest, returns CreateRoomResponse
//   GET  /api/rooms/:code/ws  upgrades to a WebSocket carrying the JSON messages below

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
  | { t: 'start' }
  | { t: 'move'; from: PointId; to: PointId }
  | { t: 'end-chain' }
  | { t: 'rematch' };

/** Server to client. `state` is sent after every change. */
export type ServerMessage =
  | { t: 'state'; room: RoomState; you: { playerId: string; seat: Seat | null } }
  | { t: 'error'; code: string };
