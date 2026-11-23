import { useCallback, useEffect, useRef, useState } from 'react';
import type { ClientMessage, ReactionId, RoomState, Seat, ServerMessage } from '@guti-arena/engine';
import { playerId, saveName, savedName } from './player.ts';

export type Connection = 'connecting' | 'open' | 'reconnecting';
/** Errors that end the connection for good. */
export type Fatal = 'room-not-found' | 'room-full' | 'daily-limit';
/** Why a locked room has not let us in yet. */
export type Lock = 'need-password' | 'wrong-password';
/** The latest reaction from each seat; `at` tells a repeat of the same reaction apart. */
export type Reactions = Partial<Record<Seat, { id: ReactionId; at: number }>>;

export interface RoomConnection {
  connection: Connection;
  room: RoomState | null;
  you: { playerId: string; seat: Seat | null } | null;
  fatal: Fatal | null;
  /** The last error the server sent for one of our messages, such as `seat-taken`. */
  notice: string | null;
  /** Set when a locked room asked us for its password, or turned the one we sent down. */
  lock: Lock | null;
  /** Reactions still on screen (each lasts `REACTION_MS`). */
  reactions: Reactions;
  /** True for a moment after `react`, while another one would be dropped. */
  reactCooling: boolean;
  send: (m: ClientMessage) => void;
  /** Join (or rename) with this name; it is remembered for next time. The password is kept in memory only. */
  join: (name: string, password?: string) => void;
  react: (id: ReactionId) => void;
}

type JoinMessage = Extract<ClientMessage, { t: 'join' }>;

const MAX_BACKOFF_MS = 5000;
export const REACTION_MS = 3000;
/** The server drops a player's reactions closer together than this. */
const REACT_GAP_MS = 1200;

export const wsUrl = (code: string) =>
  `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/api/rooms/${code}/ws`;

/** Live room state over one WebSocket that reconnects with backoff and rejoins on its own. */
export function useRoom(code: string): RoomConnection {
  const [connection, setConnection] = useState<Connection>('connecting');
  const [room, setRoom] = useState<RoomState | null>(null);
  const [you, setYou] = useState<RoomConnection['you']>(null);
  const [fatal, setFatal] = useState<Fatal | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [lock, setLock] = useState<Lock | null>(null);
  const [reactions, setReactions] = useState<Reactions>({});
  const [reactCooling, setReactCooling] = useState(false);
  const ws = useRef<WebSocket | null>(null);
  // A stored name joins at once, so a refresh mid-game restores the seat without a prompt.
  const name = useRef(savedName());
  // A locked room's password, for rejoining after a reconnect. Never stored or logged.
  const password = useRef<string | undefined>(undefined);

  useEffect(() => {
    let stopped = false;
    let attempt = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;

    function connect() {
      const socket = new WebSocket(wsUrl(code));
      ws.current = socket;
      let opened = false;
      socket.onopen = () => {
        opened = true;
        attempt = 0;
        setConnection('open');
        if (name.current) {
          const m: JoinMessage = { t: 'join', playerId: playerId(), name: name.current };
          if (password.current) m.password = password.current;
          socket.send(JSON.stringify(m));
        }
      };
      socket.onmessage = (e) => {
        const m = JSON.parse(String(e.data)) as ServerMessage;
        if (m.t === 'state') {
          setRoom(m.room);
          setYou(m.you);
          if (m.you.playerId) setLock(null);
        } else if (m.t === 'reaction') {
          setReactions((r) => ({ ...r, [m.seat]: { id: m.id, at: Date.now() } }));
        } else if (m.code === 'room-not-found' || m.code === 'room-full') {
          stopped = true;
          setFatal(m.code);
        } else if (m.code === 'need-password' || m.code === 'wrong-password') {
          password.current = undefined; // don't resend a wrong one on reconnect
          setLock(m.code);
        } else {
          setNotice(m.code);
        }
      };
      socket.onclose = async () => {
        if (stopped) return;
        if (!opened) {
          // A failed upgrade hides its HTTP status; ask the same route over plain HTTP.
          const status = await fetch(`/api/rooms/${code}/ws`).then(
            (r) => r.status,
            () => 0,
          );
          if (status === 429 || status === 503) {
            stopped = true;
            setFatal('daily-limit');
            return;
          }
          if (status === 404) {
            stopped = true;
            setFatal('room-not-found');
            return;
          }
        }
        setConnection('reconnecting');
        timer = setTimeout(connect, Math.min(MAX_BACKOFF_MS, 500 * 2 ** attempt++));
      };
    }

    connect();
    return () => {
      stopped = true;
      clearTimeout(timer);
      ws.current?.close();
    };
  }, [code]);

  // Server notices are short-lived hints.
  useEffect(() => {
    if (!notice) return;
    const id = setTimeout(() => setNotice(null), 3500);
    return () => clearTimeout(id);
  }, [notice]);

  // Each reaction leaves the screen REACTION_MS after it arrived.
  useEffect(() => {
    const ats = Object.values(reactions).map((r) => r.at);
    if (ats.length === 0) return;
    const id = setTimeout(
      () =>
        setReactions((r) =>
          Object.fromEntries(Object.entries(r).filter(([, v]) => Date.now() - v.at < REACTION_MS)),
        ),
      Math.max(0, Math.min(...ats) + REACTION_MS - Date.now()),
    );
    return () => clearTimeout(id);
  }, [reactions]);

  const send = useCallback((m: ClientMessage) => {
    if (ws.current?.readyState === WebSocket.OPEN) ws.current.send(JSON.stringify(m));
  }, []);

  const join = useCallback(
    (n: string, pw?: string) => {
      name.current = n;
      saveName(n);
      if (pw) password.current = pw;
      const m: JoinMessage = { t: 'join', playerId: playerId(), name: n };
      if (password.current) m.password = password.current;
      send(m);
    },
    [send],
  );

  const cooling = useRef(false);
  const react = useCallback(
    (id: ReactionId) => {
      if (cooling.current) return;
      cooling.current = true;
      setReactCooling(true);
      setTimeout(() => {
        cooling.current = false;
        setReactCooling(false);
      }, REACT_GAP_MS);
      send({ t: 'react', id });
    },
    [send],
  );

  return {
    connection,
    room,
    you,
    fatal,
    notice,
    lock,
    reactions,
    reactCooling,
    send,
    join,
    react,
  };
}
