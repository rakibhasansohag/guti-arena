import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router';
import { Bot, CodeXml, Users } from 'lucide-react';
import { startPoints, type PointId, type Seat } from '@guti-arena/engine';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useLang, useT } from '@/i18n';
import { cn } from '@/lib/utils';
import { BoardArt, SeatMark } from '@/share/board-art';
import { SEAT_FILL } from '@/share/seat-colours';
import { Seo, SITE_URL } from '@/share/seo';
import { AUTHOR_URL, CTA, REPO_URL, SiteFooter, SiteHeader, WRAP } from '@/share/site-chrome';

const SEATS: Seat[] = [0, 1, 2, 3];
const START: Record<PointId, Seat> = Object.fromEntries(
  SEATS.flatMap((s) => startPoints(s).map((p) => [p, s])),
);
const NORTH_TRIANGLE = Object.fromEntries(startPoints(0).map((p) => [p, 0 as Seat]));
const FAQ = ['account', 'free', 'phone', 'online', 'capture', 'offline'];
/** Room codes: 5 letters, no vowels. */
const CODE = /^[B-DF-HJ-NP-TV-Z]{5}$/;

// Below-the-fold sections skip style and layout until they near the viewport, so the hero paints first.
const LATER = '[content-visibility:auto] [contain-intrinsic-size:auto_900px]';
const SECTION = `py-20 lg:py-28 3xl:py-36 ${LATER}`;
const H2 = 'font-display text-3xl font-extrabold leading-tight sm:text-4xl 3xl:text-5xl';
const CARD = 'rounded-clay bg-card p-6 shadow-clay 3xl:p-8';

function JoinForm() {
  const t = useT('landing');
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const [error, setError] = useState(false);
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const c = code.trim().toUpperCase();
    if (!CODE.test(c)) return setError(true);
    navigate(`/r/${c}`);
  };
  return (
    <form onSubmit={submit} noValidate className="flex max-w-md flex-col gap-2">
      <label htmlFor="room-code" className="font-display font-extrabold">
        {t('join.label')}
      </label>
      <div className="flex gap-2">
        <Input
          id="room-code"
          value={code}
          onChange={(e) => {
            setCode(e.target.value.toUpperCase());
            setError(false);
          }}
          placeholder={t('join.placeholder')}
          maxLength={5}
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          aria-invalid={error}
          aria-describedby={error ? 'room-code-error' : undefined}
          className="h-12 rounded-full border-charcoal/25 bg-chalk px-5 text-base tracking-[0.2em] uppercase placeholder:tracking-normal placeholder:normal-case"
        />
        <Button type="submit" variant="secondary" className={cn(CTA, 'shrink-0')}>
          {t('join.submit')}
        </Button>
      </div>
      {error && (
        <p
          id="room-code-error"
          role="alert"
          className="text-sm font-display font-extrabold text-destructive"
        >
          {t('join.error')}
        </p>
      )}
    </form>
  );
}

export default function Landing() {
  const t = useT('landing');
  const lang = useLang();
  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'VideoGame',
      name: 'Guti Arena',
      alternateName: ['ষোলো গুটি', 'Sholo Guti'],
      url: `${SITE_URL}/`,
      description: t('seo.description'),
      image: `${SITE_URL}/og/guti-arena.png`,
      genre: ['Board game', 'Strategy'],
      gamePlatform: 'Web browser',
      applicationCategory: 'GameApplication',
      operatingSystem: 'Any',
      playMode: ['SinglePlayer', 'MultiPlayer'],
      numberOfPlayers: { '@type': 'QuantitativeValue', minValue: 2, maxValue: 4 },
      inLanguage: ['bn', 'en'],
      isAccessibleForFree: true,
      author: { '@type': 'Person', name: 'Rakib Hasan Sohag', url: AUTHOR_URL },
      license: 'https://opensource.org/license/mit',
      codeRepository: REPO_URL,
    },
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: FAQ.map((k) => ({
        '@type': 'Question',
        name: t(`faq.${k}.q`),
        acceptedAnswer: { '@type': 'Answer', text: t(`faq.${k}.a`) },
      })),
    },
  ];

  return (
    <>
      <Seo path="/" title={t('seo.title')} description={t('seo.description')} jsonLd={jsonLd} />
      <div className="flex min-h-svh flex-col">
        <SiteHeader />
        <main
          id="top"
          className={cn(
            WRAP,
            'grid flex-1 items-center gap-10 pb-12 lg:grid-cols-[1fr_1.05fr] lg:gap-14',
          )}
        >
          <div className="flex flex-col gap-6">
            <h1 className="font-display text-4xl font-extrabold leading-[1.1] text-balance sm:text-5xl lg:text-6xl 3xl:text-7xl">
              {t('hero.title')}
            </h1>
            <p className="max-w-xl text-lg 3xl:text-xl">{t('hero.sub')}</p>
            <p className="font-display text-base font-extrabold 3xl:text-lg">{t('hero.fact')}</p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button asChild className={CTA}>
                <Link to="/play">{t('cta.play')}</Link>
              </Button>
              <Button asChild variant="secondary" className={CTA}>
                <Link to="/r/new">{t('cta.friends')}</Link>
              </Button>
            </div>
            <JoinForm />
          </div>
          <BoardArt
            pieces={START}
            hop={{ from: 'g-2-3', to: 'g-3-3' }}
            image="hero"
            label={t('seo.board')}
            className="mx-auto aspect-square w-full max-w-[min(100%,78svh)]"
          />
        </main>
      </div>

      <section aria-labelledby="how-title" className={cn(WRAP, SECTION)}>
        <h2 id="how-title" className={H2}>
          {t('how.title')}
        </h2>
        <ol className="mt-10 grid gap-6 md:grid-cols-3">
          {[
            { n: 1, view: [0, 0, 1, 1], pieces: {}, label: 'how.diagram1' },
            {
              n: 2,
              view: [-0.6, 2.2, 4.2, 1.6],
              pieces: { 'g-3-0': 0, 'g-3-1': 3 },
              arrows: [{ from: 'g-3-0', to: 'g-3-2' }],
              label: 'how.diagram2',
            },
            {
              n: 3,
              view: [0.4, 0.4, 5.2, 5.2],
              pieces: { 'g-1-2': 0, 'g-2-4': 0, 'g-3-1': 0, 'g-4-3': 0, 'g-5-5': 0 },
              label: 'how.diagram3',
            },
          ].map(({ n, view, pieces, arrows, label }) => (
            <li key={n} className={cn(CARD, 'flex flex-col gap-4')}>
              {n === 1 ? (
                <svg
                  viewBox="-0.6 -0.9 4.2 1.8"
                  role="img"
                  aria-label={t(label)}
                  className="h-40 w-full 3xl:h-52"
                >
                  {SEATS.map((s) => (
                    <g key={s}>
                      <ellipse
                        cx={s}
                        cy={0.32}
                        rx={0.36}
                        ry={0.12}
                        fill="var(--color-charcoal)"
                        opacity={0.25}
                      />
                      <circle
                        cx={s}
                        cy={0}
                        r={0.4}
                        fill={SEAT_FILL[s]}
                        stroke="var(--color-charcoal)"
                        strokeWidth={0.05}
                      />
                      <ellipse
                        cx={s - 0.12}
                        cy={-0.15}
                        rx={0.17}
                        ry={0.1}
                        fill="#fff"
                        opacity={0.45}
                      />
                      <SeatMark
                        seat={s}
                        x={s}
                        y={0.03}
                        colour={s === 1 || s === 2 ? 'var(--color-charcoal)' : 'var(--color-chalk)'}
                      />
                    </g>
                  ))}
                </svg>
              ) : (
                <BoardArt
                  pieces={pieces as Record<PointId, Seat>}
                  view={view as [number, number, number, number]}
                  arrows={arrows}
                  label={t(label)}
                  className="h-40 w-full 3xl:h-52"
                />
              )}
              <h3 className="font-display text-xl font-extrabold 3xl:text-2xl">
                <span className="mr-2 text-clay">
                  {n.toLocaleString(lang === 'bn' ? 'bn-BD' : 'en')}.
                </span>
                {t(`how.${n}.title`)}
              </h3>
              <p>{t(`how.${n}.body`)}</p>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="story-title" className="bg-chalk">
        <div className={cn(WRAP, SECTION, 'grid items-center gap-10 lg:grid-cols-2')}>
          <div className="flex flex-col gap-6">
            <h2 id="story-title" className={H2}>
              {t('story.title')}
            </h2>
            <p className="max-w-xl text-lg 3xl:text-xl">{t('story.body')}</p>
            <ul className="flex flex-col gap-1 font-display text-4xl font-extrabold text-clay sm:text-5xl 3xl:text-6xl">
              <li>{t('story.points')}</li>
              <li>{t('story.pieces')}</li>
              <li>{t('story.seats')}</li>
            </ul>
          </div>
          <BoardArt
            pieces={NORTH_TRIANGLE}
            view={[-0.6, -2.7, 7.2, 4.3]}
            label={t('story.diagram')}
            className="w-full"
          />
        </div>
      </section>

      <section aria-labelledby="features-title" className={cn(WRAP, SECTION)}>
        <h2 id="features-title" className={H2}>
          {t('features.title')}
        </h2>
        <ul className="mt-10 grid gap-6 md:grid-cols-3">
          {[
            { k: 'seats', Icon: Users },
            { k: 'ai', Icon: Bot },
            { k: 'free', Icon: CodeXml },
          ].map(({ k, Icon }) => (
            <li key={k} className={cn(CARD, 'flex flex-col gap-3')}>
              <span className="grid size-12 place-items-center rounded-full bg-clay text-chalk shadow-clay">
                <Icon aria-hidden="true" className="size-6" />
              </span>
              <h3 className="font-display text-xl font-extrabold 3xl:text-2xl">
                {t(`features.${k}.title`)}
              </h3>
              <p>{t(`features.${k}.body`)}</p>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="faq-title" className={cn(WRAP, SECTION)}>
        <h2 id="faq-title" className={H2}>
          {t('faq.title')}
        </h2>
        <Accordion
          type="single"
          collapsible
          className={cn(
            CARD,
            'mt-8 max-w-3xl px-6 py-2 4xl:max-w-5xl [--tw-duration:350ms] [--tw-ease:cubic-bezier(.22,1,.36,1)]',
          )}
        >
          {FAQ.map((k) => (
            <AccordionItem key={k} value={k} className="border-charcoal/15">
              <AccordionTrigger className="py-4 text-base font-display font-extrabold hover:no-underline 3xl:text-lg">
                {t(`faq.${k}.q`)}
              </AccordionTrigger>
              <AccordionContent className="pb-4 text-base 3xl:text-lg">
                {t(`faq.${k}.a`)}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>

      <section aria-labelledby="close-title" className={cn('bg-clay-deep text-chalk', LATER)}>
        <div
          className={cn(
            WRAP,
            'flex flex-col items-start gap-6 py-20 md:flex-row md:items-center md:justify-between 3xl:py-28',
          )}
        >
          <div className="flex flex-col gap-3">
            <h2 id="close-title" className={H2}>
              {t('close.title')}
            </h2>
            <p className="max-w-xl text-lg">{t('close.body')}</p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button asChild className={cn(CTA, 'bg-chalk text-charcoal hover:bg-chalk')}>
              <Link to="/play">{t('cta.play')}</Link>
            </Button>
            <Button
              asChild
              variant="secondary"
              className={cn(CTA, 'bg-charcoal text-chalk hover:bg-charcoal')}
            >
              <Link to="/r/new">{t('cta.friends')}</Link>
            </Button>
          </div>
        </div>
      </section>

      <SiteFooter />
    </>
  );
}
