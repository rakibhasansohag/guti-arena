import { useEffect, useRef, type ReactNode } from 'react';
import { useParams } from 'react-router';
import { WifiOff } from 'lucide-react';
import { DEFAULT_LOOK, type Look } from '@guti-arena/engine';
import { GameHeader, Scene, saveLook, savedLook } from '@/game';
import { useT } from '@/i18n';
import { savedName, useRoom } from '@/net';
import { CreateRoom } from '@/room/create-room';
import { Lobby, NameCard } from '@/room/lobby';
import { Problem } from '@/room/problem';
import { RoomGame } from '@/room/room-game';

/** Room codes: 5 letters, no vowels. */
const CODE = /^[BCDFGHJKLMNPQRSTVWXYZ]{5}$/;

export default function Page() {
  const t = useT('room');
  const code = (useParams().code ?? '').toUpperCase();
  return (
    <>
      <title>{t('meta.title')}</title>
      {/* Rooms are private; robots.txt disallows /r/ too. */}
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
  const { connection, room, you, fatal, notice, send, join } = useRoom(code);
  // With a remembered name the hook joins on its own, so only ask when there is none.
  const askName = !savedName();
  const joined = !!you?.playerId;
  const isHost = !!room && joined && room.hostId === you.playerId;
  // Rooms from an older server have no look: the default one.
  const look = room?.look ?? DEFAULT_LOOK;
  const setLook = (l: Look) => {
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
        {!room || !you || (!joined && !askName) ? (
          <p role="status" className="font-display text-lg font-extrabold">
            {t('conn.connecting')}
          </p>
        ) : !joined ? (
          <NameCard code={code} onJoin={join} />
        ) : room.phase === 'lobby' || !room.game ? (
          <Lobby room={room} you={you} send={send} join={join} onLook={isHost ? setLook : null} />
        ) : (
          <RoomGame room={room} game={room.game} you={you} send={send} />
        )}
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
