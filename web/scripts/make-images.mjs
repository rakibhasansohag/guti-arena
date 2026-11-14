// Regenerates the share image and app icons: `pnpm --filter web make-images`.
// Renders small HTML pages with the real board and fonts, then screenshots them with
// headless Edge or Chrome (set BROWSER to override the path).
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const web = fileURLToPath(new URL('..', import.meta.url));
const { boardSvg } = await import(pathToFileURL(`${web}dist-ssr/entry-server.js`).href);

const browser = [
  process.env.BROWSER,
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
].find((p) => p && existsSync(p));
if (!browser) throw new Error('No Chrome or Edge found; set BROWSER to its path.');

const font = (pkg, file) =>
  pathToFileURL(`${web}node_modules/@fontsource/${pkg}/files/${file}`).href;
const css = `
  @font-face { font-family: 'Baloo 2'; font-weight: 800; src: url(${font('baloo-2', 'baloo-2-latin-800-normal.woff2')}); }
  @font-face { font-family: 'Baloo Da 2'; font-weight: 800; src: url(${font('baloo-da-2', 'baloo-da-2-bengali-800-normal.woff2')}); }
  @font-face { font-family: 'Inter'; font-weight: 600; src: url(${font('inter', 'inter-latin-600-normal.woff2')}); }
  :root { --color-earth:#c9a27a; --color-clay:#b5653d; --color-charcoal:#2b2622; --color-chalk:#f4ede1;
    --color-piece-blue:#1f5fbf; --color-piece-yellow:#e8b923; --color-piece-white:#f7f4ec; --color-piece-red:#d1342c; }
  html, body { margin: 0; overflow: hidden; }
  body { background: radial-gradient(circle at 70% 45%, #d6b48f, #c9a27a 60%, #b98f66); color: #2b2622; }
`;
const pebble = (size) => `
  <svg viewBox="0 0 32 32" width="${size}" height="${size}">
    <ellipse cx="16" cy="25" rx="10" ry="3.5" fill="#2b2622" opacity=".3"/>
    <circle cx="16" cy="15" r="11" fill="#b5653d" stroke="#2b2622" stroke-width="1.6"/>
    <ellipse cx="12" cy="10.5" rx="4.5" ry="2.8" fill="#fff" opacity=".4"/>
  </svg>`;

const og = `<!doctype html><meta charset="utf-8"><style>${css}
  .wrap { width: 1200px; height: 630px; display: flex; align-items: center; gap: 24px; padding: 0 56px; box-sizing: border-box; }
  .text { flex: 1; display: flex; flex-direction: column; gap: 14px; }
  .brand { display: flex; align-items: center; gap: 14px; font: 800 84px/1 'Baloo 2'; }
  .bn { font: 800 52px/1.2 'Baloo Da 2'; }
  .en { font: 600 28px/1.3 Inter; }
  .board { width: 560px; height: 560px; filter: drop-shadow(0 18px 24px rgb(43 38 34 / .3)); }
  .board svg { width: 100%; height: 100%; }
</style><div class="wrap"><div class="text"><div class="brand">${pebble(84)}Guti Arena</div>
  <div class="bn">চার রঙের ষোলো গুটি</div>
  <div class="en">Four-colour Sholo Guti in your browser. 2 to 4 players, free.</div></div>
  <div class="board">${boardSvg()}</div></div>`;

const icon = (size, pad) => `<!doctype html><meta charset="utf-8"><style>${css}
  body { width: ${size}px; height: ${size}px; display: grid; place-items: center; background: #c9a27a; }
</style>${pebble(Math.round(size * (1 - pad)))}`;

const jobs = [
  ['og/guti-arena.png', 1200, 630, og],
  ['icons/icon-512.png', 512, 512, icon(512, 0.3)], // 30% padding keeps it inside the maskable safe zone
  ['icons/icon-192.png', 192, 192, icon(192, 0.3)],
  ['icons/apple-touch-icon.png', 180, 180, icon(180, 0.2)],
];

// Board pictures for the landing hero (its hopping piece is drawn live on top, so it is left out)
// and the rules page. Raster, not SVG: an SVG image this detailed rasterises on the main thread
// and held up the largest paint by about half a second. Both sit on the flat earth ground, which
// is baked in: WebP stores alpha losslessly, and the transparent version was 60% larger.
const BOARD = 2400;
const board = (svg) => `<!doctype html><meta charset="utf-8"><style>${css}
  body { background: #c9a27a; } svg { display: block; width: ${BOARD}px; height: ${BOARD}px; }
</style>${svg}`;
const boards = [
  ['hero', board(boardSvg('g-2-3'))],
  ['full', board(boardSvg())],
];

const tmp = await mkdtemp(join(tmpdir(), 'guti-images-'));
const shoot = async (html, w, h, target) => {
  const page = join(tmp, `${Math.random().toString(36).slice(2)}.html`);
  await writeFile(page, html);
  execFileSync(browser, [
    '--headless=new',
    '--disable-gpu',
    '--hide-scrollbars',
    '--force-device-scale-factor=1',
    `--window-size=${w},${h}`,
    `--screenshot=${target}`,
    pathToFileURL(page).href,
  ]);
};

for (const [out, w, h, html] of jobs) {
  await mkdir(join(web, 'public', out, '..'), { recursive: true });
  await shoot(html, w, h, join(web, 'public', out));
  console.log(`wrote public/${out}`);
}

// WebP widths for srcset: phones, laptops, and 2K to 4K screens.
await mkdir(join(web, 'public', 'board'), { recursive: true });
for (const [name, html] of boards) {
  const png = join(tmp, `${name}.png`);
  await shoot(html, BOARD, BOARD, png);
  for (const width of [800, 1200, 1600, 2400]) {
    const target = join(web, 'public', 'board', `${name}-${width}.webp`);
    execFileSync('ffmpeg', [
      '-v',
      'error',
      '-y',
      '-i',
      png,
      '-vf',
      `scale=${width}:-1`,
      '-c:v',
      'libwebp',
      '-quality',
      '78',
      '-pix_fmt',
      'yuv420p',
      target,
    ]);
    console.log(`wrote public/board/${name}-${width}.webp`);
  }
}
