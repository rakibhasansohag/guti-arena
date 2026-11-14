import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import type { CreateRoomResponse } from '@guti-arena/engine';
import { useT } from '@/i18n';
import { cn } from '@/lib/utils';
import { SITE_KEY, loadTurnstile } from '@/net';
import { WRAP } from '@/share/site-chrome';
import { Problem, type ProblemKind } from './problem.tsx';

/** `/r/new`: pass Turnstile, create the room, then swap the URL for `/r/<code>`. */
export function CreateRoom() {
  const t = useT('room');
  const navigate = useNavigate();
  const box = useRef<HTMLDivElement>(null);
  const [problem, setProblem] = useState<ProblemKind | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (problem) return;
    let live = true;
    let widget: string | null = null;
    async function create(token: string) {
      const res = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ turnstileToken: token }),
      }).catch(() => null);
      if (!live) return;
      if (res?.ok) {
        const { code } = (await res.json()) as CreateRoomResponse;
        navigate(`/r/${code}`, { replace: true });
      } else {
        setProblem(res?.status === 429 || res?.status === 503 ? 'daily-limit' : 'create-failed');
      }
    }
    loadTurnstile().then(
      (ts) => {
        if (!live || !box.current) return;
        widget = ts.render(box.current, {
          sitekey: SITE_KEY,
          theme: 'light',
          callback: (token) => void create(token),
          'error-callback': () => live && setProblem('create-failed'),
        });
      },
      () => live && setProblem('create-failed'),
    );
    return () => {
      live = false;
      if (widget) window.turnstile?.remove(widget);
    };
  }, [attempt, problem, navigate]);

  if (problem) {
    return (
      <Problem
        kind={problem}
        onRetry={
          problem === 'create-failed'
            ? () => {
                setProblem(null);
                setAttempt((a) => a + 1);
              }
            : undefined
        }
      />
    );
  }
  return (
    <section className={cn(WRAP, 'max-w-xl py-10 text-center 4xl:max-w-3xl')}>
      <h1 className="font-display text-3xl font-extrabold leading-tight sm:text-4xl 3xl:text-5xl">
        {t('create.title')}
      </h1>
      <p className="mt-3 text-base sm:text-lg" aria-live="polite">
        {t('create.body')}
      </p>
      <div ref={box} className="mt-6 flex min-h-[65px] justify-center" />
    </section>
  );
}
