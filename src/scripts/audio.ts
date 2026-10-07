// Plays synthesized sounds and keeps the small bit of state every section shares:
// whether sound is on, the volume, what's playing, and the chosen open/close sounds.

import type { SoundId } from '../data/sounds';
import { synthesize, SAMPLE_RATE } from './synth';

export type HapticStrength = 'light' | 'medium' | 'strong';

interface State {
  soundOn: boolean;
  /** 0 to 2. Above 1 the sound itself is boosted, like the app's 200 % volume. */
  volume: number;
  hapticStrength: HapticStrength;
  /** The app's main switch: when off, lid sounds don't play. */
  enabled: boolean;
  haptics: boolean;
  nowPlaying: SoundId | null;
  openSound: SoundId;
  closeSound: SoundId;
  playOnOpen: boolean;
  playOnClose: boolean;
}

type Listener = (state: State) => void;

const STORE_KEY = 'lidshutter.prefs';

function loadPrefs(): Partial<State> {
  try {
    return JSON.parse(localStorage.getItem(STORE_KEY) ?? '{}');
  } catch {
    return {};
  }
}

const saved = loadPrefs();

const state: State = {
  // On by default; the browser still holds audio back until the first click, tap or key press.
  // A visitor who turns it off keeps it off on their next visit.
  soundOn: saved.soundOn ?? true,
  volume: Math.min(Math.max(saved.volume ?? 0.7, 0), 2),
  hapticStrength: saved.hapticStrength ?? 'medium',
  enabled: saved.enabled ?? true,
  haptics: saved.haptics ?? true,
  nowPlaying: null,
  openSound: saved.openSound ?? 'rollingShutter',
  closeSound: saved.closeSound ?? 'lidPop',
  playOnOpen: saved.playOnOpen ?? true,
  playOnClose: saved.playOnClose ?? true,
};

const listeners = new Set<Listener>();
const playListeners = new Set<(id: SoundId, duration: number) => void>();

/** Called every time a sound starts playing. */
export function onPlay(fn: (id: SoundId, duration: number) => void): () => void {
  playListeners.add(fn);
  return () => playListeners.delete(fn);
}

export function getState(): Readonly<State> {
  return state;
}

export function subscribe(fn: Listener): () => void {
  listeners.add(fn);
  fn(state);
  return () => listeners.delete(fn);
}

export function setState(patch: Partial<State>) {
  Object.assign(state, patch);
  try {
    const { soundOn, volume, hapticStrength, enabled, haptics, openSound, closeSound, playOnOpen, playOnClose } = state;
    localStorage.setItem(
      STORE_KEY,
      JSON.stringify({ soundOn, volume, hapticStrength, enabled, haptics, openSound, closeSound, playOnOpen, playOnClose }),
    );
  } catch {
    /* storage unavailable: preferences just won't persist */
  }
  if (master && 'volume' in patch) master.gain.setTargetAtTime(Math.min(state.volume, 1), ctx!.currentTime, 0.02);
  listeners.forEach((fn) => fn(state));
}

// MARK: - Playback

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let current: AudioBufferSourceNode | null = null;
const cache = new Map<string, AudioBuffer>();

/** Up to 100 % it's the gain; above that the samples are boosted (in 5 % steps, to keep the cache small). */
const boostFor = (volume: number) => Math.round(Math.max(1, Math.min(volume, 2)) * 20) / 20;

function ensureContext(): AudioContext {
  if (!ctx) {
    ctx = new AudioContext();
    master = ctx.createGain();
    master.gain.value = Math.min(state.volume, 1);
    master.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

function buffer(id: SoundId): AudioBuffer {
  const boost = boostFor(state.volume);
  const key = `${id}@${boost}`;
  let buf = cache.get(key);
  if (!buf) {
    const samples = synthesize(id, boost);
    buf = ensureContext().createBuffer(1, samples.length, SAMPLE_RATE);
    buf.copyToChannel(samples as Float32Array<ArrayBuffer>, 0);
    cache.set(key, buf);
  }
  return buf;
}

/** Turns sound on. Must be called from a click or key press. */
export function enableSound() {
  ensureContext();
  if (!state.soundOn) setState({ soundOn: true });
}

export function disableSound() {
  stop();
  setState({ soundOn: false });
}

/**
 * Browsers only start audio after a click, tap or key press, so every one of those tries to
 * unlock it (some browsers only accept certain events) until it's actually running.
 */
const unlockEvents = ['pointerdown', 'mousedown', 'touchstart', 'touchend', 'click', 'keydown'] as const;
const unlockWaiters: (() => void)[] = [];
function unlocked() {
  unlockEvents.forEach((e) => document.removeEventListener(e, unlock, true));
  unlockWaiters.splice(0).forEach((fn) => fn());
}
function unlock() {
  const audio = ensureContext();
  if (audio.state === 'running') return unlocked();
  // A silent blip, started inside the gesture, is what wakes audio on iOS Safari.
  const blip = audio.createBufferSource();
  blip.buffer = audio.createBuffer(1, 1, audio.sampleRate);
  blip.connect(audio.destination);
  blip.start();
  audio.resume().then(() => audio.state === 'running' && unlocked(), () => {});
}
unlockEvents.forEach((e) => document.addEventListener(e, unlock, true));

/** Whether a sound could be heard right now. */
export function audioUnlocked() {
  return ctx?.state === 'running';
}

/** Runs `fn` as soon as audio is unlocked (right away if it already is). */
export function whenUnlocked(fn: () => void) {
  if (audioUnlocked()) fn();
  else unlockWaiters.push(fn);
}

export function stop() {
  if (current) {
    current.onended = null;
    try { current.stop(); } catch { /* already stopped */ }
    current = null;
  }
  if (state.nowPlaying) setState({ nowPlaying: null });
}

/** A short scheduling lead, so the start lands on the audio clock exactly. */
const LEAD = 0.04;

/**
 * Plays a sound. A user-initiated play (a click) turns sound on; an automatic
 * play (scrolling) only happens when sound is on and the browser already allows audio.
 * Returns how many seconds until the sound is actually heard (0 if it didn't play),
 * so animations can start in sync with it.
 */
export function play(id: SoundId, { userInitiated = true } = {}): number {
  if (userInitiated) enableSound();
  if (!state.soundOn) return 0;
  // An automatic play before the browser allows audio would sit queued and come out late, so skip it.
  if (!userInitiated && !audioUnlocked()) return 0;
  const audio = ensureContext();
  stop();
  const source = audio.createBufferSource();
  // Synthesizing happens here, before the start time is scheduled, so it can't cause drift.
  source.buffer = buffer(id);
  source.connect(master!);
  source.onended = () => {
    if (current === source) {
      current = null;
      setState({ nowPlaying: null });
    }
  };
  current = source;
  source.start(audio.currentTime + LEAD);
  setState({ nowPlaying: id });
  playListeners.forEach((fn) => fn(id, source.buffer!.duration));
  // Time until it reaches the speakers: the lead plus the device's output latency.
  const latency = (audio.baseLatency || 0) + ((audio as AudioContext & { outputLatency?: number }).outputLatency || 0);
  return LEAD + Math.min(latency, 0.25);
}

export function toggle(id: SoundId) {
  if (state.nowPlaying === id) stop();
  else play(id);
}

/** Samples for drawing a waveform, without needing an AudioContext. */
export function samplesFor(id: SoundId): Float32Array {
  return synthesize(id);
}
