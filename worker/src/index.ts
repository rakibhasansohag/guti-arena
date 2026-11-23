import { DurableObject } from 'cloudflare:workers';
import type {
  ClientMessage,
  CreateRoomRequest,
  RoomListResponse,
  ServerMessage,
} from '@guti-arena/engine';
import {
  CODE_RE,
  botDueAt,
  canReact,
  disconnect,
  handle,
  hashPassword,
  hostIdFor,
  hostDueAt,
  listing,
  newRoom,
  newSalt,
  parseMessage,
  passHost,
  randomCode,
  tick,
  view,
  type Room as RoomData,
} from './room-logic.ts';

export { RoomList } from './room-list.ts';

const MAX_SOCKETS = 16;
const MAX_MESSAGE_BYTES = 1024;
const MAX_PER_SECOND = 10;
const CLEANUP_MS = 30 * 60_000;
const MAX_WRONG_PASSWORDS = 5;
/** Wrong passwords a room takes from all sockets in a minute, so reconnecting doesn't reset the guessing. */
const ROOM_WRONG_PER_MINUTE = 20;
/** Re-push an unchanged listing this often, so the list's 35-minute expiry never drops a live room. */
const LIST_REFRESH_MS = 10 * 60_000;
/** With the rooms page polling every 3 s, a change shows within 5 s. */
const LIST_CACHE_SECONDS = 2;

interface Saved {
  room: RoomData;
  /** When the last socket closed (or the room was created); null while anyone is connected. */
  emptySince: number | null;
  /** JSON of the listing last pushed to the room list, and when; absent while not listed. */
  listed?: string;
  listedAt?: number;
}

interface Attachment {
  playerId: string | null;
  /** Wrong passwords sent on this socket. */
  strikes?: number;
}

const json = (body: unknown, status = 200) => Response.json(body, { status });
const send = (ws: WebSocket, m: ServerMessage) => {
  try {
    ws.send(JSON.stringify(m));
  } catch {
    // Socket already closing; its close handler cleans up.
  }
};
const attachmentOf = (ws: WebSocket) =>
  (ws.deserializeAttachment() as Attachment | null) ?? { playerId: null };
const playerOf = (ws: WebSocket) => attachmentOf(ws).playerId;

/** One instance per room, named by its code. Sockets use the Hibernation API so idle rooms cost nothing. */
export class Room extends DurableObject<Env> {
  private saved: Saved | null = null;
  private rates = new Map<WebSocket, { start: number; n: number }>();
  /** Last reaction per player, for the throttle. Lost on hibernation, which is harmless. */
  private reacted = new Map<string, number>();
  /** Wrong passwords this minute across every socket. In memory: a busy guesser keeps the room awake. */
  private wrong = { start: 0, n: 0 };
  /** One stub, so pushes from this room reach the list in order. */
  private list = this.env.ROOM_LIST.getByName('all');

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
    // Everyone gets the state, so the watcher count includes this socket; it gets the redacted view.
    await this.changed();
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

    const att = attachmentOf(ws);
    const current = att.playerId;
    if (m.t === 'join' && current !== null && current !== m.playerId) {
      return send(ws, { t: 'error', code: 'already-joined' });
    }
    // Hashing is async; block other events meanwhile so messages keep their order.
    if (m.t === 'join' && m.password && now - this.wrong.start < 60_000) {
      if (this.wrong.n >= ROOM_WRONG_PER_MINUTE)
        return send(ws, { t: 'error', code: 'rate-limit' });
    }
    const pending = passwordHash(m, s.room);
    const hash = pending && (await this.ctx.blockConcurrencyWhile(() => pending));
    const hostBefore = s.room.hostId;
    const id = m.t === 'join' ? m.playerId : current;
    const error = handle(s.room, id, m, now, hash);
    if (error) {
      send(ws, { t: 'error', code: error });
      if (error === 'wrong-password') {
        if (now - this.wrong.start >= 60_000) this.wrong = { start: now, n: 0 };
        this.wrong.n++;
        const strikes = (att.strikes ?? 0) + 1;
        ws.serializeAttachment({ ...att, strikes } satisfies Attachment);
        if (strikes >= MAX_WRONG_PASSWORDS) ws.close(4001, 'wrong-password');
      }
      return;
    }
    if (m.t === 'join') ws.serializeAttachment({ playerId: m.playerId } satisfies Attachment);
    if (m.t === 'react') {
      const seat = s.room.players.find((p) => p.id === id)?.seat;
      if (seat != null && canReact(this.reacted, id!, now)) {
        const locked = s.room.access === 'locked';
        for (const x of this.ctx.getWebSockets()) {
          if (!locked || playerOf(x) !== null) send(x, { t: 'reaction', seat, id: m.id });
        }
      }
      if (s.room.hostId === hostBefore) return; // reactions are not saved
    }
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
    await this.changed(ws);
  }

  override async alarm() {
    const s = this.saved;
    if (!s) return;
    const now = Date.now();
    if (s.emptySince !== null && now >= s.emptySince + CLEANUP_MS) {
      if (this.ctx.getWebSockets().length === 0) {
        if (s.listed !== undefined) await this.list.remove(s.room.code).catch(() => {});
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

  /** Save, tell every socket, keep the room list current, and schedule the next server move or cleanup. */
  private async changed(closing?: WebSocket) {
    await this.commit();
    const s = this.saved!;
    // A closing socket is still in the list while its close handler runs.
    const sockets = this.ctx.getWebSockets().filter((x) => x !== closing);
    const guests = sockets.filter((x) => playerOf(x) === null).length;
    const room = view(s.room, true, guests);
    const hidden = view(s.room, false, guests);
    for (const ws of sockets) {
      const playerId = playerOf(ws);
      const seat = s.room.players.find((p) => p.id === playerId)?.seat ?? null;
      const state = playerId === null ? hidden : room;
      send(ws, {
        t: 'state',
        room: { ...state, hostId: hostIdFor(s.room, playerId, state.hostId) },
        you: { playerId: playerId ?? '', seat },
      });
    }
    await this.syncListing(guests);
  }

  /** Push this room's listing when a listed field changed (or it is due a refresh); remove it when unlisted. */
  private async syncListing(guests: number) {
    const s = this.saved!;
    const row = listing(s.room, guests);
    const json = row ? JSON.stringify(row) : undefined;
    const now = Date.now();
    const fresh = json === undefined || now - (s.listedAt ?? 0) < LIST_REFRESH_MS;
    if (json === s.listed && fresh) return;
    const before = { listed: s.listed, listedAt: s.listedAt };
    // Set first, so a change arriving during the call compares against this push.
    s.listed = json;
    s.listedAt = now;
    try {
      if (row) await this.list.put(row);
      else await this.list.remove(s.room.code);
    } catch {
      // The list is a convenience: a failed push never breaks the room. The next change retries.
      Object.assign(s, before);
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

/** The hash `handle` needs for a password in this message, or null when there is nothing to hash. */
function passwordHash(m: ClientMessage, r: RoomData): Promise<string | null> | null {
  if (m.t === 'set-access' && m.access === 'locked' && m.password) {
    return hashPassword(m.password, newSalt());
  }
  if (m.t === 'join' && m.password && r.passwordHash) {
    return hashPassword(m.password, r.passwordHash.split(':')[0]!);
  }
  return null;
}

/** The public room list, cached for a few seconds per data centre under one fixed key. */
async function listRooms(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
  const key = new Request(new URL('/api/rooms/__list', request.url).toString());
  const hit = await caches.default.match(key);
  if (hit) return hit;
  const body: RoomListResponse = { rooms: await env.ROOM_LIST.getByName('all').list() };
  const res = Response.json(body, {
    headers: { 'cache-control': `public, max-age=${LIST_CACHE_SECONDS}` },
  });
  ctx.waitUntil(caches.default.put(key, res.clone()));
  return res;
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
  async fetch(request, env, ctx): Promise<Response> {
    const { pathname } = new URL(request.url);
    try {
      if (pathname === '/api/rooms') {
        if (request.method === 'POST') return await createRoom(request, env);
        if (request.method === 'GET') return await listRooms(request, env, ctx);
        return json({ error: 'method-not-allowed' }, 405);
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
