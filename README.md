# Guti Arena

A free, open-source, browser-only version of four-colour Sholo Guti (ষোলো গুটি), the South Asian folk board game. Play on one device, against the computer, or online with friends in a private room. Bangla first, English too.

## Run it

Needs Node 24 and pnpm 10.

```bash
pnpm install
pnpm dev
```

`pnpm dev` starts the web app on http://localhost:5173 and the Cloudflare Worker on http://localhost:8787 (the web app proxies `/api` to it).

| Script           | Does                                               |
| ---------------- | -------------------------------------------------- |
| `pnpm dev`       | Web and worker dev servers                         |
| `pnpm build`     | Builds `web/dist`, then dry-runs the worker bundle |
| `pnpm lint`      | oxlint, then ls-lint (kebab-case file names)       |
| `pnpm typecheck` | Strict TypeScript in every package                 |
| `pnpm format`    | Prettier                                           |
| `pnpm test`      | Vitest in `engine` and `worker`                    |

## Layout

| Folder    | What                                                                                           |
| --------- | ---------------------------------------------------------------------------------------------- |
| `engine/` | Board, rules, AI and the client–server protocol, in plain TypeScript, shared by web and worker |
| `web/`    | Vite, React, Tailwind CSS, shadcn/ui and Motion client                                         |
| `worker/` | Cloudflare Worker that serves the built client and runs one Durable Object per online room     |
| `docs/`   | Design system (`DESIGN.md`) and build plans                                                    |

## Credits

Made by Rakib Hasan Sohag.

Sounds from [Kenney](https://kenney.nl) and ground texture from [Poly Haven](https://polyhaven.com), both CC0.

## License

Code is MIT. The "Guti Arena" name, logo, artwork and sounds made for this project are reserved. See [LICENSE](LICENSE).
