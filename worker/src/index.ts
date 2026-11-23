import { DurableObject } from 'cloudflare:workers';
import type { CreateRoomRequest, ServerMessage } from '@guti-arena/engine';
import {
  CODE_RE,
  botDueAt,
  disconnect,
  handle,
  hostDueAt,
  newRoom,
  parseMessage,
  passHost,
  randomCode,
  tick,
  view,
  type Room as RoomData,
} from './room-logic.ts';

const MAX_SOCKETS = 8;
const MAX_MESSAGE_BYTES = 1024;
const MAX_PER_SECOND = 10;
const CLEANUP_MS = 30 * 60_000;

interface Saved {
  room: RoomData;
  /** When the last socket closed (or the room was created); null while anyone is connected. */
  emptySince: number | null;
}

interface Attachment {
  playerId: string | null;
}

const json = (body: unknown, status = 200) => Response.json(body, { status });
const send = (ws: WebSocket, m: ServerMessage) => {
  try {
    ws.send(JSON.stringify(m));
  } catch {
    // Socket already closing; its close handler cleans up.
  }
};
const playerOf = (ws: WebSocket) =>
  (ws.deserializeAttachment() as Attachment | null)?.playerId ?? null;

/** One instance per room, named by its code. Sockets use the Hibernation API so idle rooms cost nothing. */
export class Room extends DurableObject<Env> {
  private saved: Saved | null = null;
  private rates = new Map<WebSocket, { start: number; n: number }>();

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    void ctx.blockConcurrencyWhile(async () => {
      this.saved = (await ctx.storage.get<Saved>('saved')) ?? null;
    });
  }

  /** Called once by `POST /api/rooms`. False when the code is already in use. */
  async create(code: string): Promise<boolean> {
    if (this.saved) return false;
    this.saved = { room: newRoom(code), emptySince: Date.now() };
    await this.commit();
    return true;
  }

  override async fetch(): Promise<Response> {
    const [client, server] = Object.values(new WebSocketPair()) as [WebSocket, WebSocket];
    const reject = !this.saved
      ? 'room-not-found'
      : this.ctx.getWebSockets().length >= MAX_SOCKETS
        ? 'room-full'
        : null;
    if (reject) {
      // Accepted outside the hibernation set, told why, and closed.
      server.accept();
      send(server, { t: 'error', code: reject });
      server.close(4000, reject);
      return new Response(null, { status: 101, webSocket: client });
    }
    this.ctx.acceptWebSocket(server);
    server.serializeAttachment({ playerId: null } satisfies Attachment);
    this.saved!.emptySince = null;
    await this.commit();
    send(server, { t: 'state', room: view(this.saved!.room), you: { playerId: '', seat: null } });
    return new Response(null, { status: 101, webSocket: client });
  }

  override async webSocketMessage(ws: WebSocket, raw: string | ArrayBuffer) {
    const s = this.saved;
    if (!s) return;
    const now = Date.now();

    const rate = this.rates.get(ws);
    if (!rate || now - rate.start >= 1000) this.rates.set(ws, { start: now, n: 1 });
    else if (++rate.n > MAX_PER_SECOND) return send(ws, { t: 'error', code: 'rate-limit' });

    if (typeof raw !== 'string') return send(ws, { t: 'error', code: 'bad-message' });
    if (new TextEncoder().encode(raw).length > MAX_MESSAGE_BYTES) {
      return send(ws, { t: 'error', code: 'too-big' });
    }
    const m = parseMessage(raw);
    if (!m) return send(ws, { t: 'error', code: 'bad-message' });

    const current = playerOf(ws);
    if (m.t === 'join') {
      if (current !== null && current !== m.playerId) {
        return send(ws, { t: 'error', code: 'already-joined' });
      }
      ws.serializeAttachment({ playerId: m.playerId } satisfies Attachment);
    }
    const error = handle(s.room, m.t === 'join' ? m.playerId : current, m, now);
    if (error) return send(ws, { t: 'error', code: error });
    await this.changed();
  }

  override async webSocketClose(ws: WebSocket) {
    this.rates.delete(ws);
    const s = this.saved;
    if (!s) return;
    const now = Date.now();
    const others = this.ctx.getWebSockets().filter((x) => x !== ws);
    const id = playerOf(ws);
    if (id !== null && !others.some((x) => playerOf(x) === id)) disconnect(s.room, id, now);
    if (others.length === 0) s.emptySince = now;
    await this.changed();
  }

  override async alarm() {
    const s = this.saved;
    if (!s) return;
    const now = Date.now();
    if (s.emptySince !== null && now >= s.emptySince + CLEANUP_MS) {
      if (this.ctx.getWebSockets().length === 0) {
        this.saved = null;
        await this.ctx.storage.deleteAll(); // also deletes the alarm on this compatibility date
        return;
      }
      s.emptySince = null;
    }
    const moved = tick(s.room, now);
    const passed = passHost(s.room, now);
    if (moved || passed) await this.changed();
    else await this.commit();
  }

  /** Save, tell every socket, and schedule the next server move or cleanup. */
  private async changed() {
    await this.commit();
    const room = view(this.saved!.room);
    for (const ws of this.ctx.getWebSockets()) {
      const playerId = playerOf(ws) ?? '';
      const seat = this.saved!.room.players.find((p) => p.id === playerId)?.seat ?? null;
      send(ws, { t: 'state', room, you: { playerId, seat } });
    }
  }

  private async commit() {
    const s = this.saved!;
    await this.ctx.storage.put('saved', s);
    const times = [
      botDueAt(s.room),
      hostDueAt(s.room),
      s.emptySince === null ? null : s.emptySince + CLEANUP_MS,
    ];
    const next = Math.min(...times.filter((t) => t !== null));
    if (Number.isFinite(next)) await this.ctx.storage.setAlarm(next);
    else await this.ctx.storage.deleteAlarm();
  }
}

async function createRoom(request: Request, env: Env): Promise<Response> {
  let body: Partial<CreateRoomRequest>;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'bad-request' }, 400);
  }
  const token = body?.turnstileToken;
  if (typeof token !== 'string' || token.length === 0 || token.length > 2048) {
    return json({ error: 'bad-request' }, 400);
  }
  if (!env.TURNSTILE_SECRET) return json({ error: 'turnstile-not-configured' }, 500);

  const verify = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      secret: env.TURNSTILE_SECRET,
      response: token,
      remoteip: request.headers.get('CF-Connecting-IP') ?? undefined,
    }),
  });
  const outcome = (await verify.json().catch(() => null)) as { success?: boolean } | null;
  if (!outcome?.success) return json({ error: 'turnstile-failed' }, 403);

  for (let i = 0; i < 5; i++) {
    const code = randomCode();
    if (await env.ROOM.getByName(code).create(code)) return json({ code }, 201);
  }
  return json({ error: 'unavailable' }, 503);
}

export default {
  async fetch(request, env): Promise<Response> {
    const { pathname } = new URL(request.url);
    try {
      if (pathname === '/api/rooms') {
        return request.method === 'POST'
          ? await createRoom(request, env)
          : json({ error: 'method-not-allowed' }, 405);
      }
      const ws = pathname.match(/^\/api\/rooms\/([A-Za-z]{5})\/ws$/);
      if (ws) {
        if (request.headers.get('Upgrade') !== 'websocket') {
          return json({ error: 'expected-websocket' }, 426);
        }
        const code = ws[1]!.toUpperCase();
        if (!CODE_RE.test(code)) return json({ error: 'room-not-found' }, 404);
        return await env.ROOM.getByName(code).fetch(request);
      }
    } catch {
      // Most often a plan limit on Durable Object requests; the client points people to solo play.
      return json({ error: 'unavailable' }, 503);
    }
    // Static assets and SPA fallback are served before the Worker runs; anything else is unknown.
    return json({ error: 'not-found' }, 404);
  },
} satisfies ExportedHandler<Env>;
