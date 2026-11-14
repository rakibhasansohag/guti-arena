import type { BoardId, Seat } from '@guti-arena/engine';
import { useT } from '@/i18n';
import { SEAT_COLOUR_NAME } from '@/share/seat-colours';

/** What to call a seat on a board: its colour, or its side in Bagh-chal (tigers and goats). */
export function useSeatName(board: BoardId | undefined): (seat: Seat) => string {
  const t = useT('game');
  return (seat) =>
    board === 'bagh'
      ? t(seat === 0 ? 'bagh.tigers' : 'bagh.goats')
      : t(`colour.${SEAT_COLOUR_NAME[seat]}`);
}
