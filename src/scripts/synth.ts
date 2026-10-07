// A line-for-line port of SoundSynth.swift from the LidShutter app.
// Every sound is generated here as raw samples: no audio files.

import type { SoundId } from '../data/sounds';

export const SAMPLE_RATE = 44_100;
const TAU = Math.PI * 2;

type Buf = Float32Array;
const rand = (lo: number, hi: number) => lo + Math.random() * (hi - lo);
const noise = () => Math.random() * 2 - 1;

function smoothstep(e0: number, e1: number, x: number) {
  const t = Math.max(0, Math.min(1, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
}

const silence = (seconds: number): Buf => new Float32Array(Math.floor(seconds * SAMPLE_RATE));

// MARK: - Building blocks

function addGlide(
  out: Buf, start: number, duration: number, from: number, to: number,
  amp: number, decay: number, attack = 0.005, harmonics: number[] = [1],
) {
  const first = Math.floor(start * SAMPLE_RATE);
  const count = Math.floor(duration * SAMPLE_RATE);
  let phase = 0;
  for (let i = 0; i < count && first + i < out.length; i++) {
    const t = i / SAMPLE_RATE;
    phase += (TAU * from * Math.pow(to / from, t / duration)) / SAMPLE_RATE;
    let value = 0;
    for (let k = 0; k < harmonics.length; k++) value += harmonics[k] * Math.sin((k + 1) * phase);
    const env = smoothstep(0, attack, t) * Math.exp(-t / decay) * (1 - smoothstep(duration - 0.01, duration, t));
    out[first + i] += amp * env * value;
  }
}

function addWobble(
  out: Buf, start: number, duration: number, from: number, to: number,
  rate: number, depth: number, amp: number, decay: number, harmonics: number[] = [1],
) {
  const first = Math.floor(start * SAMPLE_RATE);
  const count = Math.floor(duration * SAMPLE_RATE);
  let phase = 0;
  for (let i = 0; i < count && first + i < out.length; i++) {
    const t = i / SAMPLE_RATE;
    const base = from * Math.pow(to / from, t / duration);
    phase += (TAU * base * (1 + depth * Math.sin(TAU * rate * t))) / SAMPLE_RATE;
    let value = 0;
    for (let k = 0; k < harmonics.length; k++) value += harmonics[k] * Math.sin((k + 1) * phase);
    const env = smoothstep(0, 0.01, t) * Math.exp(-t / decay) * (1 - smoothstep(duration - 0.02, duration, t));
    out[first + i] += amp * env * value;
  }
}

const addSqueak = (out: Buf, start: number, duration: number, from: number, to: number, amp: number) =>
  addWobble(out, start, duration, from, to, 28, 0.06, amp, duration * 0.7, [1, 0.45, 0.25, 0.12]);

const addMarimba = (out: Buf, start: number, frequency: number, amp: number) =>
  addGlide(out, start, 0.6, frequency, frequency, amp, 0.22, 0.002, [1, 0, 0, 0.35]);

const addBubble = (out: Buf, start: number, frequency: number, amp: number, size = 1) =>
  addGlide(out, start, 0.07 * size, frequency, frequency * 2.4, amp, 0.04 * size, 0.003);

function addZipper(out: Buf, start: number, duration: number, amp: number) {
  let t = 0;
  while (t < duration) {
    const progress = t / duration;
    const first = Math.floor((start + t) * SAMPLE_RATE);
    let previous = 0;
    for (let i = 0; i < Math.floor(0.003 * SAMPLE_RATE) && first + i < out.length; i++) {
      const n = noise();
      const click = n - previous;
      previous = n;
      out[first + i] += amp * (0.4 + 0.6 * progress) * click * Math.exp(-i / (0.0008 * SAMPLE_RATE));
    }
    t += 0.024 - 0.017 * progress;
  }
}

function addSparkle(out: Buf, from: number, to: number, count: number) {
  for (let c = 0; c < count; c++) {
    const pitch = rand(2600, 4200);
    addGlide(out, rand(from, to), 0.12, pitch, pitch, 0.12, 0.04, 0.001, [1, 0.2]);
  }
}

function addClack(out: Buf, start: number, pitch: number, amp: number, woody = false) {
  addGlide(out, start, 0.03, pitch, pitch * 0.85, amp, woody ? 0.012 : 0.008, 0.0005,
    woody ? [1, 0.3] : [1, 0, 0.6, 0, 0.3]);
  const first = Math.floor(start * SAMPLE_RATE);
  for (let i = 0; i < Math.floor(0.002 * SAMPLE_RATE) && first + i < out.length; i++) {
    out[first + i] += amp * 0.3 * noise();
  }
}

function addRatchet(
  out: Buf, start: number, end: number, interval: [number, number],
  pitch: [number, number], amp: [number, number], woody = false,
) {
  let t = start;
  while (t < end) {
    const p = (t - start) / (end - start);
    addClack(out, t, pitch[0] + (pitch[1] - pitch[0]) * p, amp[0] + (amp[1] - amp[0]) * p, woody);
    t += interval[0] + (interval[1] - interval[0]) * p;
  }
}

function addNoise(
  out: Buf, start: number, duration: number, band: [number, number], amp: number,
  envelope: (t: number) => number,
) {
  const first = Math.floor(start * SAMPLE_RATE);
  const count = Math.floor(duration * SAMPLE_RATE);
  const kLow = 1 - Math.exp((-TAU * band[0]) / SAMPLE_RATE);
  const kHigh = 1 - Math.exp((-TAU * band[1]) / SAMPLE_RATE);
  const endT = (count - 1) / SAMPLE_RATE;
  let low = 0, high = 0;
  for (let i = 0; i < count && first + i < out.length; i++) {
    high += kHigh * (noise() - high);
    low += kLow * (high - low);
    const t = i / SAMPLE_RATE;
    const edge = smoothstep(0, 0.01, t) * (1 - smoothstep(endT - 0.02, endT, t));
    out[first + i] += amp * 3 * (high - low) * envelope(i / count) * edge;
  }
}

function addEngine(out: Buf, start: number, duration: number, rpm: [number, number], amp: number, putt: number) {
  const first = Math.floor(start * SAMPLE_RATE);
  let phase = 0;
  for (let i = 0; i < Math.floor(duration * SAMPLE_RATE) && first + i < out.length; i++) {
    const t = i / SAMPLE_RATE;
    const f = rpm[0] * Math.pow(rpm[1] / rpm[0], t / duration) * (1 + 0.03 * Math.sin(TAU * 6 * t));
    phase += (TAU * f) / SAMPLE_RATE;
    let buzz = 0;
    for (let k = 1; k <= 6; k++) buzz += Math.sin(k * phase) / k;
    const puttEnv = putt > 0 ? 0.55 + 0.45 * Math.sin(TAU * putt * t) : 1;
    const edge = smoothstep(0, 0.02, t) * (1 - smoothstep(duration - 0.04, duration, t));
    out[first + i] += amp * 0.6 * buzz * puttEnv * edge;
  }
}

const addChirp = (out: Buf, start: number, from: number, to: number, duration: number, amp: number) =>
  addGlide(out, start, duration, from, to, amp, duration * 0.9, 0.004, [1, 0.15]);

function addTweet(out: Buf, start: number, pitch = 1) {
  addChirp(out, start, 2600 * pitch, 3600 * pitch, 0.05, 0.4);
  addChirp(out, start + 0.05, 3600 * pitch, 3000 * pitch, 0.04, 0.3);
}

// MARK: - Instruments

function lidPop(): Buf {
  const out = silence(0.5);
  let phase = 0;
  const swoop = Math.floor(0.14 * SAMPLE_RATE);
  for (let i = 0; i < swoop; i++) {
    const t = i / SAMPLE_RATE;
    const p = t / 0.14;
    phase += (TAU * (420 + 880 * Math.exp(-p * 3))) / SAMPLE_RATE;
    const env = smoothstep(0, 0.02, t) * (1 - 0.6 * p);
    out[i] += 0.32 * env * (Math.sin(phase) + 0.25 * Math.sin(2 * phase));
  }
  const popStart = Math.floor(0.15 * SAMPLE_RATE);
  phase = 0;
  for (let i = 0; i < Math.floor(0.16 * SAMPLE_RATE) && popStart + i < out.length; i++) {
    const t = i / SAMPLE_RATE;
    phase += (TAU * (140 + 380 * Math.exp(-t / 0.012))) / SAMPLE_RATE;
    out[popStart + i] += 0.9 * Math.exp(-t / 0.05) * Math.sin(phase);
  }
  for (let i = 0; i < Math.floor(0.003 * SAMPLE_RATE); i++) out[popStart + i] += 0.25 * noise();
  const boingStart = Math.floor(0.19 * SAMPLE_RATE);
  phase = 0;
  for (let i = 0; i < out.length - boingStart; i++) {
    const t = i / SAMPLE_RATE;
    phase += (TAU * (300 + 70 * Math.sin(TAU * 17 * t))) / SAMPLE_RATE;
    out[boingStart + i] += 0.3 * smoothstep(0, 0.01, t) * Math.exp(-t / 0.1) * Math.sin(phase);
  }
  return out;
}

function rollingShutter(): Buf {
  const out = silence(1.7);
  addRatchet(out, 0.02, 1.15, [0.07, 0.035], [900, 1700], [0.35, 0.5]);
  addGlide(out, 0.05, 1.1, 350, 1300, 0.18, 2, 0.05, [1, 0.25]);
  addGlide(out, 1.2, 0.12, 220, 110, 0.7, 0.05, 0.001);
  addClack(out, 1.2, 1200, 0.6);
  addMarimba(out, 1.28, 1046.5, 0.5);
  addMarimba(out, 1.28, 1318.5, 0.25);
  return out;
}

function quickShutter(): Buf {
  const out = silence(1.0);
  addRatchet(out, 0.02, 0.55, [0.04, 0.025], [1000, 1800], [0.35, 0.5]);
  addGlide(out, 0, 0.55, 400, 1400, 0.18, 2, 0.03, [1, 0.25]);
  addGlide(out, 0.6, 0.16, 520, 140, 0.85, 0.05);
  addSparkle(out, 0.65, 0.9, 4);
  return out;
}

function homeShutter(): Buf {
  const out = silence(1.5);
  addRatchet(out, 0.02, 1.0, [0.08, 0.05], [500, 800], [0.3, 0.4], true);
  addGlide(out, 0.05, 0.95, 300, 900, 0.12, 2, 0.05, [1, 0.2]);
  addMarimba(out, 1.08, 783.99, 0.45);
  addMarimba(out, 1.08, 987.77, 0.22);
  return out;
}

function bell(): Buf {
  const out = silence(2.0);
  const base = rand(1250, 1350);
  const partials = [[1, 1, 0.9], [2.32, 0.5, 0.55], [3.9, 0.3, 0.3], [5.1, 0.2, 0.18], [0.5, 0.15, 0.7]];
  for (const [strikeTime, strikeAmp] of [[0, 1], [0.16, 0.7], [0.34, 0.45]]) {
    const start = Math.floor(strikeTime * SAMPLE_RATE);
    for (const [ratio, gain, tau] of partials) {
      const w = (TAU * base * ratio * (1 + rand(-0.003, 0.003))) / SAMPLE_RATE;
      for (let i = 0; i < out.length - start; i++) {
        out[start + i] += strikeAmp * gain * Math.exp(-i / SAMPLE_RATE / tau) * Math.sin(w * i);
      }
    }
  }
  return out;
}

function supercar(): Buf {
  const out = silence(1.7);
  addEngine(out, 0, 0.4, [70, 75], 0.35, 9);
  addEngine(out, 0.35, 0.95, [90, 420], 0.55, 0);
  addNoise(out, 0.9, 0.6, [800, 3000], 0.25, (t) => Math.sin(Math.PI * t));
  for (const s of [1.3, 1.45]) addGlide(out, s, 0.11, 520, 520, 0.3, 0.3, 0.005, [1, 0, 0.33, 0, 0.2]);
  return out;
}

function fighterJet(): Buf {
  const out = silence(1.8);
  addNoise(out, 0, 1.75, [600, 4000], 0.5, (t) =>
    t < 0.45 ? Math.pow(t / 0.45, 2) : Math.pow(Math.max(0, 1 - (t - 0.45) / 0.55), 1.5));
  addGlide(out, 0.2, 1.2, 1400, 350, 0.3, 1.5, 0.3, [1, 0.4, 0.2]);
  addMarimba(out, 1.45, 2093, 0.15);
  return out;
}

function morningBirds(): Buf {
  const out = silence(1.7);
  addTweet(out, 0); addTweet(out, 0.14);
  for (let i = 0; i < 6; i++) {
    const up = i % 2 === 0;
    addChirp(out, 0.4 + i * 0.03, up ? 3000 : 3400, up ? 3400 : 3000, 0.028, 0.3);
  }
  addChirp(out, 0.9, 2200, 3200, 0.07, 0.4);
  addChirp(out, 0.97, 3200, 2600, 0.06, 0.35);
  addTweet(out, 1.25); addTweet(out, 1.36, 1.1);
  return out;
}

function forestMorning(): Buf {
  const out = silence(1.9);
  addNoise(out, 0, 1.9, [200, 900], 0.08, (t) => Math.sin(Math.PI * t));
  for (const [time, note] of [[0, 783.99], [0.3, 987.77], [0.6, 1174.66]]) addMarimba(out, time, note, 0.3);
  addTweet(out, 0.5, 0.9); addTweet(out, 0.62, 0.9);
  addChirp(out, 1.1, 2400, 3300, 0.07, 0.3);
  addChirp(out, 1.2, 3300, 2700, 0.06, 0.25);
  return out;
}

function forestStream(): Buf {
  const out = silence(1.7);
  addNoise(out, 0, 1.7, [1000, 4000], 0.05, (t) => Math.sin(Math.PI * t));
  for (let i = 0; i < 30; i++) addBubble(out, rand(0, 1.5), rand(500, 1300), rand(0.15, 0.35), rand(0.5, 0.8));
  return out;
}

function oceanWaves(): Buf {
  const out = silence(2.0);
  addNoise(out, 0, 1.95, [150, 1800], 0.55, (t) => (t < 0.4 ? smoothstep(0, 0.4, t) : Math.max(0, 1 - (t - 0.5) / 0.5)));
  addNoise(out, 0.85, 0.4, [1500, 6000], 0.4, (t) => Math.exp(-t * 6));
  for (let i = 0; i < 6; i++) addBubble(out, 1.0 + i * 0.1 + rand(0, 0.04), rand(900, 1500), 0.2, 0.6);
  return out;
}

function rainThunder(): Buf {
  const out = silence(2.0);
  for (let i = 0; i < 40; i++) {
    const time = 1.9 * Math.pow(Math.random(), 0.7);
    const pitch = rand(1800, 3200);
    addGlide(out, time, 0.03, pitch, pitch * 0.9, rand(0.1, 0.2), 0.012, 0.001);
  }
  addNoise(out, 0.7, 1.25, [30, 250], 0.8, (t) => smoothstep(0, 0.05, t) * Math.exp(-t * 2.2));
  addGlide(out, 0.72, 0.5, 90, 45, 0.6, 0.25, 0.01);
  return out;
}

function popOpen(): Buf {
  const out = silence(1.1);
  addGlide(out, 0, 0.16, 520, 140, 0.9, 0.05);
  addGlide(out, 0.08, 0.45, 420, 1500, 0.3, 0.6, 0.03, [1, 0.25]);
  addSparkle(out, 0.45, 0.9, 5);
  return out;
}

function tada(): Buf {
  const out = silence(1.2);
  for (const [time, note] of [[0, 523.25], [0.1, 659.25], [0.2, 783.99]]) addMarimba(out, time, note, 0.55);
  addMarimba(out, 0.32, 1046.5, 0.75);
  addMarimba(out, 0.32, 1318.5, 0.35);
  addSparkle(out, 0.4, 0.9, 5);
  return out;
}

function boingUp(): Buf {
  const out = silence(1.0);
  addGlide(out, 0, 0.1, 400, 150, 0.5, 0.04);
  addWobble(out, 0.02, 0.95, 180, 520, 14, 0.22, 0.55, 0.5, [1, 0.3]);
  return out;
}

function bubbleUp(): Buf {
  const out = silence(1.1);
  [0, 0.09, 0.17, 0.24, 0.3, 0.36, 0.42, 0.5].forEach((time, i) =>
    addBubble(out, time, 300 + 70 * i + rand(-30, 30), 0.35 + 0.03 * i));
  addBubble(out, 0.62, 260, 0.85, 1.6);
  addMarimba(out, 0.7, 1567.98, 0.2);
  return out;
}

function zipOpen(): Buf {
  const out = silence(1.0);
  addZipper(out, 0, 0.35, 0.55);
  addMarimba(out, 0.4, 1046.5, 0.6);
  addMarimba(out, 0.4, 1567.98, 0.3);
  addSparkle(out, 0.45, 0.8, 3);
  return out;
}

function squeakyHello(): Buf {
  const out = silence(0.9);
  addSqueak(out, 0, 0.14, 1400, 1800, 0.6);
  addSqueak(out, 0.22, 0.18, 1600, 2100, 0.65);
  addWobble(out, 0.48, 0.4, 260, 300, 16, 0.2, 0.25, 0.12);
  return out;
}

function bloopClose(): Buf {
  const out = silence(0.5);
  addGlide(out, 0, 0.14, 700, 350, 0.18, 0.2, 0.03, [1, 0.3]);
  addBubble(out, 0.15, 220, 0.9, 1.5);
  addBubble(out, 0.27, 500, 0.3);
  return out;
}

function zipShut(): Buf {
  const out = silence(0.5);
  addZipper(out, 0, 0.14, 0.5);
  addGlide(out, 0.15, 0.02, 2400, 1800, 0.6, 0.008, 0.001);
  addGlide(out, 0.15, 0.08, 180, 120, 0.6, 0.04, 0.001);
  addMarimba(out, 0.17, 1760, 0.15);
  return out;
}

function squeakClose(): Buf {
  const out = silence(0.5);
  addGlide(out, 0, 0.12, 600, 1200, 0.12, 0.2, 0.02);
  addSqueak(out, 0.15, 0.13, 1500, 1900, 0.6);
  addSqueak(out, 0.31, 0.07, 1700, 2100, 0.3);
  return out;
}

function goodnight(): Buf {
  const out = silence(0.5);
  addMarimba(out, 0, 1318.5, 0.5);
  addMarimba(out, 0.15, 1046.5, 0.8);
  addMarimba(out, 0.15, 523.25, 0.3);
  return out;
}

const instruments: Record<SoundId, () => Buf> = {
  rollingShutter, quickShutter, homeShutter, shopBell: bell, supercar, fighterJet,
  morningBirds, forestMorning, forestStream, oceanWaves, rainThunder, lidPop, popOpen,
  tada, boingUp, bubbleUp, zipOpen, squeakyHello, bloopClose, zipShut, squeakClose, goodnight,
};

/** Scales to a consistent peak and fades the edges to avoid clicks. */
function normalized(samples: Buf): Buf {
  let peak = 0;
  for (const s of samples) peak = Math.max(peak, Math.abs(s));
  if (peak === 0) return samples;
  const scale = 0.9 / peak;
  for (let i = 0; i < samples.length; i++) samples[i] *= scale;
  const fadeIn = Math.min(samples.length, Math.floor(0.005 * SAMPLE_RATE));
  const fadeOut = Math.min(samples.length, Math.floor(0.02 * SAMPLE_RATE));
  for (let i = 0; i < fadeIn; i++) samples[i] *= i / fadeIn;
  for (let i = 0; i < fadeOut; i++) samples[samples.length - 1 - i] *= i / fadeOut;
  return samples;
}

/**
 * Louder without clipping: gain into a tanh soft limiter, scaled so peaks stay at 0.95.
 * `boost` 1 is normal; 2 (200 %) is about 3× gain into the limiter.
 */
function boosted(samples: Buf, boost: number): Buf {
  if (boost <= 1.01) return samples;
  const gain = Math.pow(boost, 1.6);
  const ceiling = Math.tanh(gain);
  for (let i = 0; i < samples.length; i++) samples[i] = (0.95 * Math.tanh((gain * samples[i]) / 0.9)) / ceiling;
  return samples;
}

export function synthesize(id: SoundId, boost = 1): Float32Array {
  return boosted(normalized(instruments[id]()), boost);
}
