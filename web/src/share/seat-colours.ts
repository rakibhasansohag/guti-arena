import type { Seat } from '@guti-arena/engine';

/** Piece colour per seat: 0 north blue, 1 east yellow, 2 south white, 3 west red. */
export const SEAT_FILL: Record<Seat, string> = {
  0: 'var(--color-piece-blue)',
  1: 'var(--color-piece-yellow)',
  2: 'var(--color-piece-white)',
  3: 'var(--color-piece-red)',
};

export const SEAT_COLOUR_NAME = { 0: 'blue', 1: 'yellow', 2: 'white', 3: 'red' } as const;
