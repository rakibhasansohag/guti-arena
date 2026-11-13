import { expect, it } from 'vitest';
import { playMany } from './play.ts';

// Hard runs on a small search budget here so 200 games fit in a test run; ai.test.ts covers the default.
it('plays 200 full hard games across two, three and four seats without an error', () => {
  const ends = playMany('hard', 200, 400);
  expect(ends.every((s) => s.winner !== null)).toBe(true);
}, 600_000);
