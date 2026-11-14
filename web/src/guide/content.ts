import type { BoardId } from '@guti-arena/engine';

export interface GuideText {
  name: string;
  seoTitle: string;
  seoDescription: string;
  title: string;
  intro: string;
  /** Words for each picture in `STEPS`, by step key. */
  steps: Record<string, { title: string; body: string; alt: string }>;
  tips: string[];
  faq: { q: string; a: string }[];
}

export interface GuideContent {
  ui: Record<
    'hubTitle' | 'steps' | 'tips' | 'faq' | 'play' | 'friends' | 'others' | 'all' | 'read',
    string
  >;
  games: Record<BoardId, GuideText>;
}
