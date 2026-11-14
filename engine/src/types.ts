export type Seat = 0 | 1 | 2 | 3; // north blue, east yellow, south white, west red (clockwise)
export type PointId = string; // "g-r-c" for grid, "t-<n|e|s|w>-<m|b>-<0|1|2>" for triangle points

/** Which board a game is played on: 'four' is the four-colour board, the others are two-player. */
export type BoardId = 'four' | 'classic' | 'quick';

export interface Move {
  from: PointId;
  to: PointId;
}

export interface GameState {
  board?: BoardId; // missing means 'four' (games saved before boards existed)
  seats: Seat[]; // seats in play, clockwise
  pieces: Record<PointId, Seat>; // occupied points only
  turn: Seat;
  chainFrom: PointId | null; // set while a piece is mid multi-jump
  quietRounds: number; // full rounds since the last capture
  winner: Seat | 'draw' | null;
}

export type AiLevel = 'easy' | 'medium' | 'hard';
