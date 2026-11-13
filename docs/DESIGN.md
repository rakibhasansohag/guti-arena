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

Each stack lists the Latin font first and the Bangla font second, so mixed Bangla and English text picks the right font per glyph with no language switch. Weights loaded: body 400 and 600, display 600 and 800. Add a weight in `main.tsx` before using it.

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

## Layout

- Mobile first.
- Check every page at 390, 1440, 1920, 2560, 3440 and 3840 px wide.
- At 1920 px (`3xl:`) and 2560 px (`4xl:`) the root font size steps up, and containers, type and spacing should scale up too, so nothing sits tiny in the middle or stretches edge to edge.

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
