import { useParams } from 'react-router';
import { WifiOff } from 'lucide-react';
import { GameHeader } from '@/game';
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
    <div className="flex min-h-dvh flex-col">
      <title>{t('meta.title')}</title>
      {/* Rooms are private; robots.txt disallows /r/ too. */}
      <meta name="robots" content="noindex" />
      <GameHeader />
      <main className="flex flex-1 flex-col items-center justify-center pb-4">
        {code === 'NEW' ? (
          <CreateRoom />
        ) : CODE.test(code) ? (
          <Room key={code} code={code} />
        ) : (
          <Problem kind="room-not-found" />
        )}
      </main>
    </div>
  );
}

function Room({ code }: { code: string }) {
  const t = useT('room');
  const { connection, room, you, fatal, notice, send, join } = useRoom(code);
  // With a remembered name the hook joins on its own, so only ask when there is none.
  const askName = !savedName();

  if (fatal) return <Problem kind={fatal} />;
  const joined = !!you?.playerId;
  return (
    <>
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
        <Lobby room={room} you={you} send={send} join={join} />
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
    </>
  );
}
