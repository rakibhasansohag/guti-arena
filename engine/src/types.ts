export type Seat = 0 | 1 | 2 | 3; // north blue, east yellow, south white, west red (clockwise)
export type PointId = string; // "g-r-c" for grid, "t-<n|e|s|w>-<m|b>-<0|1|2>" for triangle points

export interface Move {
  from: PointId;
  to: PointId;
}

export interface GameState {
  seats: Seat[]; // seats in play, clockwise
  pieces: Record<PointId, Seat>; // occupied points only
  turn: Seat;
  chainFrom: PointId | null; // set while a piece is mid multi-jump
  quietRounds: number; // full rounds since the last capture
  winner: Seat | 'draw' | null;
}

export type AiLevel = 'easy' | 'medium' | 'hard';
