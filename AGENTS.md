# AGENTS.md

Guidance for coding agents working on Guti Arena.

## Project

Guti Arena is a free, open-source, browser-only version of the four-colour Sholo Guti folk game. Mobile first, 2 to 4 seats with any mix of real players and AI, local play, solo against AI and private online rooms. Runs entirely on Cloudflare. Bangla first, English second. Author: Rakib Hasan Sohag.

No betting, wagering or money features anywhere, including copy and art.

## Layout

- `engine/` (`@guti-arena/engine`): plain TypeScript, imported as source by web and worker.
  - `src/types.ts`, `src/board.ts`, `src/protocol.ts`: shared contracts. Change them only with the smallest additive edit.
  - `src/rules.ts`, `src/ai.ts`: rules and AI.
  - `test/`: Vitest.
- `web/`: Vite, React, TypeScript, Tailwind CSS v4, shadcn/ui (`src/components/ui/`), Motion, React Router v8 (declarative mode, routes in `src/app.tsx`).
  - `src/styles/tokens.css`: design tokens. `src/styles/index.css`: Tailwind entry and shadcn mapping.
  - `src/i18n/`: `useT(namespace)` over plain dictionaries, `<namespace>.<bn|en>.ts`. Language is a `?lang=bn|en` link (remembered), else the `lang` value in `localStorage`, default `bn`.
  - `src/pages/`: one lazy-loaded page per route: `/`, `/how-to-play`, `/play`, `/r/:code`. Each page renders its own `<title>` (React 19 hoists it); `index.html` only has a fallback.
  - `src/share/`: `BoardArt` (static board drawing from the engine's points and lines), `ShareCard` and `shareInvite` (result card and room invites), `Seo` (per-page head tags), `SiteHeader`, `SiteFooter`, `LangSwitch`.
  - `src/game/`: `<GameBoard />` (renders any `GameState`, animates the change, emits moves; used by `/play` and rooms), `sound.ts` (Kenney clips, mute in `localStorage`), `ask-ai.ts` + `ai-worker.ts` (engine AI in a Web Worker), `GameHeader`, `SeatPip`, `MuteButton`, and the cosmetic looks: `court.tsx` (court surfaces), `look.ts` (`LookContext`, the device's saved look), `look-picker.tsx` (`LookPicker`, `LookButton`); the piece sets are `Guti` in `src/share/guti.tsx`. See `docs/DESIGN.md`.
  - `src/net/`: `useRoom(code)` (one WebSocket, backoff reconnect, auto-rejoin with the remembered name), `playerId` and name in `localStorage`, Turnstile loader (production site key on the live host, Cloudflare's test key elsewhere).
  - `src/room/`: `/r/new` creation, name prompt, lobby, live game and end screen, and the not-found / full / daily-limit screens.
  - Prerender: `pnpm --filter web build` also renders `/` and `/how-to-play` to static Bangla HTML (`src/entry-server.tsx`, `scripts/prerender.mjs`); `main.tsx` hydrates it. Anything those two pages render must give the same markup on server and client: no `window`, `localStorage` or random values during render. The prerender inlines the CSS and starts the app script after the `load` event on those two pages (at once for any other route or for English), so their buttons become interactive a moment after the page shows. It also appends the Content-Security-Policy to `dist/_headers`, with hashes of those inline scripts (they change every build); security and cache headers live in `public/_headers`.
  - `pnpm --filter web make-images` regenerates `public/og/guti-arena.png`, `public/icons/*` and the board pictures `public/board/*.webp` with headless Edge or Chrome and ffmpeg. Re-run it after changing `BoardArt` or the start position.
- `worker/`: Cloudflare Worker. `wrangler.jsonc` serves `../web/dist` with single-page-app fallback; only `/api/*` runs the Worker. Durable Object binding `ROOM`, class `Room`, SQLite storage (declared with `exports`). Run `pnpm --filter worker cf-typegen` after editing `wrangler.jsonc`. Room rules are plain functions in `src/room-logic.ts` (tested in `test/`); `src/index.ts` is the Durable Object and the `/api` routes. Deployed to the custom domain `guti.rakibhasansohag.com` (`workers_dev` off). Secret `TURNSTILE_SECRET` is set in Cloudflare; `.dev.vars` holds Cloudflare's public always-pass test secret for local dev.
- `docs/DESIGN.md`: the design system.

## Scripts (from the repo root)

| Command          | Does                                                                |
| ---------------- | ------------------------------------------------------------------- |
| `pnpm install`   | Install everything (pnpm workspaces)                                |
| `pnpm dev`       | Web on 5173 (proxies `/api` to 8787) and worker on 8787             |
| `pnpm build`     | Build `web/dist`, then dry-run the worker bundle into `worker/dist` |
| `pnpm lint`      | oxlint, then ls-lint                                                |
| `pnpm typecheck` | `tsc` in every package                                              |
| `pnpm format`    | Prettier, whole repo                                                |
| `pnpm test`      | Vitest in `engine` and `worker`                                     |

Run one package with `pnpm --filter <name> <script>`, e.g. `pnpm --filter @guti-arena/engine test`.

## The game

- **Board:** a 7 by 7 grid of points joined by horizontal and vertical lines only, plus a triangle on each side. Each triangle's apex is the grid's mid-edge point; outside the grid it has a middle row of 3 points and a base row of 3 points. Total 73 points.
- **Other boards:** the four-colour board is the default (`board: 'four'`). Two two-player boards (blue north against white south) can be picked on `/play` and by the room host (`set-board`): `classic`, a 5 by 5 grid with alternating diagonals plus a full-width triangle north and south whose sides continue the diagonals (37 points, 16 pieces each, middle row starts empty), and `quick`, the same grid without triangles (25 points, 12 each, centre empty). `GameState.board` names the board; a missing value means the four-colour board. Rules and AI read the board from the state (`boardOf`).
- **Seats, clockwise:** 0 north (blue), 1 east (yellow), 2 south (white), 3 west (red).
- **Pieces:** 18 per seat: the 6 triangle points plus 12 grid points. Only the centre point starts empty when all four seats play. With fewer seats, unused seats' points start empty; two players sit at seats 0 and 2 by default.
- **Move:** one step along a line to an adjacent empty point.
- **Capture:** jump over an adjacent piece of any other seat, along one straight line, to the empty point directly beyond. The jumped piece is removed. The same piece may keep jumping in the same turn or stop. Capturing is optional.
- **Turn order:** clockwise, skipping eliminated seats and seats with no legal move.
- **End:** a seat with no pieces is out. Last seat with pieces wins. If 40 full rounds pass with no capture, the seat with the most pieces wins; a tie is a draw.
- **Looks:** court surface and piece set are cosmetic (`Look` in `protocol.ts`): each device picks its own on `/play`; in a room the host picks for everyone (`set-look`, any phase).
- **Timer online:** 30 seconds per turn. On timeout the server plays a medium-AI move for that seat.

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
