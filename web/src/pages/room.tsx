import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useParams } from 'react-router';
import { WifiOff } from 'lucide-react';
import { DEFAULT_LOOK, type Look } from '@guti-arena/engine';
import { GameHeader, Scene, saveLook, savedLook } from '@/game';
import { useT } from '@/i18n';
import { savedName, useRoom } from '@/net';
import { CreateRoom } from '@/room/create-room';
import { Lobby, LockCard, NameCard } from '@/room/lobby';
import { Problem } from '@/room/problem';
import { RoomGame } from '@/room/room-game';

/** Room codes: 5 letters, no vowels. */
const CODE = /^[BCDFGHJKLMNPQRSTVWXYZ]{5}$/;
/** How long a look the host tapped waits for the server before the screen goes back. */
const LOOK_WAIT_MS = 3000;

export default function Page() {
  const t = useT('room');
  const code = (useParams().code ?? '').toUpperCase();
  return (
    <>
      <title>{t('meta.title')}</title>
      {/* Rooms are not pages to find; robots.txt disallows /r/ too. */}
      <meta name="robots" content="noindex" />
      {CODE.test(code) ? (
        <Room key={code} code={code} />
      ) : (
        <Scene look={DEFAULT_LOOK}>
          <GameHeader />
          <Main>{code === 'NEW' ? <CreateRoom /> : <Problem kind="room-not-found" />}</Main>
        </Scene>
      )}
    </>
  );
}

const Main = ({ children }: { children: ReactNode }) => (
  <main className="flex flex-1 flex-col items-center justify-center pb-4">{children}</main>
);

const same = (a: Look, b: Look) => a.court === b.court && a.pieces === b.pieces;

function Room({ code }: { code: string }) {
  const t = useT('room');
  const { connection, room, you, fatal, notice, lock, reactions, reactCooling, send, join, react } =
    useRoom(code);
  // With a remembered name the hook joins on its own, so only ask when there is none.
  const askName = !savedName();
  const joined = !!you?.playerId;
  const isHost = !!room && joined && room.hostId === you.playerId;
  // Rooms from an older server have no look: the default one.
  const serverLook = room?.look ?? DEFAULT_LOOK;

  // The host's tap shows at once; the server's echo (or LOOK_WAIT_MS) settles it.
  const [pending, setPending] = useState<Look | null>(null);
  if (pending && same(pending, serverLook)) setPending(null);
  useEffect(() => {
    if (!pending) return;
    const id = setTimeout(() => setPending(null), LOOK_WAIT_MS);
    return () => clearTimeout(id);
  }, [pending]);
  const look = pending ?? serverLook;
  const setLook = (l: Look) => {
    setPending(l);
    saveLook(l); // the host's choice is also remembered on this device
    send({ t: 'set-look', look: l });
  };

  // A new room starts with the default look; the host brings the look this device remembers.
  const seeded = useRef(false);
  useEffect(() => {
    if (!isHost || seeded.current || !room) return;
    seeded.current = true;
    if (same(room.look ?? DEFAULT_LOOK, DEFAULT_LOOK) && !same(savedLook(), DEFAULT_LOOK))
      send({ t: 'set-look', look: savedLook() });
  }, [isHost, room, send]);

  if (fatal)
    return (
      <Scene look={DEFAULT_LOOK}>
        <GameHeader />
        <Main>
          <Problem kind={fatal} />
        </Main>
      </Scene>
    );

  const connecting = (
    <p role="status" className="font-display text-lg font-extrabold">
      {t('conn.connecting')}
    </p>
  );
  let body: ReactNode;
  if (!room || !you) body = connecting;
  else if (joined)
    body =
      room.phase === 'lobby' || !room.game ? (
        <Lobby
          room={room}
          you={you}
          send={send}
          join={join}
          look={look}
          onLook={isHost ? setLook : null}
        />
      ) : (
        <RoomGame
          room={room}
          game={room.game}
          you={you}
          send={send}
          reactions={reactions}
          react={you.seat === null ? null : { onReact: react, cooling: reactCooling }}
        />
      );
  // A locked room shows nothing until the password is right. A remembered name has already
  // tried to join, so wait for the server's answer before asking.
  else if (room.access === 'locked')
    body = askName || lock ? <LockCard code={code} lock={lock} onJoin={join} /> : connecting;
  // A game in play can be watched straight away, without a name.
  else if (room.game && room.phase !== 'lobby')
    body = (
      <RoomGame
        room={room}
        game={room.game}
        you={you}
        send={send}
        reactions={reactions}
        react={null}
      />
    );
  else body = askName ? <NameCard code={code} onJoin={join} /> : connecting;

  return (
    <Scene look={look}>
      <GameHeader help={room?.game ? (room.game.board ?? 'four') : undefined} />
      <Main>
        {connection === 'reconnecting' && (
          <p
            role="status"
            className="fixed inset-x-0 top-0 z-20 flex items-center justify-center gap-2 bg-charcoal px-4 py-2 font-display font-extrabold text-chalk"
          >
            <WifiOff aria-hidden="true" className="size-4" />
            {t('conn.reconnecting')}
          </p>
        )}
        {body}
        {notice && (
          <p
            role="status"
            className="fixed inset-x-4 bottom-4 z-20 mx-auto max-w-sm rounded-clay bg-charcoal px-4 py-3 text-center text-chalk shadow-clay-lift"
          >
            {t(`error.${notice}`)}
          </p>
        )}
      </Main>
    </Scene>
  );
}
