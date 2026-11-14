import type { CourtId } from '@guti-arena/engine';
import { COURT } from './look.ts';

/** The texture tile of each court, as children of a `<pattern>`, and its size. */
function Texture({ court }: { court: CourtId }) {
  switch (court) {
    case 'earth':
      return <image href="/textures/earth.webp" width="4" height="4" />;
    case 'wood':
      // Two planks per tile, ends staggered, with a little grain and a knot.
      return (
        <g fill="none" strokeLinecap="round">
          <g stroke="#6B4423" strokeOpacity={0.35} strokeWidth={0.025}>
            <path d="M0 .35C1.5.25 3 .5 6 .35M0 .95C2 1.05 4 .85 6 1M0 1.85C1.5 1.75 3.5 2 6 1.85M0 2.5C2 2.6 4 2.4 6 2.55" />
            <ellipse cx={4.2} cy={0.65} rx={0.25} ry={0.07} />
          </g>
          <g stroke="#5A3820" strokeOpacity={0.6} strokeWidth={0.04}>
            <path d="M0 1.5H6M0 3H6M2 0V1.5M5 1.5V3" />
          </g>
        </g>
      );
    case 'kantha':
      // Rows of running stitch, as on a quilted kantha.
      return (
        <path
          d="M0 .25H1"
          stroke="#B5653D"
          strokeOpacity={0.3}
          strokeWidth={0.025}
          strokeDasharray=".12 .08"
        />
      );
    case 'slate':
      return (
        <g fill="#fff">
          <ellipse
            cx={1.2}
            cy={1}
            rx={1.1}
            ry={0.35}
            opacity={0.05}
            transform="rotate(-12 1.2 1)"
          />
          <ellipse
            cx={3.6}
            cy={3.4}
            rx={1.3}
            ry={0.4}
            opacity={0.04}
            transform="rotate(8 3.6 3.4)"
          />
          <circle cx={4.1} cy={1.3} r={0.03} opacity={0.2} />
          <circle cx={0.8} cy={4.2} r={0.025} opacity={0.2} />
        </g>
      );
    case 'sand':
      return (
        <g>
          <path
            d="M0 .6Q.5 .45 1 .6T2 .6M0 1.6Q.5 1.45 1 1.6T2 1.6"
            fill="none"
            stroke="#A8844F"
            strokeOpacity={0.3}
            strokeWidth={0.03}
          />
          <g fill="#8E6D3D" opacity={0.35}>
            <circle cx={0.3} cy={0.2} r={0.02} />
            <circle cx={1.4} cy={0.9} r={0.025} />
            <circle cx={0.8} cy={1.2} r={0.018} />
            <circle cx={1.7} cy={1.9} r={0.02} />
            <circle cx={0.15} cy={1.05} r={0.015} />
          </g>
        </g>
      );
    case 'night':
      return (
        <g fill="#fff">
          <circle cx={0.6} cy={0.9} r={0.025} opacity={0.18} />
          <circle cx={2.3} cy={0.4} r={0.02} opacity={0.12} />
          <circle cx={1.6} cy={2.2} r={0.03} opacity={0.1} />
        </g>
      );
  }
}

const TILE: Record<CourtId, [number, number]> = {
  earth: [4, 4],
  wood: [6, 3],
  kantha: [1, 0.5],
  slate: [5, 5],
  sand: [2, 2],
  night: [3, 3],
};

/** The court's ground: base colour, its texture, and any border it has. Ids are made unique by `uid`. */
export function CourtGround({
  court,
  uid,
  x,
  y,
  width,
  height,
}: {
  court: CourtId;
  uid: string;
  x: number;
  y: number;
  width: number;
  height: number;
}) {
  const [w, h] = TILE[court];
  const box = { x: x + 0.05, y: y + 0.05, width: width - 0.1, height: height - 0.1, rx: 0.5 };
  const size = Math.min(width, height);
  const id = `court-${court}-${uid}`;
  return (
    <>
      <defs>
        <pattern id={id} width={w} height={h} patternUnits="userSpaceOnUse">
          <Texture court={court} />
        </pattern>
      </defs>
      <rect {...box} fill={COURT[court].ground} />
      <rect
        {...box}
        fill={`url(#${id})`}
        opacity={court === 'earth' ? 0.45 : 1}
        style={court === 'earth' ? { mixBlendMode: 'multiply' } : undefined}
      />
      {court === 'night' && (
        // A lantern's pool of light in the middle of the courtyard.
        <g fill="#F4D58D">
          {[0.45, 0.33, 0.22].map((f) => (
            <circle key={f} cx={x + width / 2} cy={y + height / 2} r={size * f} opacity={0.05} />
          ))}
        </g>
      )}
      {court === 'kantha' && (
        <g fill="none" strokeWidth={0.06} strokeLinecap="round">
          <rect {...inset(box, 0.18)} stroke="#B5653D" strokeDasharray=".22 .14" />
          <rect {...inset(box, 0.32)} stroke="#34396A" strokeDasharray=".1 .12" />
        </g>
      )}
      {court === 'slate' && (
        <rect {...inset(box, 0.08)} fill="none" stroke="#8A5A35" strokeWidth={0.16} />
      )}
    </>
  );
}

function inset(b: { x: number; y: number; width: number; height: number; rx: number }, d: number) {
  return {
    x: b.x + d,
    y: b.y + d,
    width: b.width - 2 * d,
    height: b.height - 2 * d,
    rx: Math.max(0, b.rx - d),
  };
}
