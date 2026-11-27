import { env, SELF } from 'cloudflare:test';
import { DEFAULT_LOOK, legalMoves, type RoomListing, type ServerMessage } from '@guti-arena/engine';
import { describe, expect, it } from 'vitest';

/** Open a room socket and collect what the server sends. */
async function connect(code: string) {
  const res = await SELF.fetch(`https://example.com/api/rooms/${code}/ws`, {
    headers: { Upgrade: 'websocket' },
  });
  const ws = res.webSocket!;
  const inbox: ServerMessage[] = [];
  ws.addEventListener('message', (e) => {
    inbox.push(JSON.parse(e.data as string));
  });
  ws.accept();
  const next = async () => {
    for (let i = 0; i < 100 && inbox.length === 0; i++) await new Promise((r) => setTimeout(r, 10));
    return inbox.shift()!;
  };
  const clear = () => void inbox.splice(0);
  /** The next message of type `t`, dropping others before it; undefined after about a second. */
  const take = async <T extends ServerMessage['t']>(t: T) => {
    for (let i = 0; i < 100; i++) {
      const at = inbox.findIndex((m) => m.t === t);
      if (at >= 0) return inbox.splice(0, at + 1).at(-1) as Extract<ServerMessage, { t: T }>;
      await new Promise((r) => setTimeout(r, 10));
    }
    return undefined;
  };
  return { ws, next, clear, take, inbox: () => inbox };
}

describe('worker', () => {
  it('rejects a room request without a Turnstile token', async () => {
    const res = await SELF.fetch('https://example.com/api/rooms', { method: 'POST', body: '{}' });
    expect(res.status).toBe(400);
  });

  it('needs a WebSocket upgrade', async () => {
    const res = await SELF.fetch('https://example.com/api/rooms/BCDFG/ws');
    expect(res.status).toBe(426);
  });

  it('tells a socket when the room does not exist', async () => {
    const { next } = await connect('ZZZZZ');
    expect(await next()).toEqual({ t: 'error', code: 'room-not-found' });
  });

  it('joins, rejects oversized and wrong-seat messages', async () => {
    expect(await env.ROOM.getByName('KLMNP').create('KLMNP')).toBe(true);
    expect(await env.ROOM.getByName('KLMNP').create('KLMNP')).toBe(false);

    const a = await connect('klmnp');
    expect((await a.next()).t).toBe('state');
    a.ws.send(JSON.stringify({ t: 'join', playerId: 'a', name: 'Ana' }));
    const joined = await a.next();
    expect(joined.t === 'state' && joined.room.hostId).toBe('a');

    a.ws.send(JSON.stringify({ t: 'join', playerId: 'a', name: 'x'.repeat(2000) }));
    expect(await a.next()).toEqual({ t: 'error', code: 'too-big' });
    a.ws.send(JSON.stringify({ t: 'start' }));
    expect(await a.next()).toEqual({ t: 'error', code: 'need-all-seats' });
    a.ws.close();
  });

  it('pushes the live room list over one socket', async () => {
    const res = await SELF.fetch('https://example.com/api/rooms/live', {
      headers: { Upgrade: 'websocket' },
    });
    const ws = res.webSocket!;
    const inbox: { rooms: RoomListing[] }[] = [];
    ws.addEventListener('message', (e) => inbox.push(JSON.parse(e.data as string)));
    ws.accept();
    const nth = async (n: number) => {
      for (let i = 0; i < 300 && inbox.length < n; i++) await new Promise((r) => setTimeout(r, 10));
      return inbox[n - 1];
    };
    expect(Array.isArray((await nth(1))?.rooms)).toBe(true);
    const row: RoomListing = {
      ...{ code: 'LVLVL', board: 'four', phase: 'lobby', access: 'public', host: 'Hasi' },
      ...{ seated: 1, ai: 0, seats: 4, watchers: 0, look: DEFAULT_LOOK },
    };
    await env.ROOM_LIST.getByName('all').put(row);
    expect((await nth(2))?.rooms.some((x) => x.code === 'LVLVL')).toBe(true);
    await env.ROOM_LIST.getByName('all').remove('LVLVL');
    ws.close();
  });

  it('the host removes a seated player: their socket is told and closed, the id stays out', async () => {
    const code = 'MMRRT';
    await env.ROOM.getByName(code).create(code);
    const a = await connect(code);
    a.ws.send(JSON.stringify({ t: 'join', playerId: 'host-a', name: 'Ana' }));
    a.ws.send(JSON.stringify({ t: 'sit', seat: 0 }));
    const b = await connect(code);
    b.ws.send(JSON.stringify({ t: 'join', playerId: 'guest-b', name: 'Bo' }));
    b.ws.send(JSON.stringify({ t: 'sit', seat: 2 }));
    await b.take('state');
    await new Promise((r) => setTimeout(r, 50));
    a.ws.send(JSON.stringify({ t: 'remove', seat: 2 }));
    const told = await b.take('error');
    expect(told).toEqual({ t: 'error', code: 'removed' });
    const back = await connect(code);
    back.ws.send(JSON.stringify({ t: 'join', playerId: 'guest-b', name: 'Bo' }));
    expect(await back.take('error')).toEqual({ t: 'error', code: 'removed' });
    a.ws.close();
  });

  it('refuses other websites: an Origin that is not ours gets 403', async () => {
    const evil = { Origin: 'https://evil.example' };
    const post = await SELF.fetch('https://example.com/api/rooms', {
      method: 'POST',
      headers: evil,
      body: '{}',
    });
    expect(post.status).toBe(403);
    const ws = await SELF.fetch('https://example.com/api/rooms/BCDFG/ws', {
      headers: { ...evil, Upgrade: 'websocket' },
    });
    expect(ws.status).toBe(403);
    const ours = await SELF.fetch('https://example.com/api/rooms', {
      method: 'POST',
      headers: { Origin: 'https://example.com' },
      body: '{}',
    });
    expect(ours.status).toBe(400); // past the origin check, stopped by the missing token
  });

  it('lets a socket burst 8 messages, then refills 4 a second; changes nothing, sends nothing', async () => {
    const code = 'DDFFG';
    await env.ROOM.getByName(code).create(code);
    const a = await connect(code);
    await a.take('state');
    a.ws.send(JSON.stringify({ t: 'join', playerId: 'quiet-a', name: 'Ana' }));
    await a.take('state');
    await new Promise((r) => setTimeout(r, 300)); // the bucket refills to its burst of 8
    a.clear();
    const again = JSON.stringify({ t: 'join', playerId: 'quiet-a', name: 'Ana' });
    for (let i = 0; i < 8; i++) a.ws.send(again);
    await new Promise((r) => setTimeout(r, 150));
    expect(a.inbox()).toEqual([]); // the same name again changes nothing: no save, no broadcast
    a.ws.send(again);
    expect(await a.take('error')).toEqual({ t: 'error', code: 'rate-limit' });
    await new Promise((r) => setTimeout(r, 600)); // about 2 more allowed by now
    a.ws.send(JSON.stringify({ t: 'join', playerId: 'quiet-a', name: 'Ana B' }));
    expect((await a.take('state'))?.room.seats).toBeDefined(); // a real change goes out
    a.ws.close();
  });

  it('caps live-list viewers per IP', async () => {
    const open = async () => {
      const res = await SELF.fetch('https://example.com/api/rooms/live', {
        headers: { Upgrade: 'websocket', 'CF-Connecting-IP': '203.0.113.7' },
      });
      const ws = res.webSocket!;
      const got: { closed?: number; listed?: boolean } = {};
      ws.addEventListener('message', () => (got.listed = true));
      ws.addEventListener('close', (e) => (got.closed = e.code));
      ws.accept();
      return { ws, got };
    };
    const kept = [];
    for (let i = 0; i < 20; i++) kept.push(await open());
    const extra = await open();
    for (let i = 0; i < 100 && extra.got.closed === undefined; i++) {
      await new Promise((r) => setTimeout(r, 10));
    }
    expect(extra.got.closed).toBe(4002);
    expect(kept.every((k) => k.got.closed === undefined)).toBe(true);
    for (const k of kept) k.ws.close();
  });

  it('lists the room list; only GET and POST are allowed', async () => {
    expect((await SELF.fetch('https://example.com/api/rooms', { method: 'PUT' })).status).toBe(405);
    const res = await SELF.fetch('https://example.com/api/rooms');
    expect(res.status).toBe(200);
    expect(Array.isArray(((await res.json()) as { rooms: unknown[] }).rooms)).toBe(true);
  });

  it('locks a room: hides it from outsiders, lists it, strikes out wrong passwords, broadcasts reactions', async () => {
    const code = 'QRSTV';
    const list = env.ROOM_LIST.getByName('all');
    expect(await env.ROOM.getByName(code).create(code)).toBe(true);
    const host = await connect(code);
    for (const m of [
      { t: 'join', playerId: 'host', name: 'Hostname' },
      { t: 'sit', seat: 0 },
      { t: 'set-access', access: 'public' },
    ]) {
      host.ws.send(JSON.stringify(m));
    }
    await new Promise((r) => setTimeout(r, 100));
    expect(host.inbox().filter((m) => m.t === 'error')).toEqual([]);
    expect(host.inbox().at(-1)).toMatchObject({ t: 'state', room: { hostId: 'host' } });
    await new Promise((r) => setTimeout(r, 50));
    expect((await list.list()).find((x) => x.code === code)).toMatchObject({
      access: 'public',
      host: 'Hostname',
    });

    host.clear();
    host.ws.send(JSON.stringify({ t: 'set-access', access: 'locked', password: 'mango' }));
    expect((await host.take('state'))?.room.access).toBe('locked');
    await new Promise((r) => setTimeout(r, 50));
    expect((await list.list()).find((x) => x.code === code)?.access).toBe('locked');

    const out = await connect(code);
    const first = await out.take('state');
    expect(first?.room.hostId).toBe('');
    expect(JSON.stringify(first)).not.toContain('Hostname');

    out.ws.send(JSON.stringify({ t: 'join', playerId: 'out', name: 'Out' }));
    expect(await out.take('error')).toEqual({ t: 'error', code: 'need-password' });
    const closed = new Promise<number>((r) => out.ws.addEventListener('close', (e) => r(e.code)));
    for (let i = 0; i < 5; i++) {
      out.ws.send(JSON.stringify({ t: 'join', playerId: 'out', name: 'Out', password: 'nope' }));
      expect(await out.take('error')).toEqual({ t: 'error', code: 'wrong-password' });
    }
    expect(await closed).toBe(4001);

    const guest = await connect(code);
    await guest.take('state');
    guest.ws.send(JSON.stringify({ t: 'join', playerId: 'g', name: 'Guest', password: 'mango' }));
    const joined = await guest.take('state');
    expect(joined?.you.playerId).toBe('g');
    expect(joined?.room.hostId).toBe('-'); // never the host's player id
    expect(joined?.room.seats[0]!.name).toBe('Hostname');

    const lurker = await connect(code);
    await new Promise((r) => setTimeout(r, 100));
    for (const c of [host, guest, lurker]) c.clear();
    host.ws.send(JSON.stringify({ t: 'react', id: 'gg' }));
    host.ws.send(JSON.stringify({ t: 'react', id: 'wow' })); // inside the gap: dropped
    expect(await host.take('reaction')).toEqual({ t: 'reaction', seat: 0, id: 'gg' });
    expect(await guest.take('reaction')).toEqual({ t: 'reaction', seat: 0, id: 'gg' });
    await new Promise((r) => setTimeout(r, 100));
    expect(guest.inbox().filter((m) => m.t === 'reaction')).toEqual([]); // 'wow' was dropped
    expect(lurker.inbox().filter((m) => m.t === 'reaction')).toEqual([]); // not joined: none
    guest.ws.send(JSON.stringify({ t: 'react', id: 'gg' }));
    expect(await guest.take('error')).toEqual({ t: 'error', code: 'not-seated' });

    // Reconnecting doesn't reset the guessing: the room stops checking after 20 wrong a minute.
    for (let k = 0; k < 3; k++) {
      const again = await connect(code);
      for (let i = 0; i < 5; i++) {
        again.ws.send(JSON.stringify({ t: 'join', playerId: 'out', name: 'Out', password: 'x' }));
        await again.take('error');
      }
    }
    const last = await connect(code);
    last.ws.send(JSON.stringify({ t: 'join', playerId: 'out', name: 'Out', password: 'mango' }));
    expect(await last.take('error')).toEqual({ t: 'error', code: 'rate-limit' });
    last.ws.close();
    for (const c of [host, guest, lurker]) c.ws.close();
    await new Promise((r) => setTimeout(r, 100));
    expect((await list.list()).some((x) => x.code === code)).toBe(false);
  });

  it('runs many rooms at once without them touching each other', async () => {
    const codes = ['BCDFG', 'HJKLM', 'NPQRS', 'TVWXZ', 'BBCCD', 'FFGGH'];
    const rooms = await Promise.all(
      codes.map(async (code, i) => {
        expect(await env.ROOM.getByName(code).create(code)).toBe(true);
        const c = await connect(code);
        await c.next();
        // The same person may host two rooms: rooms 0 and 1 share a player id.
        const playerId = i < 2 ? 'same' : `host-${i}`;
        let last!: ServerMessage;
        for (const m of [
          { t: 'join', playerId, name: `Host ${i}` },
          { t: 'set-board', board: 'quick' },
          { t: 'sit', seat: 0 },
          { t: 'set-ai', seat: 2, level: 'easy' },
          { t: 'start' },
        ]) {
          c.ws.send(JSON.stringify(m));
          last = await c.next();
        }
        return { ...c, code, playerId, last };
      }),
    );
    for (const r of rooms) {
      expect(r.last.t === 'state' && r.last.room.code).toBe(r.code);
      expect(r.last.t === 'state' && r.last.room.hostId).toBe(r.playerId);
      expect(r.last.t === 'state' && r.last.room.phase).toBe('playing');
    }

    // A move in the first room reaches that room only.
    const first = rooms[0]!;
    const start = first.last.t === 'state' ? first.last.room.game! : null;
    const move = legalMoves(start!)[0]!;
    first.ws.send(JSON.stringify({ t: 'move', ...move }));
    const after = await first.next();
    expect(after.t === 'state' && after.room.game!.pieces[move.to]).toBe(0);

    await new Promise((r) => setTimeout(r, 100));
    for (const r of rooms.slice(1)) {
      r.ws.send(JSON.stringify({ t: 'sit', seat: 0 })); // rejected, and proves the room still answers
      expect(await r.next()).toEqual({ t: 'error', code: 'not-lobby' });
      r.ws.close();
    }
    first.ws.close();
  });
});
