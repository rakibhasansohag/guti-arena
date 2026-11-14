import { useEffect, useRef, useState } from 'react';
import type { Seat } from '@guti-arena/engine';
import { Button } from '@/components/ui/button';
import { useT } from '@/i18n';

export interface ShareCardResult {
  winnerName: string;
  /** The winner's seat, which sets its colour; null for a draw. */
  seatColour: Seat | null;
  /** Pieces left for each seat that played. */
  pieceCounts: Partial<Record<Seat, number>>;
  roomCode?: string;
}

// Canvas cannot read CSS variables, so the DESIGN.md hex values live here too.
const C = { earth: '#c9a27a', clay: '#b5653d', charcoal: '#2b2622', chalk: '#f4ede1' };
const FILL: Record<Seat, string> = { 0: '#1f5fbf', 1: '#e8b923', 2: '#f7f4ec', 3: '#d1342c' };
const W = 1200;
const H = 630;
const DISPLAY = '"Baloo 2", "Baloo Da 2", sans-serif';
const BODY = 'Inter, "Anek Bangla", sans-serif';
const HOST = 'guti.rakibhasansohag.com';

/** A seat's pebble with its mark; with `logo`, a plain clay pebble for the Guti Arena mark. */
function pebble(
  ctx: CanvasRenderingContext2D,
  seat: Seat,
  x: number,
  y: number,
  r: number,
  logo = false,
) {
  ctx.save();
  ctx.fillStyle = 'rgb(43 38 34 / .3)';
  ctx.beginPath();
  ctx.ellipse(x, y + r * 0.6, r * 0.9, r * 0.35, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = logo ? C.clay : FILL[seat];
  ctx.strokeStyle = C.charcoal;
  ctx.lineWidth = seat === 2 ? r * 0.16 : r * 0.1;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = 'rgb(255 255 255 / .45)';
  ctx.beginPath();
  ctx.ellipse(x - r * 0.3, y - r * 0.38, r * 0.42, r * 0.25, -0.4, 0, Math.PI * 2);
  ctx.fill();
  if (logo) {
    ctx.restore();
    return;
  }
  // Colour-blind mark: dot, ring, cross, diamond.
  const mark = seat === 1 || seat === 2 ? C.charcoal : C.chalk;
  ctx.fillStyle = mark;
  ctx.strokeStyle = mark;
  ctx.lineWidth = r * 0.17;
  ctx.lineCap = 'round';
  const d = r * 0.32;
  ctx.beginPath();
  if (seat === 0) {
    ctx.arc(x, y, r * 0.26, 0, Math.PI * 2);
    ctx.fill();
  } else if (seat === 1) {
    ctx.arc(x, y, r * 0.38, 0, Math.PI * 2);
    ctx.stroke();
  } else if (seat === 2) {
    ctx.moveTo(x - d, y - d);
    ctx.lineTo(x + d, y + d);
    ctx.moveTo(x + d, y - d);
    ctx.lineTo(x - d, y + d);
    ctx.stroke();
  } else {
    const e = d * 1.3;
    ctx.moveTo(x, y - e);
    ctx.lineTo(x + e, y);
    ctx.lineTo(x, y + e);
    ctx.lineTo(x - e, y);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

interface CardText {
  headline: string;
  piecesLeft: string;
  footer: string;
}

function draw(ctx: CanvasRenderingContext2D, r: ShareCardResult, text: CardText) {
  ctx.fillStyle = C.earth;
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = C.chalk;
  ctx.beginPath();
  ctx.roundRect(40, 40, W - 80, H - 80, 40);
  ctx.fill();

  ctx.fillStyle = C.charcoal;
  ctx.textBaseline = 'alphabetic';
  pebble(ctx, 3, 108, 118, 22, true);
  ctx.font = `800 40px ${DISPLAY}`;
  ctx.fillText('Guti Arena', 146, 132);

  ctx.font = `800 84px ${DISPLAY}`;
  ctx.fillText(text.headline, 88, 270, W - 360);

  ctx.font = `400 28px ${BODY}`;
  ctx.fillStyle = C.clay;
  ctx.fillText(text.piecesLeft, 88, 340);

  const seats = (Object.keys(r.pieceCounts).map(Number) as Seat[]).sort();
  seats.forEach((seat, i) => {
    const x = 120 + i * 190;
    pebble(ctx, seat, x, 420, 34);
    ctx.fillStyle = C.charcoal;
    ctx.font = `800 52px ${DISPLAY}`;
    ctx.fillText(String(r.pieceCounts[seat] ?? 0), x + 50, 438);
  });

  if (r.seatColour !== null) pebble(ctx, r.seatColour, W - 210, 240, 96);

  ctx.fillStyle = C.charcoal;
  ctx.font = `400 26px ${BODY}`;
  ctx.fillText(text.footer, 88, H - 88);
}

/** A result card for the end of a game: shown on screen, saved as PNG, or shared as a file. */
export function ShareCard({ result }: { result: ShareCardResult }) {
  const t = useT('landing');
  const headline =
    result.seatColour === null ? t('share.draw') : t('share.wins', { name: result.winnerName });
  const piecesLeft = t('share.piecesLeft');
  const footer = result.roomCode
    ? `${HOST}  ·  ${t('share.room', { code: result.roomCode })}`
    : HOST;
  const ref = useRef<HTMLCanvasElement>(null);
  const [canShareFile, setCanShareFile] = useState(false);

  useEffect(() => {
    const ctx = ref.current?.getContext('2d');
    if (!ctx) return;
    let live = true;
    // Canvas text only uses web fonts once they are loaded.
    Promise.all(
      [
        '800 84px "Baloo 2"',
        '800 84px "Baloo Da 2"',
        '400 28px Inter',
        '400 28px "Anek Bangla"',
      ].map((f) => document.fonts.load(f)),
    )
      .catch(() => undefined)
      .then(() => live && draw(ctx, result, { headline, piecesLeft, footer }));
    setCanShareFile(
      !!navigator.canShare?.({ files: [new File([], 'x.png', { type: 'image/png' })] }),
    );
    return () => {
      live = false;
    };
  }, [result, headline, piecesLeft, footer]);

  const toFile = () =>
    new Promise<File | null>((resolve) =>
      ref.current?.toBlob(
        (b) => resolve(b && new File([b], 'guti-arena-result.png', { type: 'image/png' })),
        'image/png',
      ),
    );

  const save = async () => {
    const file = await toFile();
    if (!file) return;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(file);
    a.download = file.name;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const share = async () => {
    const file = await toFile();
    if (!file) return;
    try {
      await navigator.share({ files: [file], title: 'Guti Arena' });
    } catch {
      // the person closed the share sheet
    }
  };

  return (
    <figure className="flex flex-col gap-4">
      <canvas
        ref={ref}
        width={W}
        height={H}
        role="img"
        aria-label={headline}
        className="aspect-[1200/630] w-full rounded-clay shadow-clay"
      />
      <div className="flex flex-wrap gap-3">
        <Button className="h-11 rounded-full px-5" onClick={save}>
          {t('share.save')}
        </Button>
        {canShareFile && (
          <Button variant="secondary" className="h-11 rounded-full px-5" onClick={share}>
            {t('share.share')}
          </Button>
        )}
      </div>
    </figure>
  );
}
