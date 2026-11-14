import { Link } from 'react-router';
import { Button } from '@/components/ui/button';
import { useT } from '@/i18n';
import { cn } from '@/lib/utils';
import { CTA, WRAP } from '@/share/site-chrome';

export type ProblemKind = 'room-not-found' | 'room-full' | 'daily-limit' | 'create-failed';

/** A friendly dead end with a way out: home, solo play or a new room. */
export function Problem({ kind, onRetry }: { kind: ProblemKind; onRetry?: () => void }) {
  const t = useT('room');
  return (
    <section className={cn(WRAP, 'max-w-xl py-10 4xl:max-w-3xl')}>
      <div className="rounded-clay bg-card p-6 shadow-clay 3xl:p-8">
        <h1 className="font-display text-3xl font-extrabold leading-tight 3xl:text-4xl">
          {t(`problem.${kind}.title`)}
        </h1>
        <p className="mt-3 text-base sm:text-lg">{t(`problem.${kind}.body`)}</p>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row">
          {onRetry && (
            <Button onClick={onRetry} className={CTA}>
              {t('action.retry')}
            </Button>
          )}
          {kind === 'daily-limit' ? (
            <Button asChild className={CTA}>
              <Link to="/play">{t('action.solo')}</Link>
            </Button>
          ) : (
            !onRetry && (
              <Button asChild className={CTA}>
                <Link to="/r/new">{t('action.newRoom')}</Link>
              </Button>
            )
          )}
          <Button asChild variant="ghost" className={cn(CTA, 'shadow-none')}>
            <Link to="/">{t('action.home')}</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
