// Writes static HTML for the public pages so crawlers get real content.
// Runs after `vite build` and `vite build --ssr`; see the web build script.
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';

const web = fileURLToPath(new URL('..', import.meta.url));
const ssr = `${web}dist-ssr/entry-server.js`;
const { render } = await import(pathToFileURL(ssr).href);

// Inline the one stylesheet (about 8 KB gzipped): first paint then needs only the HTML.
let template = await readFile(`${web}dist/index.html`, 'utf8');
const sheet = template.match(/<link rel="stylesheet"[^>]*href="(\/assets\/[^"]+\.css)"[^>]*>/);
if (!sheet) throw new Error('stylesheet link not found in dist/index.html');
const css = await readFile(`${web}dist${sheet[1]}`, 'utf8');
template = template.replace(sheet[0], () => `<style>${css}</style>`);
// The app script is started by the guard below instead of the tag Vite wrote.
const entry = template.match(/<script type="module" crossorigin src="([^"]+)"><\/script>/);
if (!entry) throw new Error('module script not found in dist/index.html');
template = template.replace(entry[0], '');
// Bangla faces on the first screen: found only after layout otherwise, which made the headline
// (often the largest paint) wait for a late font swap.
const assets = await readdir(`${web}dist/assets`);
const fonts = ['baloo-da-2-bengali-800', 'anek-bangla-bengali-400']
  .map((face) => assets.find((f) => f.startsWith(`${face}-normal-`) && f.endsWith('.woff2')))
  .filter(Boolean)
  .map((f) => `<link rel="preload" href="/assets/${f}" as="font" type="font/woff2" crossorigin>`);
template = template.replace(
  '<meta charset="UTF-8" />',
  `<meta charset="UTF-8" />\n    ${fonts.join('\n    ')}`,
);
const HEAD_TAG = /<title>[\s\S]*?<\/title>|<meta [^>]*>|<link [^>]*>/g;

// Cloudflare serves /how-to-play from how-to-play.html; index.html is also the SPA fallback.
const pages = [
  ['/', 'index.html'],
  ['/how-to-play', 'how-to-play.html'],
];

for (const [route, file] of pages) {
  const html = await render(route);
  // Tagged so the guard below can drop them when React renders this route fresh.
  const head = (html.match(HEAD_TAG) ?? [])
    .map((tag) => tag.replace(/^<(\w+)/, '<$1 data-prerender'))
    .join('\n    ');
  const body = html.replace(HEAD_TAG, '');
  // The prerender is Bangla. When the fallback serves another route, or the visitor reads
  // English, clear it and its head tags before first paint and start the app at once.
  // Otherwise the page is already readable and its links work, so the app script waits for
  // `load`: on a slow phone the hero paints before React parses and hydrates.
  const guard = `<script>(function(){var r=document.getElementById('root'),l;try{l=new URLSearchParams(location.search).get('lang')||localStorage.getItem('lang')}catch(e){}var fresh=location.pathname!==${JSON.stringify(route)}||l==='en';if(fresh){r.replaceChildren();document.querySelectorAll('[data-prerender]').forEach(function(n){n.remove()});document.title='Guti Arena'}function go(){var s=document.createElement('script');s.type='module';s.crossOrigin='';s.src=${JSON.stringify(entry[1])};document.head.appendChild(s)}if(fresh||document.readyState==='complete')go();else addEventListener('load',go,{once:true})})()</script>`;
  const out = template
    .replace(/<title>[\s\S]*?<\/title>/, '')
    .replace('</head>', `    ${head}\n  </head>`)
    .replace('<div id="root"></div>', `<div id="root">${body}</div>${guard}`);
  if (!out.includes('<h1') || !out.includes('<title data-prerender>'))
    throw new Error(`prerender of ${route} is missing its h1 or title`);
  await writeFile(`${web}dist/${file}`, out);
  console.log(`prerendered ${route} -> dist/${file} (${out.length} bytes)`);
}
