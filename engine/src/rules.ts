import type { GameState, Move, Seat } from './types.ts';

// Contract stubs; chat A implements these.

export function createGame(_seats: Seat[]): GameState {
  throw new Error('not implemented');
}

export function legalMoves(_s: GameState): Move[] {
  throw new Error('not implemented');
}

/** Throws on an illegal move. */
export function applyMove(_s: GameState, _m: Move): GameState {
  throw new Error('not implemented');
}

export function endChain(_s: GameState): GameState {
  throw new Error('not implemented');
}

export function countPieces(_s: GameState): Record<Seat, number> {
  throw new Error('not implemented');
}
