import { createContext, useContext, useSyncExternalStore, type CSSProperties } from 'react';
import { DEFAULT_LOOK, parseLook, type CourtId, type Look } from '@guti-arena/engine';

/** The look boards and seat pips draw with: the room's in a room, this device's on `/play`. */
export const LookContext = createContext<Look>(DEFAULT_LOOK);
export const useLook = () => useContext(LookContext);

/**
 * Court surfaces. `ground` and `line` colour the board (drawn in board units under the lines);
 * dark courts also light the pieces' contact shadow and the keyboard focus ring. `scene` is the
 * page background around the board, and `sceneDark` turns text set straight on it to chalk.
 */
export const COURT: Record<
  CourtId,
  { ground: string; line: string; dark: boolean; scene: string; sceneDark: boolean }
> = {
  earth: {
    ground: 'var(--color-earth)',
    line: 'var(--color-charcoal)',
    dark: false,
    scene: 'var(--color-earth)',
    sceneDark: false,
  },
  // A workshop table: wide planks.
  wood: {
    ground: '#A8743F',
    line: 'var(--color-charcoal)',
    dark: false,
    scene:
      'repeating-linear-gradient(0deg, transparent 0 7.9rem, rgb(0 0 0 / .22) 7.9rem 8rem), #6F4A2A',
    sceneDark: true,
  },
  // A quilt: rows of running stitch.
  kantha: {
    ground: '#F0E4CC',
    line: '#34396A',
    dark: false,
    scene:
      'repeating-linear-gradient(0deg, transparent 0 1.9rem, rgb(181 101 61 / .2) 1.9rem 2rem), #E4D3B0',
    sceneDark: false,
  },
  // A classroom wall.
  slate: {
    ground: '#2F3D38',
    line: '#F1ECE0',
    dark: true,
    scene: 'linear-gradient(#1D2824, #26332E)',
    sceneDark: true,
  },
  // A beach: sea at the top, sand below.
  sand: {
    ground: '#E3C896',
    line: 'var(--color-charcoal)',
    dark: false,
    scene: 'linear-gradient(#8CC6CF 0, #C4E2D6 14rem, #E9D6A8 24rem)',
    sceneDark: false,
  },
  // A courtyard under the moon.
  night: {
    ground: '#1E2A40',
    line: '#EDE6D4',
    dark: true,
    scene:
      'radial-gradient(circle at 82% 7rem, rgb(244 213 141 / .28), transparent 13rem), #111828',
    sceneDark: true,
  },
};

/** The pieces' shadow colour for a court, as an inline style for the board's `<svg>`. */
export const shadeOf = (look: Look) =>
  ({
    '--piece-shadow': COURT[look.court].dark ? 'var(--color-chalk)' : undefined,
  }) as CSSProperties;

const KEY = 'look';
const listeners = new Set<() => void>();
let saved: Look = DEFAULT_LOOK;

if (typeof window !== 'undefined') {
  try {
    saved = parseLook(JSON.parse(localStorage.getItem(KEY) ?? 'null')) ?? DEFAULT_LOOK;
  } catch {
    // blocked storage or a bad value: the default look
  }
}

/** This device's look, remembered across visits. */
export function saveLook(look: Look): void {
  saved = look;
  try {
    localStorage.setItem(KEY, JSON.stringify(look));
  } catch {
    // ignore: the choice lasts for this page only
  }
  for (const l of listeners) l();
}

export const savedLook = (): Look => saved;

export function useSavedLook(): Look {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => saved,
    () => DEFAULT_LOOK,
  );
}
