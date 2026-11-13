import { expect, it } from 'vitest';
import { playMany } from './play.ts';

it('plays 200 full easy games across two, three and four seats without an error', () => {
  const ends = playMany('easy', 200);
  expect(ends.every((s) => s.winner !== null)).toBe(true);
}, 600_000);
