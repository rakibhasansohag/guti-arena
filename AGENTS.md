# AGENTS.md

Guidance for coding agents working on Guti Arena.

## Project

Guti Arena is a free, open-source, browser-only version of the four-colour Sholo Guti folk game. Mobile first, 2 to 4 seats with any mix of real players and AI, local play, solo against AI and private online rooms. Runs entirely on Cloudflare's free plan, for good: every change must fit its limits (10 ms CPU per call; 100,000 Worker and Durable Object requests a day; 100,000 SQLite rows written a day, where each `storage.put`, `setAlarm` and delete counts). Bangla first, English second. Author: Rakib Hasan Sohag.

No betting, wagering or money features anywhere, including copy and art.

## Layout

- `engine/` (`@guti-arena/engine`): plain TypeScript, imported as source by web and worker.
  - `src/types.ts`, `src/board.ts`, `src/protocol.ts`: shared contracts. Change them only with the smallest additive edit.
  - `src/rules.ts`, `src/ai.ts`: rules and AI.
  - `test/`: Vitest.
- `web/`: Vite, React, TypeScript, Tailwind CSS v4, shadcn/ui (`src/components/ui/`), Motion, React Router v8 (declarative mode, routes in `src/app.tsx`).
  - `src/styles/tokens.css`: design tokens. `src/styles/index.css`: Tailwind entry and shadcn mapping.
  - `src/i18n/`: `useT(namespace)` over plain dictionaries, `<namespace>.<bn|en>.ts`. Language is a `?lang=bn|en` link (remembered), else the `lang` value in `localStorage`, default `bn`.
  - `src/pages/`: one lazy-loaded page per route: `/`, `/how-to-play` (rules hub), `/how-to-play/:game` (one guide per game, `guide.tsx`), `/play` (`?game=<slug>` preselects a game), `/rooms` (live rooms: public and password rooms pushed over one WebSocket, `GET /api/rooms/live`, on every change; a search box finds a room by code, typed in capitals, or host name, and opens an unlisted code; not prerendered), `/r/:code`.
  - `src/guide/`: the guides' pictures (`steps.ts`, drawn by `Diagram` in `src/game/diagram.tsx`) and words (`content.bn.ts`, `content.en.ts`); slugs are in `src/share/guides.ts`; `lesson.tsx` is each guide's one-move puzzle on the real `GameBoard`, loaded after the page. A new game needs an entry in each, in `GUIDES` in `scripts/prerender.mjs` and in `public/sitemap.xml`. Each page renders its own `<title>` (React 19 hoists it); `index.html` only has a fallback.
  - `src/share/`: `BoardArt` (static board drawing from the engine's points and lines), `ShareCard` and `shareInvite` (result card and room invites), `Seo` (per-page head tags), `SiteHeader`, `SiteFooter`, `LangSwitch`.
  - `src/game/`: `<GameBoard />` (renders any `GameState`, animates the change, emits moves; used by `/play` and rooms), `sound.ts` (Web Audio: five Kenney clips in `public/sounds/`, nothing loads before the first tap; gain channels master and effects), `settings.ts` (`useSettings()`, `useReactionBubbles()`: one `settings` object in `localStorage`) and `settings-panel.tsx` (the gear in `GameHeader`: tap opens Settings, hold mutes), `ask-ai.ts` + `ai-worker.ts` (engine AI in a Web Worker), `GameHeader`, `SeatPip`, the setup screen (`setup.tsx` `SetupLayout`, `board-picker.tsx`, `board-base.tsx` `BoardBase` and `BoardPreview`, `board-view.ts`), and the cosmetic looks: `court.tsx` (court surfaces), `look.ts` (`LookContext`, `COURT`, the device's saved look), `scene.tsx` (page scene), `look-picker.tsx` (`LookPicker`); the piece sets are `Guti` in `src/share/guti.tsx`. See `docs/DESIGN.md`.
  - `src/net/`: `useRoom(code)` (one WebSocket, backoff reconnect, auto-rejoin with the remembered name; a locked room's password is kept in memory only, never in the URL or storage; the latest reaction per seat for 3 s and a 1.2 s client cooldown), `playerId` and name in `localStorage`, Turnstile loader (production site key on the live host, Cloudflare's test key elsewhere).
  - `src/room/`: `/r/new` creation, name prompt, lobby, live game and end screen, and the not-found / full / daily-limit / removed screens. The host can remove a seated player in the lobby (`remove`, two taps): that player id, and their IP unless someone still in the room shares it, can't come back. The host picks access in the lobby (Private: link only, the default; Public: listed on `/rooms`; Password: listed with a lock; `set-access`). A locked room asks newcomers for the password (`LockCard`). Anyone without a seat watches (a started public room is watchable without a name, with a Watching bar). `reactions.tsx`: preset reactions (`REACTIONS`), a tray for seated players, bubbles on seat panels for 3 s, Noto Emoji art in `public/reactions/<id>.svg`.
  - Prerender: `pnpm --filter web build` also renders `/`, `/how-to-play` and every game guide to static Bangla HTML (`src/entry-server.tsx`, `scripts/prerender.mjs`); `main.tsx` hydrates it. Anything those pages render must give the same markup on server and client: no `window`, `localStorage` or random values during render. The prerender inlines the CSS and starts the app script after the `load` event on those two pages (at once for any other route or for English), so their buttons become interactive a moment after the page shows. It also appends the Content-Security-Policy to `dist/_headers`, with hashes of those inline scripts (they change every build); security and cache headers live in `public/_headers`.
  - `pnpm --filter web make-images` regenerates `public/og/guti-arena.png`, `public/icons/*` and the board pictures `public/board/*.webp` with headless Edge or Chrome and ffmpeg. Re-run it after changing `BoardArt` or the start position.
- `worker/`: Cloudflare Worker. `wrangler.jsonc` serves `../web/dist` with single-page-app fallback; only `/api/*` runs the Worker. Durable Object bindings `ROOM` (class `Room`, one per room) and `ROOM_LIST` (class `RoomList` in `src/room-list.ts`, one instance named `all` holding the public list), both SQLite storage (declared with `exports`). `GET /api/rooms` reads the list through `caches.default` for 2 s. A locked room stores only a salted SHA-256 of its password and sends sockets that have not joined a redacted state (no game, names or host); wrong passwords close the socket after 5 and are capped at 20 a minute per room. Only the host's own sockets get the real `hostId` (it is a player's rejoin credential; others get `'-'`). Up to 16 sockets per room and 6 per IP (kept as a room-scoped hash, never the address). People without a seat are forgotten when they leave; the room keeps only the seated, the host and the owner. `RoomList` pushes the list to `/api/rooms/live` viewers at most once a second. Every `/api` request is rate limited per IP by the `API_LIMIT` binding (120 a minute per Cloudflare location), and a browser `Origin` other than our own host or localhost gets 403. Room messages skip both the firewall rule and `API_LIMIT`, so each socket may burst 8, then send 4 a second; a message that changes nothing is neither saved nor broadcast, a watcher coming or going is broadcast but not saved, and the alarm is set only when its time changes. The live list takes 20 viewers per IP. Server AI moves use `SERVER_AI` (search budgets of 1,500 nodes, 300 on Bagh-chal and Lau kata kati) to stay a few ms under the 10 ms CPU limit, so online Hard searches less deeply than solo Hard. Run `pnpm --filter worker cf-typegen` after editing `wrangler.jsonc`. Room rules are plain functions in `src/room-logic.ts` (tested in `test/`); `src/index.ts` is the Durable Object and the `/api` routes. Deployed to the custom domain `guti.rakibhasansohag.com` (`workers_dev` off). Secret `TURNSTILE_SECRET` is set in Cloudflare; `.dev.vars` holds Cloudflare's public always-pass test secret for local dev.
- `docs/DESIGN.md`: the design system.
- `.github/workflows/deploy.yml`: every push to `main` runs lint, typecheck and tests, builds the web app and deploys the Worker. It needs the repo secrets `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`. A failed check stops the deploy. To deploy by hand: `pnpm --filter web build` then `pnpm --filter worker run deploy`.

## Scripts (from the repo root)

| Command          | Does                                                                        |
| ---------------- | --------------------------------------------------------------------------- |
| `pnpm install`   | Install everything (pnpm workspaces)                                        |
| `pnpm dev`       | Web on 5173 (proxies `/api` to `API_PORT`, default 8787) and worker on 8787 |
| `pnpm build`     | Build `web/dist`, then dry-run the worker bundle into `worker/dist`         |
| `pnpm lint`      | oxlint, then ls-lint                                                        |
| `pnpm typecheck` | `tsc` in every package                                                      |
| `pnpm format`    | Prettier, whole repo                                                        |
| `pnpm test`      | Vitest in `engine` and `worker`                                             |

Run one package with `pnpm --filter <name> <script>`, e.g. `pnpm --filter @guti-arena/engine test`.

Two `wrangler dev` runs in `worker/` share `.wrangler/state` and lock each other: give each its own `--persist-to <folder>`, and point Vite at it with `API_PORT` (PowerShell: `$env:API_PORT='8790'`).

## The game

- **Board:** a 7 by 7 grid of points joined by horizontal and vertical lines only, plus a triangle on each side. Each triangle's apex is the grid's mid-edge point; outside the grid it has a middle row of 3 points and a base row of 3 points. Total 73 points.
- **Other boards:** the four-colour board is the default (`board: 'four'`) and always seats four. The others can be picked on `/play` and by the room host (`set-board`); every seat of a board plays (a person or an AI). `three` is a Guti Arena original for three players: a hexagon of 37 points on a triangular grid, 12 pieces each, only the centre empty (`fixed`: the web turns it by thirds, not quarter turns, to put your seat at the bottom). `lau` is Lau kata kati: two triangles joined at the point, 19 points, 9 each; captures are compulsory there (`mustCapture`): only jumps are legal when one is open and a chain cannot be ended early. `bagh` is Bagh-chal on the 5 by 5 grid: 4 tigers (seat 0) against 20 goats (seat 2) placed one a turn from the hand (`Move.from === HAND`, `GameState.inHand`); only tigers capture, one goat a jump; tigers win with 5 goats taken, goats win by shutting the tigers in. Two-player boards seat blue north against white south: `classic`, a 5 by 5 grid with alternating diagonals plus a full-width triangle north and south whose sides continue the diagonals (37 points, 16 pieces each, middle row starts empty), and `quick`, the same grid without triangles (25 points, 12 each, centre empty). `GameState.board` names the board; a missing value means the four-colour board. Rules and AI read the board from the state (`boardOf`).
- **Seats, clockwise:** 0 north (blue), 1 east (yellow), 2 south (white), 3 west (red).
- **Pieces:** 18 per seat: the 6 triangle points plus 12 grid points. Only the centre point starts empty when all four seats play. With fewer seats, unused seats' points start empty; two players sit at seats 0 and 2 by default.
- **Move:** one step along a line to an adjacent empty point.
- **Capture:** jump over an adjacent piece of any other seat, along one straight line, to the empty point directly beyond. The jumped piece is removed. The same piece may keep jumping in the same turn or stop. Capturing is optional.
- **Turn order:** clockwise, skipping eliminated seats and seats with no legal move.
- **End:** a seat with no pieces is out. Last seat with pieces wins. If 40 full rounds pass with no capture, the seat with the most pieces wins; a tie is a draw.
- **Looks:** court (surface and page scene) and piece set are cosmetic (`Look` in `protocol.ts`), picked before the game: each device picks its own on `/play`; in a room the host picks for everyone (`set-look`, lobby only).
- **Timer online:** 30 seconds per turn. On timeout the server plays a medium-AI move for that seat.
- **Host online:** the first player to join owns the room. If the host is gone for 20 seconds, the first connected player in join order becomes host; the owner gets it back on return.
- **Reactions:** 16 preset emoji and phrases, no free text. Seated players only, about one a second (the server drops closer ones).
- **Sound:** the five Kenney clips only. No music and no background sound.

## Conventions

- Read `docs/DESIGN.md` before any UI work. One visual style only.
- Use Context7 for current docs before writing code against any library, CLI or Cloudflare API.
- If `graphify-out/` exists, query it before broad code searches.
- Simplest thing that works; no dependencies for a few lines.
- File and folder names are lowercase kebab-case (ls-lint enforces it). TypeScript is strict, with `noUncheckedIndexedAccess`.
- Never commit `game_play.mp4` or frames taken from it.
- Credit "Rakib Hasan Sohag" as author wherever an author is named.

## Git

The owner allows agents to commit in this repo.

- Commit when a phase of work is complete and its checks pass. Push to `origin main` when a major part is finished, and at the end of every session.
- Stage only paths you own: `git add <paths>`, never `git add -A` or `git add .`. Other agents may be working in the same checkout.
- Before pushing: `git pull --rebase origin main`. If the rebase conflicts in a file you do not own, stop and report it.
- Commit messages: short imperative subject, for example `engine: add capture chains`. No AI attribution, no co-author trailer, no session links.
- Never force-push, never rewrite pushed history.
