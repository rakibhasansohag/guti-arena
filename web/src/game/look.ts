import { createContext, useContext, useSyncExternalStore } from 'react';
import { DEFAULT_LOOK, parseLook, type CourtId, type Look } from '@guti-arena/engine';

/** The look boards and seat pips draw with: the room's in a room, this device's on `/play`. */
export const LookContext = createContext<Look>(DEFAULT_LOOK);
export const useLook = () => useContext(LookContext);

/**
 * Court surfaces, drawn in board units under the lines. `line` colours the board lines and
 * points; dark courts also light the pieces' contact shadow and the keyboard focus ring.
 */
export const COURT: Record<CourtId, { ground: string; line: string; dark: boolean }> = {
  earth: { ground: 'var(--color-earth)', line: 'var(--color-charcoal)', dark: false },
  wood: { ground: '#A8743F', line: 'var(--color-charcoal)', dark: false },
  kantha: { ground: '#F0E4CC', line: '#34396A', dark: false },
  slate: { ground: '#2F3D38', line: '#F1ECE0', dark: true },
  sand: { ground: '#E3C896', line: 'var(--color-charcoal)', dark: false },
  night: { ground: '#1E2A40', line: '#EDE6D4', dark: true },
};

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
