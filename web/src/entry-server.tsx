// Build-time only: scripts/prerender.mjs renders pages to static HTML with this.
import { renderToStaticMarkup } from 'react-dom/server';
import { prerender } from 'react-dom/static';
import { StaticRouter } from 'react-router';
import { startPoints, type PointId, type Seat } from '@guti-arena/engine';
import { AppRoutes } from './app.tsx';
import { BoardArt } from './share/board-art.tsx';

/** A route's markup, with Suspense resolved, as one string. */
export async function render(url: string): Promise<string> {
  const { prelude } = await prerender(
    <StaticRouter location={url}>
      <AppRoutes />
    </StaticRouter>,
  );
  return new Response(prelude).text();
}

/** The full board in its starting position, minus `omit`, for the share image and board images. */
export function boardSvg(omit?: PointId): string {
  const pieces: Record<PointId, Seat> = Object.fromEntries(
    ([0, 1, 2, 3] as Seat[]).flatMap((s) => startPoints(s).map((p) => [p, s])),
  );
  if (omit) delete pieces[omit];
  return renderToStaticMarkup(<BoardArt pieces={pieces} label="Guti Arena board" />);
}
