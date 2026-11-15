import { Link } from 'react-router';
import { useT } from '@/i18n';
import { cn } from '@/lib/utils';
import { LangSwitch } from './lang-switch.tsx';

export const REPO_URL = 'https://github.com/rakibhasansohag/guti-arena';
export const AUTHOR_URL = 'https://rakibhasansohag.com';

/** Page container: equal side gutters, wider on 2K and 4K screens. */
export const WRAP = 'mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8 4xl:max-w-[96rem]';

/** Pill call-to-action that steps up on hover and presses on click. */
export const CTA =
  'h-12 rounded-full px-6 text-base font-display font-extrabold shadow-clay transition-[translate,box-shadow,background-color,color] duration-[350ms,350ms,200ms,200ms] ease-clay hover:-translate-y-0.5 hover:shadow-clay-lift active:translate-y-px active:shadow-clay 3xl:h-14 3xl:px-8';

export function Logo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" className={cn('size-8', className)}>
      <ellipse cx="16" cy="25" rx="10" ry="3.5" fill="var(--color-charcoal)" opacity=".3" />
      <circle
        cx="16"
        cy="15"
        r="11"
        fill="var(--color-clay)"
        stroke="var(--color-charcoal)"
        strokeWidth="1.6"
      />
      <ellipse cx="12" cy="10.5" rx="4.5" ry="2.8" fill="#fff" opacity=".4" />
    </svg>
  );
}

export function SiteHeader() {
  const t = useT('landing');
  return (
    <header className={cn(WRAP, 'flex items-center justify-between gap-3 py-4')}>
      <Link
        to="/"
        className="flex items-center gap-2 rounded-full font-display text-xl font-extrabold transition-opacity duration-200 hover:opacity-80"
      >
        <Logo />
        <span lang="en">Guti Arena</span>
      </Link>
      <nav className="flex items-center gap-3 sm:gap-5">
        <Link
          to="/how-to-play"
          className="hidden bg-[linear-gradient(currentColor,currentColor)] bg-[length:0%_2px] bg-bottom-left bg-no-repeat pb-0.5 font-display font-extrabold transition-[background-size] duration-300 ease-clay hover:bg-[length:100%_2px] sm:inline"
        >
          {t('nav.howToPlay')}
        </Link>
        <LangSwitch />
        <Link
          to="/play"
          className="hidden h-10 items-center rounded-full bg-primary px-5 font-display font-extrabold text-primary-foreground shadow-clay transition-[translate,box-shadow] duration-[350ms] ease-clay hover:-translate-y-0.5 hover:shadow-clay-lift active:translate-y-px active:shadow-clay md:inline-flex"
        >
          {t('cta.play')}
        </Link>
      </nav>
    </header>
  );
}

export function SiteFooter() {
  const t = useT('landing');
  const link =
    'underline decoration-charcoal/30 underline-offset-4 transition-colors duration-200 hover:decoration-charcoal';
  return (
    <footer className="bg-charcoal text-chalk">
      <div
        className={cn(
          WRAP,
          'flex flex-col gap-6 py-10 md:flex-row md:items-center md:justify-between',
        )}
      >
        <div className="flex items-center gap-3">
          <Logo />
          <div>
            <p lang="en" className="font-display text-lg font-extrabold">
              Guti Arena
            </p>
            <p className="text-sm text-chalk/80">
              {t('footer.madeBy')}{' '}
              <a
                href={AUTHOR_URL}
                rel="author"
                className={cn(
                  link,
                  'font-display font-extrabold text-chalk decoration-chalk/40 hover:decoration-chalk',
                )}
              >
                {t('footer.author')}
              </a>
            </p>
          </div>
        </div>
        <nav className="flex flex-wrap items-center gap-x-6 gap-y-3 text-sm">
          <Link
            to="/how-to-play"
            className={cn(link, 'decoration-chalk/40 hover:decoration-chalk')}
          >
            {t('nav.howToPlay')}
          </Link>
          <a href={REPO_URL} className={cn(link, 'decoration-chalk/40 hover:decoration-chalk')}>
            {t('footer.source')}
          </a>
          <LangSwitch className="bg-chalk/10 text-chalk shadow-none [&_button:hover]:bg-chalk/20 [&_button[aria-pressed=true]]:bg-chalk [&_button[aria-pressed=true]]:text-charcoal" />
        </nav>
      </div>
      <p className={cn(WRAP, 'pb-8 text-xs text-chalk/70')}>{t('footer.licence')}</p>
    </footer>
  );
}
