import { useState, type FormEvent } from 'react';
import { Check, Eye, Globe, Link2, Lock, Share2 } from 'lucide-react';
import {
  ACCESS,
  BOARDS,
  PASSWORD_MAX,
  type AiLevel,
  type BoardId,
  type ClientMessage,
  type Look,
  type RoomState,
  type Seat,
  type SeatInfo,
} from '@guti-arena/engine';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { BoardPicker, LookPicker, SEGMENT, SeatPip, SetupLayout, useNum } from '@/game';
import { useT } from '@/i18n';
import { cn } from '@/lib/utils';
import { savedName, type Lock as LockReason } from '@/net';
import { useSeatName } from '@/game/use-seat-name';
import { shareInvite, type InviteResult } from '@/share';
import { CTA, WRAP } from '@/share/site-chrome';

const LEVELS: (AiLevel | null)[] = [null, 'easy', 'medium', 'hard'];
const CARD = 'rounded-clay bg-card p-4 shadow-clay sm:p-6 3xl:p-8';

/** Ask for a name before joining; the name is remembered for next time. */
export function NameCard({ code, onJoin }: { code: string; onJoin: (name: string) => void }) {
  const t = useT('room');
  return (
    <section className={cn(WRAP, 'max-w-xl py-10 4xl:max-w-3xl')}>
      <h1 className="font-display text-3xl font-extrabold leading-tight sm:text-4xl 3xl:text-5xl">
        {t('join.title', { code })}
      </h1>
      <p className="mt-3 text-base sm:text-lg">{t('join.body')}</p>
      <div className={cn(CARD, 'mt-6')}>
        <NameForm label={t('join.button')} onSave={onJoin} />
      </div>
    </section>
  );
}

/** Ask a locked room's newcomers for its password and a name. */
export function LockCard({
  code,
  lock,
  onJoin,
}: {
  code: string;
  lock: LockReason | null;
  onJoin: (name: string, password: string) => void;
}) {
  const t = useT('room');
  return (
    <section className={cn(WRAP, 'max-w-xl py-10 4xl:max-w-3xl')}>
      <h1 className="flex items-center gap-3 font-display text-3xl font-extrabold leading-tight sm:text-4xl 3xl:text-5xl">
        <Lock aria-hidden="true" className="size-8 shrink-0 3xl:size-10" />
        {t('lock.title', { code })}
      </h1>
      <p className="mt-3 text-base sm:text-lg">{t('lock.body')}</p>
      <div className={cn(CARD, 'mt-6')}>
        <NameForm
          label={t('lock.button')}
          onSave={(name, pw) => onJoin(name, pw ?? '')}
          password={lock === 'wrong-password' ? 'wrong' : 'ask'}
        />
      </div>
    </section>
  );
}

const FIELD = 'h-12 rounded-full bg-chalk px-5 text-base';

function NameForm({
  label,
  onSave,
  password,
}: {
  label: string;
  onSave: (name: string, password?: string) => void;
  /** Also ask for a room password; 'wrong' says the last one was turned down. */
  password?: 'ask' | 'wrong';
}) {
  const t = useT('room');
  const [name, setName] = useState(savedName);
  const [pw, setPw] = useState('');
  const ok = !!name.trim() && (!password || !!pw);
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (ok) onSave(name.trim(), password ? pw : undefined);
  };
  return (
    <form onSubmit={submit} className="flex flex-col gap-2">
      <label htmlFor="player-name" className="font-display font-extrabold">
        {t('name.label')}
      </label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          id="player-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={20}
          autoComplete="nickname"
          placeholder={t('name.placeholder')}
          className={FIELD}
        />
        {!password && (
          <Button type="submit" disabled={!ok} className={CTA}>
            {label}
          </Button>
        )}
      </div>
      {password && (
        <>
          <label htmlFor="room-password" className="mt-2 font-display font-extrabold">
            {t('lock.label')}
          </label>
          <Input
            id="room-password"
            type="password"
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            maxLength={PASSWORD_MAX}
            autoComplete="off"
            aria-invalid={password === 'wrong'}
            aria-describedby={password === 'wrong' ? 'password-error' : undefined}
            className={FIELD}
          />
          {password === 'wrong' && (
            <p
              id="password-error"
              role="alert"
              className="font-display font-extrabold text-clay-deep"
            >
              {t('lock.wrong')}
            </p>
          )}
          <Button type="submit" disabled={!ok} className={cn(CTA, 'mt-2')}>
            {label}
          </Button>
        </>
      )}
    </form>
  );
}

const ACCESS_ICON = { private: Link2, public: Globe, locked: Lock } as const;

/** The host picks who can find and enter the room; guests see a badge. */
function AccessPicker({
  room,
  isHost,
  send,
}: {
  room: RoomState;
  isHost: boolean;
  send: (m: ClientMessage) => void;
}) {
  const t = useT('room');
  const num = useNum();
  // Rooms from an older server have no access: private.
  const access = room.access ?? 'private';
  const [editing, setEditing] = useState(false);
  const [pw, setPw] = useState('');
  const shown = editing ? 'locked' : access;
  const watchers =
    room.watchers > 0 ? (
      <span className="flex items-center gap-1.5 text-sm">
        <Eye aria-hidden="true" className="size-4" />
        {t('watchers', { n: num(room.watchers) })}
      </span>
    ) : null;

  if (!isHost) {
    const Icon = ACCESS_ICON[access];
    return (
      <p className="flex flex-wrap items-center gap-3">
        <span className="flex items-center gap-1.5 rounded-full bg-chalk px-3 py-1 font-display font-extrabold text-charcoal shadow-clay">
          <Icon aria-hidden="true" className="size-4" />
          {t(`access.badge.${access}`)}
        </span>
        {watchers}
      </p>
    );
  }

  const save = (e: FormEvent) => {
    e.preventDefault();
    if (!pw) return;
    send({ t: 'set-access', access: 'locked', password: pw });
    setPw('');
    setEditing(false);
  };
  return (
    <div className={cn(CARD, 'flex max-w-xl flex-col gap-2')}>
      <p id="access-label" className="font-display font-extrabold">
        {t('access.label')}
      </p>
      <div
        role="group"
        aria-labelledby="access-label"
        className="flex gap-1 rounded-full bg-chalk/70 p-1"
      >
        {ACCESS.map((a) => {
          const Icon = ACCESS_ICON[a];
          return (
            <button
              key={a}
              type="button"
              aria-pressed={shown === a}
              onClick={() => {
                if (a === 'locked') return setEditing(true);
                setEditing(false);
                if (a !== access) send({ t: 'set-access', access: a });
              }}
              className={cn(SEGMENT, 'flex items-center justify-center gap-1.5')}
            >
              <Icon aria-hidden="true" className="size-4 shrink-0" />
              {t(`access.${a}`)}
            </button>
          );
        })}
      </div>
      <p className="text-sm">{t(`access.${shown}.hint`)}</p>
      {shown === 'locked' && (
        <form onSubmit={save} className="flex flex-col gap-2 sm:flex-row">
          <label htmlFor="set-password" className="sr-only">
            {t('access.password')}
          </label>
          <Input
            id="set-password"
            type="password"
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            maxLength={PASSWORD_MAX}
            autoComplete="off"
            placeholder={t(access === 'locked' ? 'access.passwordNew' : 'access.password')}
            className={FIELD}
          />
          <Button type="submit" disabled={!pw} className={CTA}>
            {t('access.save')}
          </Button>
        </form>
      )}
      {watchers}
    </div>
  );
}

function Invite({ code }: { code: string }) {
  const t = useT('room');
  const [result, setResult] = useState<InviteResult | null>(null);
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={async () => setResult(await shareInvite(code))} className={CTA}>
          {result?.method === 'copied' ? <Check /> : <Share2 />}
          {t(result?.method === 'copied' ? 'invite.copied' : 'invite.button')}
        </Button>
        <span
          className="font-display text-lg font-extrabold tracking-[0.2em]"
          aria-label={t('invite.code', { code })}
        >
          {code}
        </span>
      </div>
      {result && result.method === 'none' && (
        <p className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
          <span className="select-all font-mono">{result.url}</span>
          <a
            href={result.whatsapp}
            target="_blank"
            rel="noreferrer"
            className="underline underline-offset-4"
          >
            WhatsApp
          </a>
          <a href={result.messenger} className="underline underline-offset-4">
            Messenger
          </a>
        </p>
      )}
    </div>
  );
}

function SeatRow({
  info,
  board,
  mine,
  isHost,
  send,
}: {
  info: SeatInfo;
  board: BoardId;
  mine: boolean;
  isHost: boolean;
  send: (m: ClientMessage) => void;
}) {
  const t = useT('room');
  const seat: Seat = info.seat;
  const colour = useSeatName(board)(seat);
  const who =
    info.kind === 'human'
      ? `${info.name}${mine ? ` (${t('seat.you')})` : ''}`
      : info.kind === 'ai'
        ? t('seat.ai', { level: t(`level.${info.level}`) })
        : t('seat.empty');
  return (
    <li className="flex flex-col gap-2 border-t border-charcoal/10 pt-3 first:border-0 first:pt-0 sm:flex-row sm:items-center">
      <span className="flex min-w-0 flex-1 items-center gap-3">
        <SeatPip seat={seat} board={board} />
        <span className="min-w-0">
          <span className="block font-display font-extrabold">{colour}</span>
          <span className={cn('block truncate text-sm', info.kind === 'empty' && 'opacity-70')}>
            {who}
            {info.kind === 'human' && !info.connected && ` · ${t('seat.away')}`}
          </span>
        </span>
      </span>
      {mine ? (
        <Button
          variant="outline"
          onClick={() => send({ t: 'stand' })}
          className="h-11 rounded-full bg-chalk px-5 font-display font-extrabold"
        >
          {t('seat.stand')}
        </Button>
      ) : (
        info.kind === 'empty' && (
          <Button
            onClick={() => send({ t: 'sit', seat })}
            className="h-11 rounded-full px-5 font-display font-extrabold shadow-clay"
          >
            {t('seat.sit')}
          </Button>
        )
      )}
      {isHost && info.kind !== 'human' && (
        <div
          role="group"
          aria-label={t('seat.aiFor', { colour })}
          className="flex gap-1 rounded-full bg-chalk/70 p-1 sm:w-80"
        >
          {LEVELS.map((level) => (
            <button
              key={level ?? 'off'}
              type="button"
              aria-pressed={info.level === level}
              onClick={() => send({ t: 'set-ai', seat, level })}
              className={SEGMENT}
            >
              {t(level ? `level.${level}` : 'level.off')}
            </button>
          ))}
        </div>
      )}
    </li>
  );
}

export function Lobby({
  room,
  you,
  send,
  join,
  look,
  onLook,
}: {
  room: RoomState;
  you: { playerId: string; seat: Seat | null };
  send: (m: ClientMessage) => void;
  join: (name: string) => void;
  /** The look to draw: the host's latest tap before the server confirms it. */
  look: Look;
  /** Null for guests: the host picks the look for everyone. */
  onLook: ((look: Look) => void) | null;
}) {
  const t = useT('room');
  const isHost = room.hostId === you.playerId;
  // Rooms from an older server have no board: the four-colour board.
  const board = BOARDS[room.board ?? 'four'];
  const seats = room.seats.filter((s) => board.seats.includes(s.seat));
  const ready = seats.every((s) => s.kind !== 'empty');
  return (
    <section className={cn(WRAP, 'py-6 sm:py-10')}>
      <h1 className="font-display text-3xl font-extrabold leading-tight sm:text-4xl 3xl:text-5xl">
        {t('lobby.title')}
      </h1>
      <p className="mt-2 max-w-prose text-base sm:text-lg">
        {t(isHost ? 'lobby.leadHost' : 'lobby.lead')}
      </p>
      <div className="mt-5">
        <Invite code={room.code} />
      </div>
      <div className="mt-5">
        <AccessPicker room={room} isHost={isHost} send={send} />
      </div>

      <SetupLayout board={board.id} look={look}>
        <BoardPicker
          value={board.id}
          onChange={isHost ? (id) => send({ t: 'set-board', board: id }) : null}
        />
        <h2 className="mt-6 font-display text-lg font-extrabold">{t('lobby.seats')}</h2>
        <ul className="mt-3 flex flex-col gap-3">
          {seats.map((s) => (
            <SeatRow
              key={s.seat}
              info={s}
              board={board.id}
              mine={you.seat === s.seat}
              isHost={isHost}
              send={send}
            />
          ))}
        </ul>
        <LookPicker value={look} onChange={onLook} className="mt-6" />
        <div className="sticky bottom-3 z-10 mt-8 flex flex-col gap-2 sm:flex-row sm:items-center">
          {isHost ? (
            <>
              <Button
                disabled={!ready}
                onClick={() => send({ t: 'start' })}
                className={cn(CTA, 'shadow-clay-lift')}
              >
                {t('lobby.start')}
              </Button>
              {!ready && (
                <p className="rounded-full bg-chalk px-3 py-1 text-sm">{t('lobby.needAll')}</p>
              )}
            </>
          ) : (
            <p className="rounded-full bg-chalk px-3 py-1 font-display font-extrabold">
              {t('lobby.waitHost')}
            </p>
          )}
        </div>
      </SetupLayout>

      <div className={cn(CARD, 'mt-6')}>
        <NameForm label={t('name.save')} onSave={join} />
      </div>
    </section>
  );
}
