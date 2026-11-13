// Writes static HTML for the public pages so crawlers get real content.
// Runs after `vite build` and `vite build --ssr`; see the web build script.
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';

const web = fileURLToPath(new URL('..', import.meta.url));
const ssr = `${web}dist-ssr/entry-server.js`;
const { render } = await import(pathToFileURL(ssr).href);

const template = await readFile(`${web}dist/index.html`, 'utf8');
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
  // The prerender is Bangla. Clear it and its head tags before first paint when the fallback
  // serves another route, or when the visitor reads English, so React renders fresh.
  const guard = `<script>(function(){var r=document.getElementById('root'),l;try{l=new URLSearchParams(location.search).get('lang')||localStorage.getItem('lang')}catch(e){}if(location.pathname!==${JSON.stringify(route)}||l==='en'){r.replaceChildren();document.querySelectorAll('[data-prerender]').forEach(function(n){n.remove()});document.title='Guti Arena'}})()</script>`;
  const out = template
    .replace(/<title>[\s\S]*?<\/title>/, '')
    .replace('</head>', `    ${head}\n  </head>`)
    .replace('<div id="root"></div>', `<div id="root">${body}</div>${guard}`);
  if (!out.includes('<h1') || !out.includes('<title data-prerender>'))
    throw new Error(`prerender of ${route} is missing its h1 or title`);
  await writeFile(`${web}dist/${file}`, out);
  console.log(`prerendered ${route} -> dist/${file} (${out.length} bytes)`);
}
