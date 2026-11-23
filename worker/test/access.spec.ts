import { PASSWORD_MAX, type ClientMessage, type RoomListing } from '@guti-arena/engine';
import { describe, expect, it } from 'vitest';
import {
  BLOCKED_MAX,
  OTHER_HOST,
  REACT_GAP_MS,
  block,
  canReact,
  disconnect,
  handle,
  hashPassword,
  hostIdFor,
  listing,
  newRoom,
  parseMessage,
  view,
  type Room,
} from '../src/room-logic.ts';
import { sortRooms } from '../src/room-list.ts';

const T0 = 1_000_000;
const SALT = 'abc123';

/** Host `a` alone in a lobby, seated at 0. */
function room() {
  const r = newRoom('BCDFG');
  expect(handle(r, 'a', { t: 'join', playerId: 'a', name: 'Ana' }, T0)).toBeNull();
  expect(handle(r, 'a', { t: 'sit', seat: 0 }, T0)).toBeNull();
  return r;
}

/** Lock `r` with `pw`, the way index.ts does: hash first, then handle. */
async function lock(r: Room, pw = 'mango') {
  const hash = await hashPassword(pw, SALT);
  expect(handle(r, 'a', { t: 'set-access', access: 'locked', password: pw }, T0, hash)).toBeNull();
}

const join = async (r: Room, id: string, password?: string) => {
  const salt = r.passwordHash?.split(':')[0];
  const hash = password && salt ? await hashPassword(password, salt) : null;
  const m: ClientMessage = { t: 'join', playerId: id, name: id, password };
  return handle(r, id, m, T0, hash);
};

describe('parse', () => {
  it('reads the new messages and rejects bad ones', () => {
    expect(parseMessage('{"t":"set-access","access":"public"}')).toEqual({
      t: 'set-access',
      access: 'public',
    });
    expect(parseMessage('{"t":"set-access","access":"locked","password":"x"}')).toMatchObject({
      password: 'x',
    });
    expect(parseMessage('{"t":"set-access","access":"open"}')).toBeNull();
    expect(parseMessage('{"t":"set-access","access":"locked","password":5}')).toBeNull();
    expect(parseMessage('{"t":"react","id":"gg"}')).toEqual({ t: 'react', id: 'gg' });
    expect(parseMessage('{"t":"react","id":"rude"}')).toBeNull();
    expect(parseMessage('{"t":"join","playerId":"a","name":"A","password":"p"}')).toMatchObject({
      password: 'p',
    });
    expect(parseMessage('{"t":"join","playerId":"a","name":"A","password":{}}')).toBeNull();
  });
});

describe('access', () => {
  it('starts private; only the host changes it, only in the lobby', async () => {
    const r = room();
    expect(view(r).access).toBe('private');
    handle(r, 'b', { t: 'join', playerId: 'b', name: 'Bo' }, T0);
    expect(handle(r, 'b', { t: 'set-access', access: 'public' }, T0)).toBe('not-host');
    expect(handle(r, 'a', { t: 'set-access', access: 'public' }, T0)).toBeNull();
    expect(view(r).access).toBe('public');
    handle(r, 'a', { t: 'set-ai', seat: 1, level: 'easy' }, T0);
    handle(r, 'a', { t: 'set-ai', seat: 2, level: 'easy' }, T0);
    handle(r, 'a', { t: 'set-ai', seat: 3, level: 'easy' }, T0);
    expect(handle(r, 'a', { t: 'start' }, T0)).toBeNull();
    expect(handle(r, 'a', { t: 'set-access', access: 'private' }, T0)).toBe('not-lobby');
  });

  it('locking needs a password of 1 to PASSWORD_MAX characters, stored only as a hash', async () => {
    const r = room();
    const h = await hashPassword('x', SALT);
    const set = (password?: string) =>
      handle(r, 'a', { t: 'set-access', access: 'locked', password }, T0, password ? h : null);
    expect(set()).toBe('password-required');
    expect(set('')).toBe('password-required');
    expect(set('x'.repeat(PASSWORD_MAX + 1))).toBe('password-required');
    expect(view(r).access).toBe('private');
    await lock(r, 'mango');
    expect(r.passwordHash).toMatch(/^abc123:[0-9a-f]{64}$/);
    expect(JSON.stringify(r)).not.toContain('mango');
    expect(handle(r, 'a', { t: 'set-access', access: 'public' }, T0)).toBeNull();
    expect(r.passwordHash).toBeNull();
  });

  it('a locked room asks newcomers for the password; seated members rejoin without it', async () => {
    const r = room();
    handle(r, 'b', { t: 'join', playerId: 'b', name: 'Bo' }, T0);
    handle(r, 'b', { t: 'sit', seat: 2 }, T0);
    await lock(r);
    expect(await join(r, 'c')).toBe('need-password');
    expect(await join(r, 'c', 'apple')).toBe('wrong-password');
    expect(r.players.some((p) => p.id === 'c')).toBe(false);
    expect(await join(r, 'c', 'mango')).toBeNull();
    disconnect(r, 'b', T0);
    expect(await join(r, 'b')).toBeNull();
    expect(r.players.find((p) => p.id === 'b')!.connected).toBe(true);
    // Someone without a seat is forgotten on leaving, so they need the password again.
    disconnect(r, 'c', T0);
    expect(await join(r, 'c')).toBe('need-password');
  });

  it('hides the game and names from a socket that has not joined a locked room', async () => {
    const r = room();
    handle(r, 'a', { t: 'set-ai', seat: 1, level: 'easy' }, T0);
    handle(r, 'a', { t: 'set-ai', seat: 2, level: 'easy' }, T0);
    handle(r, 'a', { t: 'set-ai', seat: 3, level: 'easy' }, T0);
    expect(view(r, false).seats[0]!.name).toBe('Ana'); // not locked: nothing hidden
    await lock(r);
    handle(r, 'a', { t: 'start' }, T0);
    const v = view(r, false);
    expect(v.game).toBeNull();
    expect(v.turnDeadline).toBeNull();
    expect(v.hostId).toBe('');
    expect(v.access).toBe('locked');
    for (const s of v.seats)
      expect(s).toEqual({ seat: s.seat, kind: 'empty', name: '', connected: false, level: null });
    expect(JSON.stringify(v)).not.toContain('Ana');
    expect(view(r).game).not.toBeNull();
  });

  it('tells only the host the host id', () => {
    const r = room();
    expect(hostIdFor(r, 'a')).toBe('a');
    expect(hostIdFor(r, 'b')).toBe(OTHER_HOST);
    expect(hostIdFor(r, null)).toBe(OTHER_HOST);
    expect(hostIdFor(r, null, '')).toBe(''); // already redacted
  });

  it('counts watchers: connected players without a seat, including late joiners', () => {
    const r = room();
    for (const id of ['x', 'y', 'z']) handle(r, id, { t: 'join', playerId: id, name: id }, T0);
    handle(r, 'a', { t: 'set-ai', seat: 1, level: 'easy' }, T0);
    handle(r, 'a', { t: 'set-ai', seat: 2, level: 'easy' }, T0);
    handle(r, 'a', { t: 'set-ai', seat: 3, level: 'easy' }, T0);
    handle(r, 'a', { t: 'start' }, T0);
    handle(r, 'w', { t: 'join', playerId: 'w', name: 'W' }, T0);
    expect(r.players.find((p) => p.id === 'w')!.seat).toBeNull();
    disconnect(r, 'z', T0);
    expect(view(r).watchers).toBe(3);
    // People watching without a name are open sockets that never joined.
    expect(view(r, false, 2).watchers).toBe(5);
  });
});

describe('reactions', () => {
  it('only seated players react', () => {
    const r = room();
    handle(r, 'b', { t: 'join', playerId: 'b', name: 'Bo' }, T0);
    expect(handle(r, 'a', { t: 'react', id: 'gg' }, T0)).toBeNull();
    expect(handle(r, 'b', { t: 'react', id: 'gg' }, T0)).toBe('not-seated');
    expect(handle(r, null, { t: 'react', id: 'gg' }, T0)).toBe('not-joined');
  });

  it('drops a player’s reactions inside the gap, per player', () => {
    const last = new Map<string, number>();
    expect(canReact(last, 'a', T0)).toBe(true);
    expect(canReact(last, 'a', T0 + REACT_GAP_MS - 1)).toBe(false);
    expect(canReact(last, 'b', T0 + 1)).toBe(true);
    expect(canReact(last, 'a', T0 + REACT_GAP_MS)).toBe(true);
  });
});

describe('room list', () => {
  it('lists public and locked rooms with someone connected, without ids or passwords', async () => {
    const r = room();
    expect(listing(r)).toBeNull(); // private
    handle(r, 'a', { t: 'set-access', access: 'public' }, T0);
    handle(r, 'a', { t: 'set-ai', seat: 1, level: 'easy' }, T0);
    handle(r, 'b', { t: 'join', playerId: 'b', name: 'Bo' }, T0);
    expect(listing(r)).toEqual({
      code: 'BCDFG',
      board: 'four',
      phase: 'lobby',
      access: 'public',
      host: 'Ana',
      seated: 1,
      ai: 1,
      seats: 4,
      watchers: 1,
      look: view(r).look,
    } satisfies RoomListing);
    await lock(r, 'secretword');
    const l = JSON.stringify(listing(r));
    expect(l).toContain('"access":"locked"');
    expect(l).not.toContain('secretword');
    expect(l).not.toContain(r.passwordHash!);
    expect(l).not.toMatch(/"(a|b)"/);
    disconnect(r, 'a', T0);
    disconnect(r, 'b', T0);
    expect(listing(r)).toBeNull(); // nobody connected
  });

  it('sorts lobbies with a free seat, full lobbies, games in play; newest first', () => {
    const row = (code: string, phase: RoomListing['phase'], seated: number, since: number) => ({
      since,
      listing: { code, phase, seated, ai: 0, seats: 2 } as RoomListing,
    });
    const codes = sortRooms([
      row('PLAY1', 'playing', 2, 5),
      row('FULL1', 'lobby', 2, 9),
      row('OPEN1', 'lobby', 1, 1),
      row('DONE1', 'ended', 2, 9),
      row('OPEN2', 'lobby', 0, 3),
      row('PLAY2', 'playing', 2, 7),
    ]).map((x) => x.code);
    expect(codes).toEqual(['OPEN2', 'OPEN1', 'FULL1', 'PLAY2', 'PLAY1', 'DONE1']);
    const many = Array.from({ length: 60 }, (_, i) => row(`R${i}`, 'lobby', 0, i));
    expect(sortRooms(many)).toHaveLength(50);
  });
});

describe('leaving and removing', () => {
  it('forgets people without a seat when they leave; keeps the seated, host and owner', () => {
    const r = room();
    for (const id of ['b', 'c', 'd']) handle(r, id, { t: 'join', playerId: id, name: id }, T0);
    handle(r, 'b', { t: 'sit', seat: 2 }, T0);
    for (const id of ['b', 'c', 'd']) disconnect(r, id, T0);
    expect(r.players.map((p) => p.id)).toEqual(['a', 'b']); // b keeps the seat to rejoin
    handle(r, 'a', { t: 'stand' }, T0);
    disconnect(r, 'a', T0); // the host is kept for the grace period even without a seat
    expect(r.players.some((p) => p.id === 'a')).toBe(true);
  });

  it('the host removes a seated player in the lobby; that id cannot come back', () => {
    const r = room();
    handle(r, 'b', { t: 'join', playerId: 'b', name: 'Bo' }, T0);
    handle(r, 'b', { t: 'sit', seat: 2 }, T0);
    expect(handle(r, 'b', { t: 'remove', seat: 0 }, T0)).toBe('not-host');
    expect(handle(r, 'a', { t: 'remove', seat: 0 }, T0)).toBe('cannot-remove'); // not the host
    expect(handle(r, 'a', { t: 'remove', seat: 1 }, T0)).toBe('cannot-remove'); // empty seat
    expect(handle(r, 'a', { t: 'remove', seat: 2 }, T0)).toBeNull();
    expect(r.players.map((p) => p.id)).toEqual(['a']);
    expect(view(r).seats[2]!.kind).toBe('empty');
    expect(handle(r, 'b', { t: 'join', playerId: 'b', name: 'Bo' }, T0)).toBe('removed');
    expect(parseMessage('{"t":"remove","seat":2}')).toEqual({ t: 'remove', seat: 2 });
    expect(parseMessage('{"t":"remove","seat":7}')).toBeNull();
  });

  it('keeps only the newest blocked entries', () => {
    const r = room();
    block(
      r,
      Array.from({ length: BLOCKED_MAX + 5 }, (_, i) => `x${i}`),
    );
    expect(r.blocked).toHaveLength(BLOCKED_MAX);
    expect(r.blocked![0]).toBe('x5');
  });
});
