// Port of Haptics.swift: the trackpad tap pattern for each sound,
// as (time offset in seconds, strong tap) pairs.

import type { SoundId } from '../data/sounds';
import type { HapticStrength } from './audio';

export type Tap = [number, boolean];

const range = (from: number, to: number, by: number) => {
  const out: number[] = [];
  for (let t = from; t < to - 1e-9; t += by) out.push(t);
  return out;
};
const light = (times: number[]): Tap[] => times.map((t) => [t, false]);
const strong = (times: number[]): Tap[] => times.map((t) => [t, true]);

export function hapticPattern(sound: SoundId, duration: number): Tap[] {
  switch (sound) {
    case 'lidPop':
    case 'bloopClose':
    case 'zipShut':
    case 'squeakClose':
    case 'goodnight':
      return [[0, false], [0.07, false], [0.15, true], [0.22, false], [0.28, false]];
    case 'tada':
      return [[0, false], [0.1, false], [0.2, false], [0.32, true]];
    case 'popOpen':
      return [[0, true], ...light(range(0.1, 0.5, 0.06))];
    case 'bubbleUp':
      return [...light([0, 0.09, 0.17, 0.24, 0.3, 0.36, 0.42, 0.5]), [0.62, true]];
    case 'zipOpen':
      return [...light(range(0, 0.35, 0.04)), [0.4, true]];
    case 'squeakyHello':
      return light([0, 0.05, 0.22, 0.28]);
    case 'boingUp':
      return [[0, true], ...light(range(0.08, 0.8, 0.07))];
    case 'shopBell':
      return [[0, true], [0.16, true], [0.34, false]];
    case 'morningBirds':
    case 'forestMorning':
      return light([0, 0.12, 0.7, 0.82, 1.35, 1.45, 1.9]);
    case 'forestStream':
      return light(range(0.2, 2.4, 0.22));
    case 'oceanWaves':
      return [...light(range(0.4, 1.8, 0.18)), ...strong(range(1.8, 2.4, 0.05)), ...light(range(2.5, 3.4, 0.2))];
    case 'rainThunder':
      return [...light(range(0.2, 1.1, 0.15)), ...strong(range(1.2, 2.9, 0.045))];
    case 'supercar':
      return [...light(range(0, 0.35, 0.12)), ...strong(range(0.4, 1.4, 0.04))];
    case 'fighterJet': {
      const taps: Tap[] = [];
      let t = 0;
      let gap = 0.3;
      while (t < duration - 0.4) {
        taps.push([t, gap < 0.08]);
        t += gap;
        gap = Math.max(0.04, gap * 0.85);
      }
      return taps;
    }
    default: {
      // Continuous buzz through the rattle, then a firm tap for the final clunk.
      const buzz = Math.min(duration * 0.7, 1.6);
      return [...light(range(0, buzz, 0.05)), [buzz + 0.05, true]];
    }
  }
}

/**
 * Light skips every other tap and uses soft taps; Strong makes every tap firm
 * and adds taps in between, so it feels denser. Same as Haptics.adjusted in the app.
 */
export function adjusted(pattern: Tap[], strength: HapticStrength): Tap[] {
  if (strength === 'light') return pattern.filter((_, i) => i % 2 === 0).map(([t]) => [t, false]);
  if (strength === 'strong') {
    const denser: Tap[] = [];
    pattern.forEach(([t], i) => {
      denser.push([t, true]);
      const next = pattern[i + 1];
      if (next && next[0] - t > 0.06) denser.push([t + (next[0] - t) / 2, true]);
    });
    return denser;
  }
  return pattern;
}
