import { DEFAULT_LOOK, legalMoves, type ClientMessage } from '@guti-arena/engine';
import { describe, expect, it } from 'vitest';
import {
  AI_DELAY_MS,
  COVER_AFTER_MS,
  HOST_GRACE_MS,
  TURN_MS,
  botDueAt,
  cleanName,
  disconnect,
  handle,
  hostDueAt,
  newRoom,
  parseMessage,
  passHost,
  randomCode,
  CODE_RE,
  tick,
  view,
} from '../src/room-logic.ts';

const T0 = 1_000_000;

/** A two-player (classic board) lobby with host `a` at seat 0 and `b` at seat 2. */
function lobby() {
  const r = newRoom('BCDFG');
  const ok = (id: string, m: ClientMessage) => expect(handle(r, id, m, T0)).toBeNull();
  ok('a', { t: 'join', playerId: 'a', name: 'Ana' });
  ok('b', { t: 'join', playerId: 'b', name: 'Bo' });
  ok('a', { t: 'set-board', board: 'classic' });
  ok('a', { t: 'sit', seat: 0 });
  ok('b', { t: 'sit', seat: 2 });
  return r;
}

function playing() {
  const r = lobby();
  expect(handle(r, 'a', { t: 'start' }, T0)).toBeNull();
  return r;
}

describe('lobby', () => {
  it('makes the first joiner host and shows seats', () => {
    const r = lobby();
    expect(r.hostId).toBe('a');
    const seats = view(r).seats;
    expect(seats).toHaveLength(4);
    expect(seats[0]).toMatchObject({ kind: 'human', name: 'Ana', connected: true });
    expect(seats[1]).toMatchObject({ kind: 'empty' });
  });

  it('rejects messages before join and taken seats', () => {
    const r = lobby();
    expect(handle(r, null, { t: 'sit', seat: 1 }, T0)).toBe('not-joined');
    expect(handle(r, 'b', { t: 'sit', seat: 0 }, T0)).toBe('seat-taken');
    expect(handle(r, 'a', { t: 'set-ai', seat: 2, level: 'easy' }, T0)).toBe('seat-taken');
  });

  it('lets a player move seats and stand', () => {
    const r = lobby();
    handle(r, 'a', { t: 'set-board', board: 'four' }, T0);
    expect(handle(r, 'b', { t: 'sit', seat: 3 }, T0)).toBeNull();
    expect(view(r).seats[2]!.kind).toBe('empty');
    expect(handle(r, 'b', { t: 'stand' }, T0)).toBeNull();
    expect(view(r).seats[3]!.kind).toBe('empty');
  });

  it('only the host sets AI and starts, with every seat filled', () => {
    const r = newRoom('BCDFG');
    handle(r, 'a', { t: 'join', playerId: 'a', name: 'A' }, T0);
    handle(r, 'b', { t: 'join', playerId: 'b', name: 'B' }, T0);
    expect(handle(r, 'b', { t: 'set-ai', seat: 1, level: 'hard' }, T0)).toBe('not-host');
    handle(r, 'a', { t: 'sit', seat: 0 }, T0);
    expect(handle(r, 'a', { t: 'set-ai', seat: 1, level: 'hard' }, T0)).toBeNull();
    expect(handle(r, 'b', { t: 'sit', seat: 1 }, T0)).toBe('seat-taken');
    expect(handle(r, 'a', { t: 'set-ai', seat: 2, level: 'easy' }, T0)).toBeNull();
    expect(handle(r, 'a', { t: 'start' }, T0)).toBe('need-all-seats');
    expect(handle(r, 'a', { t: 'set-ai', seat: 3, level: 'easy' }, T0)).toBeNull();
    expect(handle(r, 'b', { t: 'start' }, T0)).toBe('not-host');
    expect(handle(r, 'a', { t: 'start' }, T0)).toBeNull();
    expect(r.game?.seats).toEqual([0, 1, 2, 3]);
    expect(r.turnDeadline).toBe(T0 + TURN_MS);
  });

  it('restores the seat on rejoin', () => {
    const r = lobby();
    disconnect(r, 'a', T0);
    expect(view(r).seats[0]).toMatchObject({ kind: 'human', connected: false });
    expect(handle(r, 'a', { t: 'join', playerId: 'a', name: 'Ana' }, T0)).toBeNull();
    expect(view(r).seats[0]).toMatchObject({ kind: 'human', connected: true });
  });
});

describe('host', () => {
  const rejoin = (r: ReturnType<typeof lobby>, id: string, now: number) =>
    handle(r, id, { t: 'join', playerId: id, name: id }, now);

  it('keeps the host when the host drops and rejoins within the grace period', () => {
    const r = lobby();
    disconnect(r, 'a', T0);
    expect(hostDueAt(r)).toBe(T0 + HOST_GRACE_MS);
    expect(r.hostId).toBe('a');
    // b acts just before the grace ends: nothing changes.
    expect(handle(r, 'b', { t: 'sit', seat: 2 }, T0 + HOST_GRACE_MS - 1)).toBeNull();
    expect(r.hostId).toBe('a');
    expect(rejoin(r, 'a', T0 + HOST_GRACE_MS - 1)).toBeNull();
    expect(r.hostId).toBe('a');
    expect(hostDueAt(r)).toBeNull();
  });

  it('passes the host after the grace period, on the next message or alarm', () => {
    const r = lobby();
    disconnect(r, 'a', T0);
    expect(passHost(r, T0 + HOST_GRACE_MS - 1)).toBe(false);
    handle(r, 'b', { t: 'sit', seat: 2 }, T0 + HOST_GRACE_MS + 5000);
    expect(r.hostId).toBe('b');
    expect(handle(r, 'b', { t: 'set-look', look: DEFAULT_LOOK }, T0 + 25_000)).toBeNull(); // host-only

    const r2 = lobby();
    disconnect(r2, 'a', T0);
    expect(passHost(r2, hostDueAt(r2)!)).toBe(true);
    expect(r2.hostId).toBe('b');
    expect(hostDueAt(r2)).toBeNull();
  });

  it('gives the host back to the owner who returns', () => {
    const r = lobby();
    disconnect(r, 'a', T0);
    handle(r, 'b', { t: 'sit', seat: 2 }, T0 + 25_000);
    expect(r.hostId).toBe('b');
    expect(rejoin(r, 'a', T0 + 40_000)).toBeNull();
    expect(r.hostId).toBe('a');
    // A returning non-owner does not take it.
    disconnect(r, 'b', T0 + 41_000);
    rejoin(r, 'b', T0 + 42_000);
    expect(r.hostId).toBe('a');
  });

  it('changes nothing when a guest disconnects, and never passes to nobody', () => {
    const r = lobby();
    disconnect(r, 'b', T0);
    expect(hostDueAt(r)).toBeNull();
    expect(handle(r, 'a', { t: 'sit', seat: 0 }, T0 + 60_000)).toBeNull();
    expect(r.hostId).toBe('a');
    disconnect(r, 'a', T0 + 61_000);
    expect(hostDueAt(r)).toBeNull(); // nobody is connected to take it
    expect(passHost(r, T0 + 120_000)).toBe(false);
    expect(r.hostId).toBe('a');
  });

  it('works for a room saved before owners existed', () => {
    const r = lobby();
    delete r.ownerId;
    disconnect(r, 'a', T0);
    handle(r, 'b', { t: 'sit', seat: 2 }, T0 + 25_000);
    expect(r.hostId).toBe('b');
    expect(r.ownerId).toBe('a'); // the host when first read, before the pass
    expect(rejoin(r, 'a', T0 + 30_000)).toBeNull();
    expect(r.hostId).toBe('a');
    expect(view(r)).toMatchObject({ access: 'private', watchers: 0 });
  });
});

describe('playing', () => {
  it('enforces turns and rejects illegal moves', () => {
    const r = playing();
    const g = r.game!;
    expect(g.turn).toBe(0);
    const legal = legalMoves(g)[0]!;
    expect(handle(r, 'b', { t: 'move', ...legal }, T0)).toBe('not-your-turn');
    expect(handle(r, 'a', { t: 'move', from: 'g-0-0', to: 'g-6-6' }, T0)).toBe('illegal-move');
    expect(handle(r, 'a', { t: 'end-chain' }, T0)).toBe('illegal-move');
    expect(handle(r, 'a', { t: 'sit', seat: 1 }, T0)).toBe('not-lobby');
    expect(handle(r, 'a', { t: 'move', ...legal }, T0 + 5)).toBeNull();
    expect(r.game!.turn).toBe(2);
    expect(r.turnDeadline).toBe(T0 + 5 + TURN_MS);
  });

  it('plays a medium move for a seat that times out', () => {
    const r = playing();
    expect(botDueAt(r)).toBe(T0 + TURN_MS);
    expect(tick(r, T0 + TURN_MS - 1)).toBe(false);
    expect(tick(r, T0 + TURN_MS)).toBe(true);
    expect(r.game!.turn).toBe(2);
  });

  it('plays AI seats after a short delay', () => {
    const r = newRoom('BCDFG');
    handle(r, 'a', { t: 'join', playerId: 'a', name: 'A' }, T0);
    handle(r, 'a', { t: 'set-board', board: 'classic' }, T0);
    handle(r, 'a', { t: 'sit', seat: 2 }, T0);
    handle(r, 'a', { t: 'set-ai', seat: 0, level: 'easy' }, T0);
    handle(r, 'a', { t: 'start' }, T0);
    expect(r.game!.turn).toBe(0);
    expect(botDueAt(r)).toBe(T0 + AI_DELAY_MS);
    expect(tick(r, T0 + AI_DELAY_MS)).toBe(true);
    expect(r.game!.turn).toBe(2);
  });

  it('covers a disconnected player after 20 seconds until they rejoin', () => {
    const r = playing();
    disconnect(r, 'a', T0 + 1000);
    expect(botDueAt(r)).toBe(T0 + 1000 + COVER_AFTER_MS);
    expect(tick(r, T0 + 1000 + COVER_AFTER_MS)).toBe(true);
    // b moves; a is still away, so the AI plays a's next turn after the short delay.
    const now = T0 + 30_000;
    expect(handle(r, 'b', { t: 'move', ...legalMoves(r.game!)[0]! }, now)).toBeNull();
    expect(botDueAt(r)).toBe(now + AI_DELAY_MS);
    // a comes back: the turn waits for them again.
    handle(r, 'a', { t: 'join', playerId: 'a', name: 'Ana' }, now + 100);
    expect(botDueAt(r)).toBe(now + TURN_MS);
  });

  it('pauses when nobody is connected', () => {
    const r = playing();
    disconnect(r, 'a', T0);
    disconnect(r, 'b', T0);
    expect(botDueAt(r)).toBeNull();
  });

  it('runs a whole AI game to the end, then rematch resets to the lobby', () => {
    const r = newRoom('BCDFG');
    handle(r, 'a', { t: 'join', playerId: 'a', name: 'A' }, T0);
    handle(r, 'a', { t: 'set-board', board: 'classic' }, T0);
    handle(r, 'a', { t: 'set-ai', seat: 0, level: 'easy' }, T0);
    handle(r, 'a', { t: 'set-ai', seat: 2, level: 'easy' }, T0);
    expect(handle(r, 'a', { t: 'rematch' }, T0)).toBe('not-ended');
    handle(r, 'a', { t: 'start' }, T0);
    let now = T0;
    for (let i = 0; i < 5000 && r.phase === 'playing'; i++) {
      now = botDueAt(r)!;
      tick(r, now);
    }
    expect(r.phase).toBe('ended');
    expect(r.game!.winner).not.toBeNull();
    expect(r.turnDeadline).toBeNull();
    expect(handle(r, 'a', { t: 'rematch' }, now)).toBeNull();
    expect(r.phase).toBe('lobby');
    expect(r.game).toBeNull();
    expect(r.ai).toEqual(['easy', null, 'easy', null]);
  });
});

describe('boards', () => {
  it('lets only the host pick a board in the lobby and clears seats the board lacks', () => {
    const r = lobby();
    handle(r, 'a', { t: 'set-board', board: 'four' }, T0);
    handle(r, 'b', { t: 'sit', seat: 3 }, T0);
    handle(r, 'a', { t: 'set-ai', seat: 1, level: 'easy' }, T0);
    expect(view(r).board).toBe('four');
    expect(handle(r, 'b', { t: 'set-board', board: 'classic' }, T0)).toBe('not-host');
    expect(handle(r, 'a', { t: 'set-board', board: 'classic' }, T0)).toBeNull();
    expect(view(r).board).toBe('classic');
    expect(r.players.find((p) => p.id === 'b')!.seat).toBeNull();
    expect(r.ai).toEqual([null, null, null, null]);
    expect(handle(r, 'b', { t: 'sit', seat: 1 }, T0)).toBe('seat-off-board');
    expect(handle(r, 'a', { t: 'set-ai', seat: 3, level: 'easy' }, T0)).toBe('seat-off-board');
    expect(handle(r, 'b', { t: 'sit', seat: 2 }, T0)).toBeNull();
    expect(handle(r, 'a', { t: 'start' }, T0)).toBeNull();
    expect(r.game).toMatchObject({ board: 'classic', seats: [0, 2] });
    expect(Object.keys(r.game!.pieces)).toHaveLength(32);
    expect(handle(r, 'a', { t: 'set-board', board: 'four' }, T0)).toBe('not-lobby');
  });

  it('keeps the board for a rematch and plays a whole quick AI game', () => {
    const r = newRoom('BCDFG');
    handle(r, 'a', { t: 'join', playerId: 'a', name: 'A' }, T0);
    handle(r, 'a', { t: 'set-board', board: 'quick' }, T0);
    handle(r, 'a', { t: 'set-ai', seat: 0, level: 'medium' }, T0);
    handle(r, 'a', { t: 'set-ai', seat: 2, level: 'easy' }, T0);
    handle(r, 'a', { t: 'start' }, T0);
    let now = T0;
    for (let i = 0; i < 5000 && r.phase === 'playing'; i++) {
      now = botDueAt(r)!;
      tick(r, now);
    }
    expect(r.phase).toBe('ended');
    expect(r.game!.board).toBe('quick');
    handle(r, 'a', { t: 'rematch' }, now);
    expect(view(r).board).toBe('quick');
  });

  it('plays Bagh-chal in a room: a goat from the hand, then the AI tigers', () => {
    const r = newRoom('BCDFG');
    handle(r, 'a', { t: 'join', playerId: 'a', name: 'A' }, T0);
    handle(r, 'a', { t: 'set-board', board: 'bagh' }, T0);
    handle(r, 'a', { t: 'sit', seat: 2 }, T0);
    handle(r, 'a', { t: 'set-ai', seat: 0, level: 'medium' }, T0);
    expect(handle(r, 'a', { t: 'start' }, T0)).toBeNull();
    expect(r.game).toMatchObject({ turn: 2, inHand: 20 });
    expect(handle(r, 'a', { t: 'move', from: 'hand', to: 'g-2-2' }, T0)).toBeNull();
    expect(r.game).toMatchObject({ turn: 0, inHand: 19 });
    expect(tick(r, botDueAt(r)!)).toBe(true);
    expect(r.game!.turn).toBe(2);
  });

  it('treats rooms saved before boards existed as the four-colour board', () => {
    const r = lobby();
    delete r.board;
    expect(view(r).board).toBe('four');
    handle(r, 'a', { t: 'set-ai', seat: 1, level: 'easy' }, T0);
    handle(r, 'a', { t: 'set-ai', seat: 3, level: 'easy' }, T0);
    expect(handle(r, 'a', { t: 'start' }, T0)).toBeNull();
    expect(r.game!.board).toBe('four');
  });
});

describe('looks', () => {
  it('lets only the host change the look, and only in the lobby', () => {
    const r = lobby();
    expect(view(r).look).toEqual({ court: 'earth', pieces: 'pebbles' });
    const look = { court: 'slate', pieces: 'foods' } as const;
    expect(handle(r, 'b', { t: 'set-look', look }, T0)).toBe('not-host');
    expect(handle(r, 'a', { t: 'set-look', look }, T0)).toBeNull();
    expect(view(r).look).toEqual(look);
    expect(handle(r, 'a', { t: 'start' }, T0)).toBeNull();
    expect(handle(r, 'a', { t: 'set-look', look }, T0)).toBe('not-lobby');
    delete r.look; // rooms saved before looks existed
    expect(view(r).look).toEqual({ court: 'earth', pieces: 'pebbles' });
  });

  it('parses only known looks and drops extra fields', () => {
    expect(parseMessage('{"t":"set-look","look":{"court":"wood","pieces":"bhar","x":1}}')).toEqual({
      t: 'set-look',
      look: { court: 'wood', pieces: 'bhar' },
    });
    expect(parseMessage('{"t":"set-look","look":{"court":"wood","pieces":"coins"}}')).toBeNull();
    expect(parseMessage('{"t":"set-look","look":null}')).toBeNull();
  });
});

describe('input', () => {
  it('parses only well-formed messages', () => {
    expect(parseMessage('{"t":"sit","seat":2}')).toEqual({ t: 'sit', seat: 2 });
    expect(parseMessage('{"t":"sit","seat":4}')).toBeNull();
    expect(parseMessage('{"t":"set-ai","seat":1,"level":"godlike"}')).toBeNull();
    expect(parseMessage('{"t":"set-ai","seat":1,"level":null}')).toEqual({
      t: 'set-ai',
      seat: 1,
      level: null,
    });
    expect(parseMessage('{"t":"join","playerId":"","name":"x"}')).toBeNull();
    expect(parseMessage('{"t":"stand","extra":1}')).toEqual({ t: 'stand' });
    expect(parseMessage('{"t":"set-board","board":"classic"}')).toEqual({
      t: 'set-board',
      board: 'classic',
    });
    expect(parseMessage('{"t":"set-board","board":"toString"}')).toBeNull();
    expect(parseMessage('null')).toBeNull();
    expect(parseMessage('nope')).toBeNull();
  });

  it('cleans names', () => {
    expect(cleanName('  Ana\u0000‮  ')).toBe('Ana');
    expect(cleanName('x'.repeat(40))).toHaveLength(20);
    expect(cleanName('\n\t')).toBe('Player');
    // ZWNJ survives: Bangla spelling needs it.
    expect(cleanName('র‌য')).toBe('র‌য');
  });

  it('makes 5-letter codes with no vowels', () => {
    for (let i = 0; i < 50; i++) expect(randomCode()).toMatch(CODE_RE);
  });
});
