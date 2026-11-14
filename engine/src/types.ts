export type Seat = 0 | 1 | 2 | 3; // north blue, east yellow, south white, west red (clockwise)
export type PointId = string; // "g-r-c" for grid, "t-<n|e|s|w>-<m|b>-<0|1|2>" for triangle points

/**
 * Which board a game is played on: 'four' is the four-colour board, 'three' the three-player
 * hexagon, the others are two-player. 'bagh' is Bagh-chal: tigers (seat 0) against goats (seat 2).
 */
export type BoardId = 'four' | 'three' | 'classic' | 'quick' | 'lau' | 'bagh';

export interface Move {
  from: PointId; // `HAND` when a goat is placed in Bagh-chal
  to: PointId;
}

/** A move's `from` when a piece comes from the hand, not from a point. */
export const HAND: PointId = 'hand';

export interface GameState {
  board?: BoardId; // missing means 'four' (games saved before boards existed)
  seats: Seat[]; // seats in play, clockwise
  pieces: Record<PointId, Seat>; // occupied points only
  turn: Seat;
  chainFrom: PointId | null; // set while a piece is mid multi-jump
  quietRounds: number; // full rounds since the last capture
  inHand?: number; // Bagh-chal only: goats not yet placed
  winner: Seat | 'draw' | null;
}

export type AiLevel = 'easy' | 'medium' | 'hard';
