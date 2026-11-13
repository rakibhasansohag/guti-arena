import { describe, expect, it } from 'vitest';
import { CENTRE, LINES, NEIGHBOURS, POINTS, startPoints } from '../src/board.ts';
import type { Seat } from '../src/types.ts';

const SEATS: Seat[] = [0, 1, 2, 3];
const ids = new Set(POINTS.map((p) => p.id));
const at = Object.fromEntries(POINTS.map((p) => [p.id, p]));

describe('board', () => {
  it('has 73 unique points', () => {
    expect(POINTS).toHaveLength(73);
    expect(ids.size).toBe(73);
  });

  it('has symmetric neighbours with no self or duplicate links', () => {
    expect(new Set(Object.keys(NEIGHBOURS))).toEqual(ids);
    for (const [a, list] of Object.entries(NEIGHBOURS)) {
      expect(new Set(list).size).toBe(list.length);
      for (const b of list) {
        expect(b).not.toBe(a);
        expect(NEIGHBOURS[b]).toContain(a);
      }
    }
  });

  it('only links nearby points and has the expected edge count', () => {
    let ends = 0;
    for (const [a, list] of Object.entries(NEIGHBOURS)) {
      for (const b of list) {
        // triangle base-row steps are 1.5 units, the longest edge on the board
        expect(Math.hypot(at[a]!.x - at[b]!.x, at[a]!.y - at[b]!.y)).toBeLessThanOrEqual(1.5);
      }
      ends += list.length;
    }
    // grid 2 * 7 * 6 = 84 edges; per triangle 3 from the apex, 3 middle-to-base, 2 + 2 along rows
    expect(ends / 2).toBe(84 + 4 * 10);
  });

  it('keeps every line straight, with the middle row and column 11 long', () => {
    expect(LINES).toHaveLength(7 + 7 + 4 * 4);
    for (const line of LINES) {
      const [p, q] = [at[line[0]!]!, at[line[1]!]!];
      for (const id of line) {
        const r = at[id]!;
        // cross product zero: r lies on the line through p and q
        expect(Math.abs((q.x - p.x) * (r.y - p.y) - (q.y - p.y) * (r.x - p.x))).toBeLessThan(1e-9);
      }
    }
    expect(LINES.filter((l) => l.length === 11)).toHaveLength(2);
  });

  it('splits start points cleanly four ways, leaving only the centre empty', () => {
    const all = SEATS.flatMap((s) => startPoints(s));
    for (const s of SEATS) expect(startPoints(s)).toHaveLength(18);
    expect(new Set(all).size).toBe(72);
    const gridStarts = all.filter((p) => p.startsWith('g-'));
    expect(gridStarts).toHaveLength(48);
    expect(gridStarts).not.toContain(CENTRE);
    expect(new Set([...all, CENTRE])).toEqual(ids);
  });

  it('places north on its triangle and rows 0 to 2, and rotates clockwise', () => {
    expect(startPoints(0)).toEqual(
      expect.arrayContaining(['t-n-b-0', 't-n-m-2', 'g-0-0', 'g-0-5', 'g-1-1', 'g-2-3']),
    );
    expect(startPoints(1)).toEqual(expect.arrayContaining(['t-e-b-1', 'g-0-6', 'g-5-6']));
    expect(at['t-e-m-1']).toMatchObject({ x: 7, y: 3 });
    expect(at['t-s-b-1']).toMatchObject({ x: 3, y: 8 });
    expect(at['t-w-b-1']).toMatchObject({ x: -2, y: 3 });
  });
});
