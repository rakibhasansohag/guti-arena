import { env, SELF } from 'cloudflare:test';
import type { ServerMessage } from '@guti-arena/engine';
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
});
