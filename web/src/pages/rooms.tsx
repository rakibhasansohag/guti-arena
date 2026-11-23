import { memo, useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router';
import { Bot, Eye, Lock, Plus, RefreshCw, User } from 'lucide-react';
import {
  BOARD_IDS,
  type BoardId,
  type CourtId,
  type PieceSetId,
  type RoomListResponse,
  type RoomListing,
} from '@guti-arena/engine';
import { Button } from '@/components/ui/button';
import { useNum } from '@/game';
import { BoardPreview } from '@/game/board-base';
import { useT } from '@/i18n';
import { cn } from '@/lib/utils';
import { Seo } from '@/share';
import { CTA, SiteFooter, SiteHeader, WRAP } from '@/share/site-chrome';

const REFRESH_MS = 5000;
const CARD = 'rounded-clay bg-card p-4 text-card-foreground shadow-clay sm:p-5 3xl:p-6';
const CHIP =
  'h-11 shrink-0 rounded-full bg-chalk/70 px-4 font-display text-sm font-extrabold transition-[background-color,color,translate,box-shadow] duration-[200ms,200ms,350ms,350ms] ease-clay hover:-translate-y-0.5 hover:bg-clay/25 hover:shadow-clay active:translate-y-0 aria-pressed:bg-charcoal aria-pressed:text-chalk aria-pressed:hover:bg-charcoal sm:text-base';

type Failure = 'unavailable' | 'failed';
const free = (r: RoomListing) => r.seats - r.seated - r.ai;

/** Public and password rooms with someone in them, refreshed every few seconds while on screen. */
export default function Rooms() {
  const t = useT('room');
  const [rooms, setRooms] = useState<RoomListing[] | null>(null);
  const [failure, setFailure] = useState<Failure | null>(null);
  const [loading, setLoading] = useState(false);
  const [board, setBoard] = useState<BoardId | null>(null);
  const [openOnly, setOpenOnly] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/rooms');
      // The free plan's daily Durable Object limit answers 429 or 503.
      if (res.status === 429 || res.status === 503) return setFailure('unavailable');
      if (!res.ok) return setFailure('failed');
      setRooms(((await res.json()) as RoomListResponse).rooms);
      setFailure(null);
    } catch {
      setFailure('failed');
    } finally {
      setLoading(false);
    }
  }, []);

  // Poll only while the tab is on screen; coming back refreshes at once.
  useEffect(() => {
    let id: ReturnType<typeof setInterval> | undefined;
    const sync = () => {
      clearInterval(id);
      if (document.visibilityState !== 'visible') return;
      void load();
      id = setInterval(() => void load(), REFRESH_MS);
    };
    sync();
    document.addEventListener('visibilitychange', sync);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', sync);
    };
  }, [load]);

  const shown = (rooms ?? []).filter(
    (r) => (!board || r.board === board) && (!openOnly || (r.phase === 'lobby' && free(r) > 0)),
  );

  return (
    <>
      <Seo path="/rooms" title={t('rooms.seo.title')} description={t('rooms.seo.description')} />
      <SiteHeader />
      <main className={cn(WRAP, 'flex flex-col gap-6 pt-6 pb-20 sm:pt-8 3xl:gap-8')}>
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="font-display text-4xl font-extrabold leading-tight sm:text-5xl 3xl:text-6xl">
              {t('rooms.title')}
            </h1>
            <p className="mt-2 max-w-prose text-base sm:text-lg 3xl:text-xl">{t('rooms.lead')}</p>
          </div>
          <div className="flex gap-2">
            <Button asChild className={cn(CTA, 'flex-1 md:flex-none')}>
              <Link to="/r/new">
                <Plus aria-hidden="true" />
                {t('rooms.create')}
              </Link>
            </Button>
            <Button
              variant="secondary"
              onClick={() => void load()}
              aria-label={t('rooms.refresh')}
              title={t('rooms.refresh')}
              className={cn(CTA, 'w-12 px-0 3xl:w-14 3xl:px-0')}
            >
              <RefreshCw aria-hidden="true" className={cn(loading && 'motion-safe:animate-spin')} />
            </Button>
          </div>
        </div>

        <div
          role="group"
          aria-label={t('rooms.filter')}
          // Chips scroll inside their own row on phones, so the page never scrolls sideways.
          className="-mx-4 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0"
        >
          <button
            type="button"
            aria-pressed={openOnly}
            onClick={() => setOpenOnly((o) => !o)}
            className={CHIP}
          >
            {t('rooms.open')}
          </button>
          <span aria-hidden="true" className="mx-1 w-px shrink-0 self-stretch bg-charcoal/20" />
          <button
            type="button"
            aria-pressed={board === null}
            onClick={() => setBoard(null)}
            className={CHIP}
          >
            {t('rooms.all')}
          </button>
          {BOARD_IDS.map((id) => (
            <BoardChip key={id} id={id} on={board === id} onPick={() => setBoard(id)} />
          ))}
        </div>

        {rooms === null && !failure ? (
          <p role="status" className="font-display text-lg font-extrabold">
            {t('rooms.loading')}
          </p>
        ) : rooms === null || failure === 'unavailable' ? (
          <Empty
            title={t(failure === 'unavailable' ? 'problem.daily-limit.title' : 'rooms.error.title')}
            body={t(failure === 'unavailable' ? 'problem.daily-limit.body' : 'rooms.error.body')}
            retry={failure === 'failed' ? () => void load() : undefined}
          />
        ) : rooms.length === 0 ? (
          <Empty title={t('rooms.empty.title')} body={t('rooms.empty.body')} />
        ) : shown.length === 0 ? (
          <p className="font-display text-lg font-extrabold">{t('rooms.emptyFilter')}</p>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 3xl:gap-6 4xl:grid-cols-4">
            {shown.map((r) => (
              <RoomCard key={r.code} room={r} />
            ))}
          </ul>
        )}
      </main>
      <SiteFooter />
    </>
  );
}

function BoardChip({ id, on, onPick }: { id: BoardId; on: boolean; onPick: () => void }) {
  const g = useT('game');
  return (
    <button type="button" aria-pressed={on} onClick={onPick} className={CHIP}>
      {g(`boards.${id}`)}
    </button>
  );
}

/** No rooms, or no list: point people at making a room or solo play. */
function Empty({ title, body, retry }: { title: string; body: string; retry?: () => void }) {
  const t = useT('room');
  return (
    <section className={cn(CARD, 'max-w-2xl')}>
      <h2 className="font-display text-2xl font-extrabold sm:text-3xl">{title}</h2>
      <p className="mt-2 text-base sm:text-lg">{body}</p>
      <div className="mt-5 flex flex-col gap-2 sm:flex-row">
        {retry ? (
          <Button onClick={retry} className={CTA}>
            {t('action.retry')}
          </Button>
        ) : (
          <Button asChild className={CTA}>
            <Link to="/r/new">{t('rooms.create')}</Link>
          </Button>
        )}
        <Button asChild variant="secondary" className={CTA}>
          <Link to="/play">{t('action.solo')}</Link>
        </Button>
      </div>
    </section>
  );
}

// The board pictures are the heaviest part of a card; redraw one only when its board or look changes.
const Preview = memo(function Preview({
  board,
  court,
  pieces,
}: {
  board: BoardId;
  court: CourtId;
  pieces: PieceSetId;
}) {
  return <BoardPreview board={board} look={{ court, pieces }} className="size-full" />;
});

function RoomCard({ room: r }: { room: RoomListing }) {
  const t = useT('room');
  const g = useT('game');
  const num = useNum();
  const open = free(r);
  const status =
    r.phase !== 'lobby'
      ? t('rooms.started')
      : open > 0
        ? t('rooms.waiting', { free: num(open), seats: num(r.seats) })
        : t('rooms.full');
  const action = r.phase === 'lobby' && open > 0 ? 'join' : r.access === 'public' ? 'watch' : null;
  return (
    <li className={cn(CARD, 'flex flex-col gap-4')}>
      <div className="flex gap-4">
        <div className="size-24 shrink-0 rounded-clay bg-chalk/60 p-1 shadow-clay sm:size-28 3xl:size-32">
          <Preview board={r.board} court={r.look.court} pieces={r.look.pieces} />
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <p className="flex items-center gap-2 font-display text-lg font-extrabold leading-tight sm:text-xl">
            <span className="truncate">{g(`boards.${r.board}`)}</span>
            {r.access === 'locked' && (
              <Lock
                role="img"
                aria-label={t('rooms.locked')}
                className="size-4 shrink-0 text-clay-deep"
              />
            )}
          </p>
          <p className="truncate text-sm sm:text-base">{t('rooms.host', { name: r.host })}</p>
          <Pips room={r} />
          <p className="flex flex-wrap items-center gap-2">
            <span
              className={cn(
                'rounded-full px-2.5 py-0.5 font-display text-xs font-extrabold sm:text-sm',
                r.phase !== 'lobby'
                  ? 'bg-charcoal text-chalk'
                  : open > 0
                    ? 'bg-clay-deep text-chalk'
                    : 'bg-chalk text-charcoal ring-1 ring-charcoal/30',
              )}
            >
              {status}
            </span>
            {r.watchers > 0 && (
              <span className="flex items-center gap-1 text-xs sm:text-sm">
                <Eye aria-hidden="true" className="size-3.5" />
                {t('watchers', { n: num(r.watchers) })}
              </span>
            )}
          </p>
        </div>
      </div>
      {action && (
        <Button
          asChild
          variant={action === 'join' ? 'default' : 'secondary'}
          className={cn(CTA, 'mt-auto w-full')}
        >
          <Link
            to={`/r/${r.code}`}
            aria-label={`${t(`rooms.${action}`)}: ${g(`boards.${r.board}`)}, ${t('rooms.host', { name: r.host })}`}
          >
            {action === 'watch' && <Eye aria-hidden="true" />}
            {t(`rooms.${action}`)}
          </Link>
        </Button>
      )}
    </li>
  );
}

/** One pip per seat: people, AI, then free seats. */
function Pips({ room: r }: { room: RoomListing }) {
  const t = useT('room');
  const num = useNum();
  const kinds = Array.from({ length: r.seats }, (_, i) =>
    i < r.seated ? 'human' : i < r.seated + r.ai ? 'ai' : 'empty',
  );
  return (
    <p
      role="img"
      aria-label={t('rooms.seats', {
        people: num(r.seated),
        ai: num(r.ai),
        free: num(free(r)),
      })}
      className="flex gap-1"
    >
      {kinds.map((k, i) => (
        <span
          key={i}
          className={cn(
            'grid size-6 place-items-center rounded-full',
            k === 'human' && 'bg-charcoal text-chalk',
            k === 'ai' && 'bg-clay text-chalk',
            k === 'empty' && 'border-2 border-dashed border-charcoal/40',
          )}
        >
          {k === 'human' && <User aria-hidden="true" className="size-3.5" />}
          {k === 'ai' && <Bot aria-hidden="true" className="size-3.5" />}
        </span>
      ))}
    </p>
  );
}
