import { useSyncExternalStore } from 'react';

/** This device's game options, saved as one object in `localStorage` under `settings`. */
export interface Settings {
  /** Volumes, 0 to 100. */
  master: number;
  effects: number;
  /** One-tap mute: keeps the volumes. */
  muted: boolean;
  /** Show other players' reaction bubbles. */
  reactionBubbles: boolean;
  /** Buzz briefly on a capture and on your turn, where the device can. */
  vibration: boolean;
  reduceMotion: 'system' | 'on' | 'off';
}

export const DEFAULT_SETTINGS: Settings = {
  master: 80,
  effects: 80,
  muted: false,
  reactionBubbles: true,
  vibration: true,
  reduceMotion: 'system',
};

const KEY = 'settings';
const listeners = new Set<() => void>();
let current = DEFAULT_SETTINGS;

const volume = (v: unknown, d: number) =>
  typeof v === 'number' && Number.isFinite(v) ? Math.min(100, Math.max(0, Math.round(v))) : d;

/** Anything from storage, made safe: unknown or bad fields fall back to the defaults. */
export function parseSettings(raw: unknown): Settings {
  const o = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const d = DEFAULT_SETTINGS;
  const bool = (v: unknown, def: boolean) => (typeof v === 'boolean' ? v : def);
  return {
    master: volume(o.master, d.master),
    effects: volume(o.effects, d.effects),
    muted: bool(o.muted, d.muted),
    reactionBubbles: bool(o.reactionBubbles, d.reactionBubbles),
    vibration: bool(o.vibration, d.vibration),
    reduceMotion:
      o.reduceMotion === 'on' || o.reduceMotion === 'off' ? o.reduceMotion : d.reduceMotion,
  };
}

if (typeof window !== 'undefined') {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) current = parseSettings(JSON.parse(raw));
    else if (localStorage.getItem('muted') === '1') current = { ...current, muted: true }; // the old mute key
    localStorage.removeItem('muted');
  } catch {
    // blocked storage or a bad value: the defaults
  }
}

export const getSettings = (): Settings => current;

export function setSettings(patch: Partial<Settings>): void {
  current = { ...current, ...patch };
  try {
    localStorage.setItem(KEY, JSON.stringify(current));
  } catch {
    // ignore: the change lasts for this page only
  }
  for (const l of listeners) l();
}

export function subscribeSettings(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function useSettings(): Settings {
  return useSyncExternalStore(subscribeSettings, getSettings, () => DEFAULT_SETTINGS);
}

/** Whether other players' reaction bubbles show (for the room screens). */
export const useReactionBubbles = () => useSettings().reactionBubbles;

/** Motion's `MotionConfig reducedMotion` value for the saved choice. */
export const motionPolicy = (s: Settings) =>
  s.reduceMotion === 'on' ? 'always' : s.reduceMotion === 'off' ? 'never' : 'user';

/** A short buzz, when the device can and the player wants it. */
export function buzz(ms: number | number[]): void {
  if (!current.vibration || typeof navigator === 'undefined' || !navigator.vibrate) return;
  try {
    navigator.vibrate(ms);
  } catch {
    // some browsers throw before a user gesture
  }
}
