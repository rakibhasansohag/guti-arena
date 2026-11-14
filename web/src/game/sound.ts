import { useSyncExternalStore } from 'react';

/** Kenney CC0 clips in `public/sounds/` (see `credits.txt` there). */
export type Sound = 'move' | 'capture' | 'turn' | 'win' | 'lose';

const KEY = 'muted';
const listeners = new Set<() => void>();
const clips = new Map<Sound, HTMLAudioElement>();
let unlocked = false; // browsers block audio until a user gesture; we wait for the same one
let muted = false;

if (typeof window !== 'undefined') {
  try {
    muted = localStorage.getItem(KEY) === '1';
  } catch {
    // blocked storage: sound stays on for this page
  }
  const unlock = () => {
    unlocked = true;
  };
  window.addEventListener('pointerdown', unlock, { once: true, capture: true });
  window.addEventListener('keydown', unlock, { once: true, capture: true });
}

export function play(name: Sound): void {
  if (!unlocked || muted) return;
  let clip = clips.get(name);
  if (!clip) {
    clip = new Audio(`/sounds/${name}.mp3`);
    clips.set(name, clip);
  }
  clip.currentTime = 0;
  clip.play().catch(() => {
    // autoplay refused or file missing: the game works silently
  });
}

export function setMuted(value: boolean): void {
  muted = value;
  try {
    localStorage.setItem(KEY, value ? '1' : '0');
  } catch {
    // ignore
  }
  for (const l of listeners) l();
}

export function useMuted(): boolean {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => muted,
    () => false,
  );
}
