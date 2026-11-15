import { Link } from 'react-router';
import { BOARD_IDS, startPoints, type PointId, type Seat } from '@guti-arena/engine';
import { Button } from '@/components/ui/button';
import { useT } from '@/i18n';
import { cn } from '@/lib/utils';
import { BoardArt, SeatMark } from '@/share/board-art';
import { SEAT_FILL } from '@/share/seat-colours';
import { guidePath } from '@/share/guides';
import { Seo } from '@/share/seo';
import { CTA, SiteFooter, SiteHeader, WRAP } from '@/share/site-chrome';

type View = [number, number, number, number];
type Pieces = Partial<Record<PointId, Seat>>;

const SEATS: Seat[] = [0, 1, 2, 3];
const START: Pieces = Object.fromEntries(SEATS.flatMap((s) => startPoints(s).map((p) => [p, s])));

interface Rule {
  key: string;
  view: View;
  pieces: Pieces;
  arrows?: { from: PointId; to: PointId }[];
  ghosts?: Pieces;
}

const RULES: Rule[] = [
  {
    key: 'move',
    view: [0.9, 0.9, 4.2, 4.2],
    pieces: { 'g-3-3': 0, 'g-2-2': 1, 'g-4-4': 3 },
    arrows: [
      { from: 'g-3-3', to: 'g-2-3' },
      { from: 'g-3-3', to: 'g-3-4' },
      { from: 'g-3-3', to: 'g-4-3' },
      { from: 'g-3-3', to: 'g-3-2' },
    ],
  },
  {
    key: 'capture',
    view: [-0.6, 1.8, 5.2, 2.4],
    pieces: { 'g-3-0': 0 },
    ghosts: { 'g-3-1': 3 },
    arrows: [{ from: 'g-3-0', to: 'g-3-2' }],
  },
  {
    key: 'chain',
    view: [0.4, 0.2, 5.2, 2.4],
    pieces: { 'g-1-1': 0 },
    ghosts: { 'g-1-2': 1, 'g-1-4': 1 },
    arrows: [
      { from: 'g-1-1', to: 'g-1-3' },
      { from: 'g-1-3', to: 'g-1-5' },
    ],
  },
  {
    key: 'triangle',
    view: [0.6, -2.7, 4.8, 3.6],
    pieces: { 'g-0-3': 0 },
    ghosts: { 't-n-m-0': 3 },
    arrows: [{ from: 'g-0-3', to: 't-n-b-0' }],
  },
];

const H2 = 'font-display text-2xl font-extrabold sm:text-3xl 3xl:text-4xl';
const CARD = 'rounded-clay bg-card p-6 shadow-clay 3xl:p-8';

export default function HowToPlay() {
  const t = useT('landing');
  const g = useT('game');
  return (
    <>
      <Seo
        path="/how-to-play"
        title={t('rules.seo.title')}
        description={t('rules.seo.description')}
      />
      <SiteHeader />
      <main className={cn(WRAP, 'flex flex-col gap-16 pt-8 pb-20 3xl:gap-24')}>
        <section
          aria-labelledby="rules-title"
          className="grid items-center gap-10 lg:grid-cols-[1fr_1fr]"
        >
          <div className="flex flex-col gap-5">
            <h1
              id="rules-title"
              className="font-display text-4xl font-extrabold leading-tight text-balance sm:text-5xl 3xl:text-6xl"
            >
              {t('rules.title')}
            </h1>
            <p className="max-w-xl text-lg 3xl:text-xl">{t('rules.intro')}</p>
            <h2 className={cn(H2, 'mt-4')}>{t('rules.board.title')}</h2>
            <p className="max-w-xl">{t('rules.board.body')}</p>
            <p className="max-w-xl">{t('rules.board.seats')}</p>
            <ul className="flex gap-3" aria-hidden="true">
              {SEATS.map((s) => (
                <li key={s}>
                  <svg viewBox="-0.5 -0.5 1 1" className="size-10 drop-shadow-md">
                    <circle
                      r={0.42}
                      fill={SEAT_FILL[s]}
                      stroke="var(--color-charcoal)"
                      strokeWidth={0.05}
                    />
                    <SeatMark
                      seat={s}
                      x={0}
                      y={0}
                      colour={s === 1 || s === 2 ? 'var(--color-charcoal)' : 'var(--color-chalk)'}
                    />
                  </svg>
                </li>
              ))}
            </ul>
          </div>
          <BoardArt
            pieces={START}
            image="full"
            label={t('rules.board.diagram')}
            className="mx-auto aspect-square w-full max-w-[min(100%,70svh)]"
          />
        </section>

        <section aria-labelledby="games-title" className="leave flex flex-col gap-5">
          <h2 id="games-title" className={cn(H2, 'reveal')}>
            {t('rules.games.title')}
          </h2>
          <p className="reveal max-w-3xl">{t('rules.games.body')}</p>
          <ul className="reveal-row grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {BOARD_IDS.map((id) => (
              <li key={id} className={cn(CARD, 'flex flex-col gap-2')}>
                <h3 className="font-display text-xl font-extrabold">{g(`boards.${id}`)}</h3>
                <p className="font-display font-extrabold text-clay-deep">
                  {g(`boards.${id}.tag`)}
                </p>
                <p>{g(`boards.${id}.hint`)}</p>
                <Link
                  to={guidePath(id)}
                  className="mt-auto self-start pt-2 font-display font-extrabold text-clay-deep underline decoration-2 underline-offset-4 transition-colors duration-200 hover:text-charcoal"
                >
                  {t('rules.games.read', { name: g(`boards.${id}`) })}
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <div className="leave reveal-row grid gap-6 md:grid-cols-2">
          {RULES.map(({ key, view, pieces, arrows, ghosts }) => (
            <section
              key={key}
              aria-labelledby={`${key}-title`}
              className={cn(CARD, 'flex flex-col gap-4')}
            >
              <BoardArt
                pieces={pieces}
                ghosts={ghosts}
                arrows={arrows}
                view={view}
                label={t(`rules.${key}.diagram`)}
                className="h-48 w-full 3xl:h-60"
              />
              <h2 id={`${key}-title`} className={H2}>
                {t(`rules.${key}.title`)}
              </h2>
              <p>{t(`rules.${key}.body`)}</p>
            </section>
          ))}
        </div>

        <div className="leave reveal-row grid gap-6 md:grid-cols-2">
          <section aria-labelledby="turns-title" className={cn(CARD, 'flex flex-col gap-4')}>
            <h2 id="turns-title" className={H2}>
              {t('rules.turns.title')}
            </h2>
            <p>{t('rules.turns.body')}</p>
          </section>
          <section aria-labelledby="win-title" className={cn(CARD, 'flex flex-col gap-4')}>
            <BoardArt
              pieces={{ 'g-1-2': 0, 'g-2-4': 0, 'g-3-1': 0, 'g-4-3': 0 }}
              view={[0.4, 0.4, 4.2, 4.2]}
              label={t('rules.win.diagram')}
              className="h-40 w-full 3xl:h-52"
            />
            <h2 id="win-title" className={H2}>
              {t('rules.win.title')}
            </h2>
            <p>{t('rules.win.body')}</p>
          </section>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Button asChild className={CTA}>
            <Link to="/play">{t('cta.play')}</Link>
          </Button>
          <Button asChild variant="secondary" className={CTA}>
            <Link to="/r/new">{t('cta.friends')}</Link>
          </Button>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
