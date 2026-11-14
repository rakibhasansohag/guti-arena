import type { BoardId } from '@guti-arena/engine';

export interface GuideText {
  name: string;
  seoTitle: string;
  seoDescription: string;
  title: string;
  intro: string;
  /** Words for each picture in `STEPS`, by step key. */
  steps: Record<string, { title: string; body: string; alt: string }>;
  /** What to do in the playable lesson. */
  lesson: string;
  tips: string[];
  faq: { q: string; a: string }[];
}

export interface GuideContent {
  ui: Record<
    | 'hubTitle'
    | 'steps'
    | 'tips'
    | 'faq'
    | 'play'
    | 'friends'
    | 'others'
    | 'all'
    | 'read'
    | 'lessonTitle'
    | 'lessonDone'
    | 'lessonMissed'
    | 'lessonAgain'
    | 'you',
    string
  >;
  games: Record<BoardId, GuideText>;
}
