# Guti Arena design

Read this before any UI work. There is one visual style; do not invent a second.

## Art direction: clay and chalk

Warm packed-earth ground, hand-drawn charcoal board lines, glossy pebble pieces, as in the reference footage of the game being played on a swept-earth floor.

## Colour

Tokens live in `web/src/styles/tokens.css` (Tailwind `@theme static`, so each is a utility like `bg-clay` and a CSS variable like `var(--color-clay)`).

| Token          | Hex       | Use                                       |
| -------------- | --------- | ----------------------------------------- |
| `earth`        | `#C9A27A` | Page ground                               |
| `clay`         | `#B5653D` | Buttons, accents, focus ring              |
| `charcoal`     | `#2B2622` | Board lines, text                         |
| `chalk`        | `#F4EDE1` | Cards, highlights                         |
| `piece-blue`   | `#1F5FBF` | Seat 0, north                             |
| `piece-yellow` | `#E8B923` | Seat 1, east                              |
| `piece-white`  | `#F7F4EC` | Seat 2, south, always with a charcoal rim |
| `piece-red`    | `#D1342C` | Seat 3, west                              |

shadcn/ui semantic colours (`primary`, `card`, `muted` and so on) are mapped onto these in `web/src/styles/index.css`. There is no dark theme.

### Seat marks

Every seat also has a mark for colour-blind players, shown on its pieces and its seat badge:

| Seat    | Colour | Mark    |
| ------- | ------ | ------- |
| 0 north | blue   | dot     |
| 1 east  | yellow | ring    |
| 2 south | white  | cross   |
| 3 west  | red    | diamond |

## Type

Installed through Fontsource and imported in `web/src/main.tsx`.

| Role                                       | Latin   | Bangla      |
| ------------------------------------------ | ------- | ----------- |
| Display (`font-display`, all `h1` to `h3`) | Baloo 2 | Baloo Da 2  |
| Body and UI (`font-sans`)                  | Inter   | Anek Bangla |

Each stack lists the Latin font first and the Bangla font second, so mixed Bangla and English text picks the right font per glyph with no language switch. Loaded, as single-script subsets only (Latin for Inter and Baloo 2, Bengali for Anek Bangla and Baloo Da 2): body 400 and display 800 only. Buttons, pills, labels, nav links and the language switch use the display face (extrabold) rather than a semibold body weight, so the first screen loads four font files. Add a weight in `main.tsx` before using it; every extra face costs about 20 to 60 KB and slows the first paint on phones.

Text on clay uses `clay-deep` (`#9A4F2C`, 5.1:1 with chalk). Plain `clay` is 3.7:1 with chalk, so keep it for large text, icons and accents.

## Shape and depth

- Radius 20 px on cards (`rounded-clay`), pill buttons (`rounded-full`) and round pieces.
- Shadow (`shadow-clay`), two layers: `0 8px 20px rgb(43 38 34 / .25)` plus `inset 0 2px 0 rgb(255 255 255 / .35)`.
- Pieces have a specular highlight (a soft white ellipse top-left) and a contact shadow (a blurred dark ellipse under the piece).
- Board lines get a slight hand-drawn wobble from an SVG `feTurbulence` plus `feDisplacementMap` filter. Keep the displacement small (about 1.5 to 2 px at phone size) so lines stay readable.

## Motion

| What                                        | Timing                                                                     |
| ------------------------------------------- | -------------------------------------------------------------------------- |
| Colour fades                                | 200 ms ease-out                                                            |
| UI state changes (open, close, tabs, steps) | 300 to 400 ms, `ease-clay` = `cubic-bezier(.22,1,.36,1)`                   |
| Piece move                                  | 350 ms ease-out, then a 120 ms settle                                      |
| Capture                                     | 450 ms arc jump, then the captured piece scales down and fades over 250 ms |
| Turn timer                                  | Ring drains linearly; pulses in the last 5 seconds                         |

Durations are also CSS variables in `tokens.css` (`--duration-piece-move` and others). Accordions animate their height and tabs crossfade; nothing snaps. Under `prefers-reduced-motion`, everything is instant or fade-only (a global rule in `tokens.css` already shortens CSS transitions; Motion components should check `useReducedMotion`).

### Hover and press

- Every actionable element shows the pointer cursor (a base rule in `web/src/styles/index.css`); disabled ones show `not-allowed`. Focus shows a 2 px clay outline.
- Buttons (`Button`) step up 2 px on hover and press down 1 px on click over 350 ms `ease-clay`; colours fade over 200 ms and icons grow to 110 %. Pill buttons (`CTA` in `web/src/share/site-chrome.tsx`) also deepen their shadow to `shadow-clay-lift` on hover.
- FAQ triggers turn `clay-deep` on hover and the chevron nudges 2 px toward the panel.
- Under `prefers-reduced-motion`, hover and press change colour only (a rule in `index.css` cancels the lift and icon scale).
- Text links draw an underline from the left on hover.
- The FAQ accordion opens and closes its height over 350 ms `ease-clay` (set with `--tw-duration` and `--tw-ease` on the accordion root).
- No scroll-triggered reveals or parallax. The one ambient loop is the hero board's piece hopping to the centre and back every 3.2 s.

## Shared pieces

- `BoardArt` (`web/src/share/board-art.tsx`) draws the board from the engine's `POINTS` and `LINES`, with pebble pieces, seat marks, the wobble filter, optional arrows (jumps arc over the piece they take) and faded "ghost" pieces. Use it for any static board picture; the playable board lives in `web/src/game/`. With `image="hero"` or `"full"` it shows the pre-drawn WebP in `web/public/board/` (800 to 2400 px, from `pnpm --filter web make-images`) instead of inline SVG: big board pictures above the fold must use this, because a detailed SVG rasterises on the main thread and delays the first paint.
- The playable board is `GameBoard` in `web/src/game/`: the same pebbles (`Pebble` is shared), an earth texture (`public/textures/earth.webp`) multiplied over `earth`, chalk dots for legal destinations, a dashed clay ring where the last move started and a solid one where it landed. Seat badges sit in the board's corners beside each triangle (on the two-player boards they stand upright in the free columns beside the board); the active one lifts with a clay ring and, online, a draining timer ring. On phones the AI level tag shrinks to a robot icon.
- `SEAT_FILL` (`web/src/share/seat-colours.ts`) maps seats to the piece colour variables.

## Layout

- Mobile first.
- Check every page at 390, 1440, 1920, 2560, 3440 and 3840 px wide.
- The root font size steps up at 1920 px (112.5%, also `3xl:`), 2560 px (131.25%, also `4xl:`), 3200 px (150%) and 3800 px (175%). Size things in rem so they follow, and scale containers, type and spacing up with `3xl:` and `4xl:`, so nothing sits tiny in the middle or stretches edge to edge. At 3440 and 3840 px the page container spans about two thirds of the screen.
- Below-the-fold sections on long pages use `content-visibility: auto` so the first screen paints first.

## References

- Landing page: board-game sites [Bangkok Pains](https://www.awwwards.com/sites/bangkok-pains-the-board-game) and [Splattered Ink Games](https://www.awwwards.com/sites/splattered-ink-games).
- Tactile panels: [Wooden Game UI Pack](https://dribbble.com/shots/1580065-Wooden-Game-UI-Pack) and [Wooden Games UI/UX](https://www.behance.net/gallery/57984323/Wooden-Games-UiUX), translated from wood to clay.
- Move behaviour: the Lichess board (behaviour only; its code is GPL, do not copy it).
- Decorative edges: [nakshi kantha stitch borders](https://www.aramcoworld.com/articles/2025/ma25/nakshi-kantha-tradition-and-identity-in-every-stitch).

## Free assets

- Sound: Kenney [Casino Audio](https://kenney.nl/assets/casino-audio) and [Interface Sounds](https://kenney.nl/assets/interface-sounds), CC0.
- Ground texture: Poly Haven [dirt floor](https://polyhaven.com/a/dirt_floor), CC0, 1K size.

## Never

No betting, wagering, coins, chips or money imagery anywhere, in copy or in art. Casino Audio is used for its clicks and clacks only.
