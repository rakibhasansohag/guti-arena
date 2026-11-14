import { Suspense, lazy, useSyncExternalStore } from 'react';
import { Link, Navigate, useParams } from 'react-router';
import { ArrowLeft } from 'lucide-react';
import { BOARD_IDS } from '@guti-arena/engine';
import { Button } from '@/components/ui/button';
import { Diagram } from '@/game/diagram';
import type { GuideContent } from '@/guide/content';
import bn from '@/guide/content.bn';
import en from '@/guide/content.en';
import { STEPS } from '@/guide/steps';
import { useLang } from '@/i18n';
import { cn } from '@/lib/utils';
import { GUIDE_SLUG, boardOfSlug, guidePath } from '@/share/guides';
import { Seo } from '@/share/seo';
import { CTA, SiteFooter, SiteHeader, WRAP } from '@/share/site-chrome';

const Lesson = lazy(() => import('@/guide/lesson'));

const H2 = 'font-display text-2xl font-extrabold sm:text-3xl 3xl:text-4xl';
const CARD = 'rounded-clay bg-card p-5 shadow-clay sm:p-6 3xl:p-8';
const LINK =
  'font-display font-extrabold text-clay-deep underline decoration-2 underline-offset-4 transition-colors duration-200 hover:text-charcoal';

/** One game's guide: what the board is, each move as a picture, how to win, tips and questions. */
export default function Guide() {
  const board = boardOfSlug(useParams().game);
  const content: GuideContent = useLang() === 'en' ? en : bn;
  // False in the prerender and while hydrating it, true afterwards.
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  if (!board) return <Navigate to="/how-to-play" replace />;
  const { ui, games } = content;
  const g = games[board];
  const path = guidePath(board);
  return (
    <>
      <Seo
        path={path}
        title={g.seoTitle}
        description={g.seoDescription}
        jsonLd={[
          {
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            mainEntity: g.faq.map(({ q, a }) => ({
              '@type': 'Question',
              name: q,
              acceptedAnswer: { '@type': 'Answer', text: a },
            })),
          },
        ]}
      />
      <SiteHeader />
      <main className={cn(WRAP, 'flex flex-col gap-12 pt-8 pb-20 3xl:gap-16')}>
        <section aria-labelledby="guide-title" className="flex max-w-3xl flex-col gap-5">
          <Link to="/how-to-play" className={cn(LINK, 'flex items-center gap-1.5 self-start')}>
            <ArrowLeft aria-hidden="true" className="size-4" />
            {ui.all}
          </Link>
          <h1
            id="guide-title"
            className="font-display text-4xl font-extrabold leading-tight text-balance sm:text-5xl 3xl:text-6xl"
          >
            {g.title}
          </h1>
          <p className="text-lg 3xl:text-xl">{g.intro}</p>
          <Button asChild className={cn(CTA, 'self-start')}>
            <Link to={`/play?game=${GUIDE_SLUG[board]}`}>{ui.play.replace('{name}', g.name)}</Link>
          </Button>
        </section>

        <section aria-labelledby="steps-title" className="flex flex-col gap-6">
          <h2 id="steps-title" className={H2}>
            {ui.steps}
          </h2>
          <ol className="grid gap-6 md:grid-cols-2">
            {STEPS[board].map((step, i) => {
              const text = g.steps[step.key]!;
              return (
                <li key={step.key} className={cn(CARD, 'flex flex-col gap-4')}>
                  <Diagram
                    board={board}
                    spec={step}
                    label={text.alt}
                    className="mx-auto h-64 w-full sm:h-72 3xl:h-96"
                  />
                  <h3 className="flex items-baseline gap-3 font-display text-xl font-extrabold sm:text-2xl">
                    <span className="flex size-8 shrink-0 items-center justify-center self-center rounded-full bg-charcoal text-base text-chalk">
                      {(i + 1).toLocaleString(content === bn ? 'bn-BD' : 'en-US')}
                    </span>
                    {text.title}
                  </h3>
                  <p>{text.body}</p>
                </li>
              );
            })}
          </ol>
        </section>

        <section aria-labelledby="lesson-title" className={cn(CARD, 'flex flex-col gap-4')}>
          <h2 id="lesson-title" className={H2}>
            {ui.lessonTitle}
          </h2>
          {/* Client only, and loaded after the page: the article above never waits for the board. */}
          {mounted ? (
            <Suspense fallback={<p className="text-lg">{g.lesson}</p>}>
              <Lesson key={board} board={board} content={content} />
            </Suspense>
          ) : (
            <p className="text-lg">{g.lesson}</p>
          )}
        </section>

        <div className="grid gap-6 md:grid-cols-2">
          <section aria-labelledby="tips-title" className={cn(CARD, 'flex flex-col gap-4')}>
            <h2 id="tips-title" className={H2}>
              {ui.tips}
            </h2>
            <ul className="flex list-disc flex-col gap-3 pl-5">
              {g.tips.map((tip) => (
                <li key={tip}>{tip}</li>
              ))}
            </ul>
          </section>
          <section aria-labelledby="faq-title" className={cn(CARD, 'flex flex-col gap-4')}>
            <h2 id="faq-title" className={H2}>
              {ui.faq}
            </h2>
            <dl className="flex flex-col gap-4">
              {g.faq.map(({ q, a }) => (
                <div key={q}>
                  <dt className="font-display text-lg font-extrabold">{q}</dt>
                  <dd className="mt-1">{a}</dd>
                </div>
              ))}
            </dl>
          </section>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Button asChild className={CTA}>
            <Link to={`/play?game=${GUIDE_SLUG[board]}`}>{ui.play.replace('{name}', g.name)}</Link>
          </Button>
          <Button asChild variant="secondary" className={CTA}>
            <Link to="/r/new">{ui.friends}</Link>
          </Button>
        </div>

        <nav aria-labelledby="others-title" className="flex flex-col gap-3">
          <h2 id="others-title" className={H2}>
            {ui.others}
          </h2>
          <ul className="flex flex-wrap gap-x-6 gap-y-2">
            {BOARD_IDS.filter((id) => id !== board).map((id) => (
              <li key={id}>
                <Link to={guidePath(id)} className={LINK}>
                  {games[id].name}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </main>
      <SiteFooter />
    </>
  );
}
