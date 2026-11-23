import { useCallback, useEffect, useRef, useState } from 'react';
import type { ClientMessage, RoomState, Seat, ServerMessage } from '@guti-arena/engine';
import { playerId, saveName, savedName } from './player.ts';

export type Connection = 'connecting' | 'open' | 'reconnecting';
/** Errors that end the connection for good. */
export type Fatal = 'room-not-found' | 'room-full' | 'daily-limit';

export interface RoomConnection {
  connection: Connection;
  room: RoomState | null;
  you: { playerId: string; seat: Seat | null } | null;
  fatal: Fatal | null;
  /** The last error the server sent for one of our messages, such as `seat-taken`. */
  notice: string | null;
  send: (m: ClientMessage) => void;
  /** Join (or rename) with this name; it is remembered for next time. */
  join: (name: string) => void;
}

const MAX_BACKOFF_MS = 5000;

export const wsUrl = (code: string) =>
  `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/api/rooms/${code}/ws`;

/** Live room state over one WebSocket that reconnects with backoff and rejoins on its own. */
export function useRoom(code: string): RoomConnection {
  const [connection, setConnection] = useState<Connection>('connecting');
  const [room, setRoom] = useState<RoomState | null>(null);
  const [you, setYou] = useState<RoomConnection['you']>(null);
  const [fatal, setFatal] = useState<Fatal | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const ws = useRef<WebSocket | null>(null);
  // A stored name joins at once, so a refresh mid-game restores the seat without a prompt.
  const name = useRef(savedName());

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
          socket.send(JSON.stringify({ t: 'join', playerId: playerId(), name: name.current }));
        }
      };
      socket.onmessage = (e) => {
        const m = JSON.parse(String(e.data)) as ServerMessage;
        if (m.t === 'state') {
          setRoom(m.room);
          setYou(m.you);
        } else if (m.t === 'reaction') {
          // chat B shows reactions
        } else if (m.code === 'room-not-found' || m.code === 'room-full') {
          stopped = true;
          setFatal(m.code);
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

  const send = useCallback((m: ClientMessage) => {
    if (ws.current?.readyState === WebSocket.OPEN) ws.current.send(JSON.stringify(m));
  }, []);

  const join = useCallback(
    (n: string) => {
      name.current = n;
      saveName(n);
      send({ t: 'join', playerId: playerId(), name: n });
    },
    [send],
  );

  return { connection, room, you, fatal, notice, send, join };
}
