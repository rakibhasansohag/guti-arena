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
  return { ws, next };
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
