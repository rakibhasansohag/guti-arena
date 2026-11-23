import {
  getSettings,
  setSettings,
  subscribeSettings,
  useSettings,
  type Settings,
} from './settings.ts';

/** Kenney CC0 clips in `public/sounds/` (see `credits.txt` there). */
export type Sound =
  | 'move'
  | 'select'
  | 'capture'
  | 'chain'
  | 'invalid'
  | 'turn'
  | 'tick'
  | 'win'
  | 'lose'
  | 'draw'
  | 'start'
  | 'join'
  | 'reaction'
  | 'click';

/** The clip each sound plays; sounds missing here stay silent. */
const FILE: Partial<Record<Sound, string>> = {
  move: 'move',
  capture: 'capture',
  chain: 'capture',
  turn: 'turn',
  win: 'win',
  lose: 'lose',
  draw: 'lose',
};
/** Repeats of these get a small random pitch spread, so they never sound like a machine. */
const SPREAD = new Set<Sound>(['move', 'capture', 'chain']);

interface Engine {
  ctx: AudioContext;
  master: GainNode;
  effects: GainNode;
}

let engine: Engine | null = null;
const clips = new Map<string, AudioBuffer>();

/** Volume slider (0 to 100) to gain: squared, so the slider feels even to the ear. */
const gainOf = (v: number) => (v / 100) ** 2;

async function load(file: string): Promise<void> {
  if (!engine) return;
  try {
    const res = await fetch(`/sounds/${file}.mp3`);
    if (res.ok) clips.set(file, await engine.ctx.decodeAudioData(await res.arrayBuffer()));
  } catch {
    // missing file or a codec the browser lacks: that sound stays silent
  }
}

function applyVolumes(s: Settings) {
  if (!engine) return;
  const t = engine.ctx.currentTime;
  // A short glide, so dragging a slider never clicks.
  engine.master.gain.setTargetAtTime(s.muted ? 0 : gainOf(s.master), t, 0.02);
  engine.effects.gain.setTargetAtTime(gainOf(s.effects), t, 0.02);
}

/** Browsers allow audio only after a user gesture: the engine starts on the first one. */
function start() {
  if (engine) {
    if (engine.ctx.state === 'suspended' && !document.hidden) void engine.ctx.resume();
    return;
  }
  try {
    const ctx = new AudioContext();
    const master = new GainNode(ctx);
    master.connect(ctx.destination);
    const effects = new GainNode(ctx);
    effects.connect(master);
    engine = { ctx, master, effects };
  } catch {
    return; // no Web Audio: the game is silent
  }
  applyVolumes(getSettings());
  void engine.ctx.resume();
  for (const file of new Set(Object.values(FILE))) void load(file);
}

if (typeof window !== 'undefined') {
  window.addEventListener('pointerdown', start, { capture: true });
  window.addEventListener('keydown', start, { capture: true });
  document.addEventListener('visibilitychange', () => {
    if (!engine) return;
    void (document.hidden ? engine.ctx.suspend() : engine.ctx.resume());
  });
  subscribeSettings(() => applyVolumes(getSettings()));
}

/** Play one clip. Plays overlap, so a fast chain of captures never cuts itself off. */
export function play(name: Sound): void {
  const e = engine;
  const file = FILE[name];
  const buffer = file && clips.get(file);
  if (!e || !buffer || e.ctx.state !== 'running' || getSettings().muted) return;
  try {
    const source = new AudioBufferSourceNode(e.ctx, {
      buffer,
      playbackRate: SPREAD.has(name) ? 0.97 + Math.random() * 0.06 : 1,
    });
    source.connect(e.effects);
    source.start();
  } catch {
    // never let sound break the game
  }
}

export function setMuted(value: boolean): void {
  setSettings({ muted: value });
}

export const useMuted = (): boolean => useSettings().muted;
