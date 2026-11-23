import type { CourtId } from '@guti-arena/engine';
import {
  getSettings,
  setSettings,
  subscribeSettings,
  useSettings,
  type Settings,
} from './settings.ts';

/** ElevenLabs clips in `public/sounds/` (see `credits.txt` there). */
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

const SOUNDS: Sound[] = [
  'move',
  'select',
  'capture',
  'chain',
  'invalid',
  'turn',
  'tick',
  'win',
  'lose',
  'draw',
  'start',
  'join',
  'reaction',
  'click',
];
/** Repeats of these get a small random pitch spread, so they never sound like a machine. */
const SPREAD = new Set<Sound>(['move', 'capture', 'chain']);
const FADE_S = 1;

interface Engine {
  ctx: AudioContext;
  master: GainNode;
  effects: GainNode;
  reactions: GainNode;
  ambience: GainNode;
}

let engine: Engine | null = null;
const clips = new Map<Sound, AudioBuffer>();
const loops = new Map<CourtId, Promise<AudioBuffer | null>>();
let court: CourtId | null = null;
let playing: { court: CourtId; source: AudioBufferSourceNode; gain: GainNode } | null = null;

/** Volume slider (0 to 100) to gain: squared, so the slider feels even to the ear. */
const gainOf = (v: number) => (v / 100) ** 2;

async function load(url: string): Promise<AudioBuffer | null> {
  if (!engine) return null;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return await engine.ctx.decodeAudioData(await res.arrayBuffer());
  } catch {
    return null; // missing file or a codec the browser lacks: that sound stays silent
  }
}

function applyVolumes(s: Settings) {
  if (!engine) return;
  const t = engine.ctx.currentTime;
  // A short glide, so dragging a slider never clicks.
  engine.master.gain.setTargetAtTime(s.muted ? 0 : gainOf(s.master), t, 0.02);
  engine.effects.gain.setTargetAtTime(gainOf(s.effects), t, 0.02);
  engine.reactions.gain.setTargetAtTime(gainOf(s.reactions), t, 0.02);
  engine.ambience.gain.setTargetAtTime(gainOf(s.ambience), t, 0.02);
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
    const bus = () => {
      const g = new GainNode(ctx);
      g.connect(master);
      return g;
    };
    engine = { ctx, master, effects: bus(), reactions: bus(), ambience: bus() };
  } catch {
    return; // no Web Audio: the game is silent
  }
  applyVolumes(getSettings());
  void engine.ctx.resume();
  for (const name of SOUNDS) void load(`/sounds/${name}.mp3`).then((b) => b && clips.set(name, b));
  syncAmbience();
}

/** The sample range of a loop without the encoder's silent padding at either end. */
function loopRange(b: AudioBuffer): [number, number] {
  const data = b.getChannelData(0);
  let a = 0;
  let z = data.length - 1;
  while (a < z && Math.abs(data[a]!) < 1e-4) a++;
  while (z > a && Math.abs(data[z]!) < 1e-4) z--;
  return [a / b.sampleRate, (z + 1) / b.sampleRate];
}

function fadeOut(p: NonNullable<typeof playing>) {
  if (!engine) return;
  const t = engine.ctx.currentTime;
  p.gain.gain.cancelScheduledValues(t);
  p.gain.gain.setValueAtTime(p.gain.gain.value, t);
  p.gain.gain.linearRampToValueAtTime(0, t + FADE_S);
  p.source.stop(t + FADE_S + 0.05);
}

/** Plays the current court's loop while the ambience slider is up, crossfading on a change. */
function wish(): CourtId | null {
  const s = getSettings();
  return court && s.ambience > 0 && !s.muted && s.master > 0 ? court : null;
}

function syncAmbience() {
  if (!engine) return;
  const want = wish();
  if (playing?.court === want) return;
  if (playing) fadeOut(playing);
  playing = null;
  if (!want) return;
  let buffer = loops.get(want);
  if (!buffer) loops.set(want, (buffer = load(`/sounds/ambience/${want}.mp3`)));
  void buffer.then((b) => {
    const e = engine;
    // Loading took a moment: play only if this is still what should play.
    if (!b || !e || playing || wish() !== want) return;
    const source = new AudioBufferSourceNode(e.ctx, { buffer: b, loop: true });
    [source.loopStart, source.loopEnd] = loopRange(b);
    const gain = new GainNode(e.ctx, { gain: 0 });
    source.connect(gain).connect(e.ambience);
    const t = e.ctx.currentTime;
    gain.gain.linearRampToValueAtTime(1, t + FADE_S);
    source.start(t, source.loopStart);
    playing = { court: want, source, gain };
  });
}

if (typeof window !== 'undefined') {
  window.addEventListener('pointerdown', start, { capture: true });
  window.addEventListener('keydown', start, { capture: true });
  // Ambience (and anything still ringing) pauses while the tab is hidden.
  document.addEventListener('visibilitychange', () => {
    if (!engine) return;
    void (document.hidden ? engine.ctx.suspend() : engine.ctx.resume());
  });
  subscribeSettings(() => {
    applyVolumes(getSettings());
    syncAmbience();
  });
}

/** Play one clip. Plays overlap, so a fast chain of captures never cuts itself off. */
export function play(name: Sound): void {
  const e = engine;
  const buffer = clips.get(name);
  if (!e || !buffer || e.ctx.state !== 'running' || getSettings().muted) return;
  try {
    const source = new AudioBufferSourceNode(e.ctx, {
      buffer,
      playbackRate: SPREAD.has(name) ? 0.97 + Math.random() * 0.06 : 1,
    });
    source.connect(name === 'reaction' ? e.reactions : e.effects);
    source.start();
  } catch {
    // never let sound break the game
  }
}

/** The court whose ambience plays; null on pages without a court. */
export function setAmbienceCourt(next: CourtId | null): void {
  court = next;
  syncAmbience();
}

export function setMuted(value: boolean): void {
  setSettings({ muted: value });
}

export const useMuted = (): boolean => useSettings().muted;
