import type { BoardId } from '@guti-arena/engine';

/** The guide page of each game: `/how-to-play/<slug>`. */
export const GUIDE_SLUG: Record<BoardId, string> = {
  four: 'four-colours',
  three: 'three-corners',
  classic: 'sholo-guti',
  quick: 'quick-guti',
  lau: 'lau-kata-kati',
  bagh: 'bagh-chal',
};

export const guidePath = (board: BoardId) => `/how-to-play/${GUIDE_SLUG[board]}`;

export const boardOfSlug = (slug: string | undefined) =>
  (Object.keys(GUIDE_SLUG) as BoardId[]).find((id) => GUIDE_SLUG[id] === slug);
