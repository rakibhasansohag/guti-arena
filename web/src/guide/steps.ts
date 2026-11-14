import { BOARDS, type BoardId, type PointId, type Seat } from '@guti-arena/engine';
import type { DiagramSpec } from '@/game/diagram';

/** Every seat's start points on a board. */
function start(board: BoardId): Record<PointId, Seat> {
  const b = BOARDS[board];
  return Object.fromEntries(b.seats.flatMap((s) => b.start[s].map((p) => [p, s])));
}

type Step = DiagramSpec & { key: string };
type View = DiagramSpec['view'];

/** The 5 by 5 grid of the two-player boards, without the triangles. */
const GRID: View = [-0.6, -0.6, 5.2, 5.2];

/** Moving, capturing and winning look the same on the classic and the quick board. */
const fiveSteps = (board: BoardId): Step[] => [
  { key: 'setup', pieces: start(board) },
  {
    key: 'move',
    view: GRID,
    pieces: { 'g-2-2': 0 },
    arrows: ['g-1-1', 'g-1-2', 'g-1-3', 'g-2-1', 'g-2-3', 'g-3-1', 'g-3-2', 'g-3-3'].map((to) => ({
      from: 'g-2-2',
      to,
    })),
  },
  {
    key: 'capture',
    view: GRID,
    pieces: { 'g-2-0': 0 },
    ghosts: { 'g-2-1': 2 },
    arrows: [{ from: 'g-2-0', to: 'g-2-2' }],
  },
  {
    key: 'chain',
    view: GRID,
    pieces: { 'g-2-0': 0 },
    ghosts: { 'g-2-1': 2, 'g-3-3': 2 },
    arrows: [
      { from: 'g-2-0', to: 'g-2-2' },
      { from: 'g-2-2', to: 'g-4-4' },
    ],
  },
  { key: 'win', view: GRID, pieces: { 'g-1-1': 0, 'g-2-3': 0, 'g-3-2': 0 } },
];

const lau = start('lau');

/** The pictures of each game's guide, in reading order. The words are in `content.<lang>.ts`. */
export const STEPS: Record<BoardId, Step[]> = {
  four: [
    { key: 'setup', pieces: start('four') },
    {
      key: 'move',
      view: [0.9, 0.9, 4.2, 4.2],
      pieces: { 'g-3-3': 0, 'g-2-2': 1, 'g-4-4': 3 },
      arrows: ['g-2-3', 'g-3-4', 'g-4-3', 'g-3-2'].map((to) => ({ from: 'g-3-3', to })),
    },
    {
      key: 'capture',
      view: [-0.6, 1.8, 5.2, 2.4],
      pieces: { 'g-3-0': 0 },
      ghosts: { 'g-3-1': 3 },
      arrows: [{ from: 'g-3-0', to: 'g-3-2' }],
    },
    {
      key: 'chain',
      view: [0.4, 0.2, 5.2, 2.4],
      pieces: { 'g-1-1': 0 },
      ghosts: { 'g-1-2': 1, 'g-1-4': 1 },
      arrows: [
        { from: 'g-1-1', to: 'g-1-3' },
        { from: 'g-1-3', to: 'g-1-5' },
      ],
    },
    {
      key: 'triangle',
      view: [0.6, -2.7, 4.8, 3.6],
      pieces: { 'g-0-3': 0 },
      ghosts: { 't-n-m-0': 3 },
      arrows: [{ from: 'g-0-3', to: 't-n-b-0' }],
    },
    {
      key: 'win',
      view: [0.4, 0.4, 5.2, 5.2],
      pieces: { 'g-1-2': 0, 'g-2-4': 0, 'g-3-1': 0, 'g-4-3': 0 },
    },
  ],
  three: [
    { key: 'setup', pieces: start('three') },
    {
      key: 'move',
      pieces: { 'g-3-3': 0 },
      arrows: ['g-3-4', 'g-3-2', 'g-4-3', 'g-2-3', 'g-2-4', 'g-4-2'].map((to) => ({
        from: 'g-3-3',
        to,
      })),
    },
    {
      key: 'capture',
      pieces: { 'g-3-1': 0 },
      ghosts: { 'g-3-2': 1 },
      arrows: [{ from: 'g-3-1', to: 'g-3-3' }],
    },
    {
      key: 'chain',
      pieces: { 'g-3-1': 0 },
      ghosts: { 'g-3-2': 1, 'g-2-4': 2 },
      arrows: [
        { from: 'g-3-1', to: 'g-3-3' },
        { from: 'g-3-3', to: 'g-1-5' },
      ],
    },
    { key: 'win', pieces: { 'g-2-3': 0, 'g-3-4': 0, 'g-4-2': 0 } },
  ],
  classic: fiveSteps('classic'),
  quick: fiveSteps('quick'),
  lau: [
    { key: 'setup', pieces: lau },
    { key: 'first', pieces: lau, arrows: [{ from: 'g-4-3', to: 'g-3-3' }] },
    {
      key: 'capture',
      pieces: Object.fromEntries(Object.entries(lau).filter(([p]) => p !== 'g-4-3')),
      ghosts: { 'g-3-3': 2 },
      arrows: [{ from: 'g-2-3', to: 'g-4-3' }],
    },
    { key: 'win', pieces: { 'g-2-3': 0, 'g-1-1': 0, 'g-3-3': 0 } },
  ],
  bagh: [
    { key: 'setup', pieces: start('bagh') },
    {
      key: 'place',
      pieces: { ...start('bagh'), 'g-2-2': 2 },
      rings: ['g-1-2', 'g-2-1', 'g-2-3', 'g-3-2'],
    },
    {
      key: 'hunt',
      pieces: { 'g-0-0': 0, 'g-4-4': 0 },
      ghosts: { 'g-1-1': 2 },
      arrows: [{ from: 'g-0-0', to: 'g-2-2' }],
    },
    { key: 'safe', pieces: { 'g-0-0': 0, 'g-0-1': 2, 'g-0-2': 2, 'g-1-0': 2, 'g-2-0': 2 } },
    {
      key: 'trap',
      pieces: {
        'g-0-0': 0,
        'g-0-1': 2,
        'g-1-0': 2,
        'g-1-1': 2,
        'g-0-2': 2,
        'g-2-0': 2,
        'g-2-2': 2,
      },
    },
  ],
};
