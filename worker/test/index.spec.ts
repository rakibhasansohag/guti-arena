import { env, SELF } from 'cloudflare:test';
import { legalMoves, type ServerMessage } from '@guti-arena/engine';
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
  return { ws, next, clear };
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
    await host.next();
    for (const m of [
      { t: 'join', playerId: 'host', name: 'Hostname' },
      { t: 'sit', seat: 0 },
      { t: 'set-access', access: 'public' },
    ]) {
      host.ws.send(JSON.stringify(m));
      await host.next();
    }
    await new Promise((r) => setTimeout(r, 50));
    expect((await list.list()).find((x) => x.code === code)).toMatchObject({
      access: 'public',
      host: 'Hostname',
    });

    host.ws.send(JSON.stringify({ t: 'set-access', access: 'locked', password: 'mango' }));
    expect((await host.next()).t).toBe('state');
    await new Promise((r) => setTimeout(r, 50));
    expect((await list.list()).find((x) => x.code === code)?.access).toBe('locked');

    const out = await connect(code);
    const first = await out.next();
    expect(first.t === 'state' && first.room.hostId).toBe('');
    expect(JSON.stringify(first)).not.toContain('Hostname');

    out.ws.send(JSON.stringify({ t: 'join', playerId: 'out', name: 'Out' }));
    expect(await out.next()).toEqual({ t: 'error', code: 'need-password' });
    const closed = new Promise<number>((r) => out.ws.addEventListener('close', (e) => r(e.code)));
    for (let i = 0; i < 5; i++) {
      out.ws.send(JSON.stringify({ t: 'join', playerId: 'out', name: 'Out', password: 'nope' }));
      expect(await out.next()).toEqual({ t: 'error', code: 'wrong-password' });
    }
    expect(await closed).toBe(4001);

    const guest = await connect(code);
    await guest.next();
    guest.ws.send(JSON.stringify({ t: 'join', playerId: 'g', name: 'Guest', password: 'mango' }));
    const joined = await guest.next();
    expect(joined.t === 'state' && joined.room.hostId).toBe('host');

    const lurker = await connect(code);
    await new Promise((r) => setTimeout(r, 100));
    for (const c of [host, guest, lurker]) c.clear();
    host.ws.send(JSON.stringify({ t: 'react', id: 'gg' }));
    host.ws.send(JSON.stringify({ t: 'react', id: 'wow' })); // inside the gap: dropped
    expect(await host.next()).toEqual({ t: 'reaction', seat: 0, id: 'gg' });
    expect(await guest.next()).toEqual({ t: 'reaction', seat: 0, id: 'gg' });
    await new Promise((r) => setTimeout(r, 100));
    expect(await guest.next()).toBeUndefined();
    expect(await lurker.next()).toBeUndefined(); // not joined to a locked room: no reactions
    guest.ws.send(JSON.stringify({ t: 'react', id: 'gg' }));
    expect(await guest.next()).toEqual({ t: 'error', code: 'not-seated' });

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
