import { DurableObject } from 'cloudflare:workers';
import type { RoomListing } from '@guti-arena/engine';

/** Rows not refreshed for this long belong to rooms that died without removing themselves. */
export const LIST_STALE_MS = 35 * 60_000;
export const LIST_MAX = 50;

export interface ListRow {
  listing: RoomListing;
  /** When the room was first listed; newest first within each group. */
  since: number;
}

const group = ({ listing: l }: ListRow) =>
  l.phase !== 'lobby' ? (l.phase === 'playing' ? 2 : 3) : l.seated + l.ai < l.seats ? 0 : 1;

/** Lobbies with a free seat, then full lobbies, then games in play, then ended games; newest first; at most 50. */
export function sortRooms(rows: ListRow[]): RoomListing[] {
  return [...rows]
    .sort((a, b) => group(a) - group(b) || b.since - a.since)
    .slice(0, LIST_MAX)
    .map((x) => x.listing);
}

/** The one list of public and locked rooms (instance name 'all'). Each `Room` keeps its own row current. */
export class RoomList extends DurableObject<Env> {
  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    ctx.storage.sql.exec(
      'CREATE TABLE IF NOT EXISTS rooms (code TEXT PRIMARY KEY, listing TEXT NOT NULL, since INTEGER NOT NULL, updated INTEGER NOT NULL)',
    );
  }

  put(listing: RoomListing): void {
    const now = Date.now();
    this.ctx.storage.sql.exec(
      'INSERT INTO rooms (code, listing, since, updated) VALUES (?, ?, ?, ?) ON CONFLICT(code) DO UPDATE SET listing = excluded.listing, updated = excluded.updated',
      listing.code,
      JSON.stringify(listing),
      now,
      now,
    );
  }

  remove(code: string): void {
    this.ctx.storage.sql.exec('DELETE FROM rooms WHERE code = ?', code);
  }

  list(): RoomListing[] {
    const sql = this.ctx.storage.sql;
    sql.exec('DELETE FROM rooms WHERE updated < ?', Date.now() - LIST_STALE_MS);
    const rows = sql
      .exec<{ listing: string; since: number }>('SELECT listing, since FROM rooms')
      .toArray()
      .map((x) => ({ listing: JSON.parse(x.listing) as RoomListing, since: x.since }));
    return sortRooms(rows);
  }
}
