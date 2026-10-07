// Little motion graphics, one per sound, timed to the moments in SoundSynth
// (ka-chunks, bell strikes, splashes...). Each builder fills `stage` and returns a
// paused GSAP timeline whose time 0 is the moment the sound starts.

import { gsap } from 'gsap';
import type { SoundId } from '../data/sounds';

type Builder = (stage: HTMLElement) => gsap.core.Timeline;

const rand = (lo: number, hi: number) => lo + Math.random() * (hi - lo);

function el(parent: HTMLElement, cls: string, style: Partial<CSSStyleDeclaration> = {}, html = ''): HTMLElement {
  const node = document.createElement('div');
  node.className = cls;
  Object.assign(node.style, style);
  if (html) node.innerHTML = html;
  parent.appendChild(node);
  return node;
}

const tl = () => gsap.timeline({ paused: true });

// MARK: - Shared effects

/** An expanding ring at (x%, y%). */
function ring(stage: HTMLElement, t: gsap.core.Timeline, at: number, x: number, y: number, size = 20, color = 'var(--tint)') {
  const r = el(stage, 'sc-ring', { left: `${x}%`, top: `${y}%`, width: `${size}cqw`, height: `${size}cqw`, borderColor: color, opacity: '0' });
  t.fromTo(r, { scale: 0.3, opacity: 0.9 }, { scale: 1.6, opacity: 0, duration: 0.7, ease: 'power2.out' }, at);
}

/** Four-point stars flying out from (x%, y%). */
function sparkles(stage: HTMLElement, t: gsap.core.Timeline, at: number, x: number, y: number, count = 10, reach = 22) {
  for (let i = 0; i < count; i++) {
    const s = el(stage, 'sc-star', { left: `${x}%`, top: `${y}%`, opacity: '0' });
    if (i % 3 === 0) s.style.background = '#fff';
    const a = (i / count) * Math.PI * 2 + rand(-0.2, 0.2);
    const d = rand(reach * 0.5, reach);
    t.fromTo(
      s,
      { x: 0, y: 0, scale: 0.4, opacity: 1, rotate: 0 },
      { x: `${Math.cos(a) * d}cqw`, y: `${Math.sin(a) * d}cqw`, scale: rand(0.6, 1.2), opacity: 0, rotate: 180, duration: rand(0.6, 0.9), ease: 'power3.out' },
      at,
    );
  }
}

/** A quick squash of the whole stage, for big hits. */
function thump(stage: HTMLElement, t: gsap.core.Timeline, at: number, amount = 1) {
  t.fromTo(stage, { y: 0 }, { y: `${0.8 * amount}cqw`, duration: 0.06, yoyo: true, repeat: 1, ease: 'power1.out' }, at);
}

/** A "♪" floating up. */
function note(stage: HTMLElement, t: gsap.core.Timeline, at: number, x: number, y: number) {
  const n = el(stage, 'sc-note', { left: `${x}%`, top: `${y}%`, opacity: '0' }, '♪');
  t.fromTo(n, { y: 0, opacity: 0, scale: 0.6 }, { y: '-14cqw', opacity: 1, scale: 1, duration: 0.5, ease: 'power2.out' }, at)
    .to(n, { opacity: 0, duration: 0.3 }, at + 0.4);
}

// MARK: - Shutters

function shop(variant: 'rolling' | 'quick' | 'home', hit: number): Builder {
  return (stage) => {
    const t = tl();
    const store = el(stage, `sc-shop ${variant === 'home' ? 'is-home' : ''}`);
    el(store, variant === 'home' ? 'sc-roof' : 'sc-awning');
    const door = el(store, 'sc-door');
    const inside = el(door, 'sc-inside');
    const sign = el(inside, 'sc-open', {}, variant === 'home' ? 'Home!' : 'OPEN');
    const slats = el(door, 'sc-slats');
    el(slats, 'sc-handle');
    t.set(sign, { scale: 0, rotate: -12 })
      .fromTo(slats, { yPercent: 0 }, { yPercent: -100, duration: hit, ease: variant === 'quick' ? 'power2.in' : 'power1.in' }, 0)
      .to(sign, { scale: 1, rotate: -4, duration: 0.6, ease: 'back.out(3)' }, hit);
    thump(stage, t, hit, variant === 'home' ? 0.5 : 1);
    sparkles(stage, t, hit + 0.05, 50, 58, variant === 'quick' ? 12 : 8);
    if (variant !== 'quick') ring(stage, t, hit + 0.08, 50, 58, 30);
    return t;
  };
}

// MARK: - Bells and chimes

function bell(strikes: number[]): Builder {
  return (stage) => {
    const t = tl();
    el(stage, 'sc-rope');
    const b = el(stage, 'sc-bell');
    el(b, 'sc-clapper');
    const swings = [22, -16, 10];
    strikes.forEach((at, i) => {
      t.to(b, { rotate: swings[i % 3], duration: 0.08, ease: 'power2.out' }, at).to(b, { rotate: 0, duration: 0.6, ease: 'elastic.out(1.2, 0.3)' }, at + 0.08);
      ring(stage, t, at, 50, 48, 26 + i * 6);
    });
    sparkles(stage, t, strikes[strikes.length - 1] + 0.05, 50, 48, 8, 26);
    return t;
  };
}

const goodnight: Builder = (stage) => {
  const t = tl();
  const moon = el(stage, 'sc-moon');
  for (let i = 0; i < 6; i++) {
    const s = el(stage, 'sc-twinkle', { left: `${rand(15, 85)}%`, top: `${rand(12, 70)}%` });
    t.fromTo(s, { scale: 0, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.25, yoyo: true, repeat: 1 }, rand(0, 0.35));
  }
  t.fromTo(moon, { scale: 0.7, rotate: -20, opacity: 0 }, { scale: 1, rotate: 0, opacity: 1, duration: 0.5, ease: 'back.out(2)' }, 0);
  ['z', 'z', 'Z'].forEach((z, i) => {
    const n = el(stage, 'sc-z', { left: `${58 + i * 6}%`, top: `${40 - i * 4}%`, opacity: '0' }, z);
    t.fromTo(n, { y: 0, opacity: 0 }, { y: '-10cqw', opacity: 1, duration: 0.6, ease: 'power1.out' }, 0.15 + i * 0.12).to(n, { opacity: 0, duration: 0.3 }, 0.6 + i * 0.12);
  });
  ring(stage, t, 0, 46, 45, 30);
  ring(stage, t, 0.15, 46, 45, 40);
  return t;
};

// MARK: - Pops and fanfares

const popOpen: Builder = (stage) => {
  const t = tl();
  const cone = el(stage, 'sc-popper');
  t.fromTo(cone, { scale: 1 }, { scale: 0.85, duration: 0.05, yoyo: true, repeat: 1 }, 0);
  const colors = ['var(--tint)', '#ffc247', '#61d999', '#ab8ffa', '#fff'];
  for (let i = 0; i < 26; i++) {
    const c = el(stage, 'sc-confetti', { background: colors[i % colors.length], left: '50%', top: '70%' });
    const a = rand(-Math.PI * 0.85, -Math.PI * 0.15);
    const d = rand(18, 40);
    t.fromTo(
      c,
      { x: 0, y: 0, rotate: 0, opacity: 1 },
      { x: `${Math.cos(a) * d}cqw`, y: `${Math.sin(a) * d}cqw`, rotate: rand(-360, 360), duration: rand(0.7, 1), ease: 'power3.out' },
      0,
    ).to(c, { y: '+=8cqw', opacity: 0, duration: 0.4, ease: 'power1.in' }, rand(0.7, 0.95));
  }
  const streak = el(stage, 'sc-streak');
  t.fromTo(streak, { scaleY: 0, opacity: 1 }, { scaleY: 1, duration: 0.4, ease: 'power2.out' }, 0.08).to(streak, { opacity: 0, duration: 0.3 }, 0.48);
  sparkles(stage, t, 0.5, 50, 22, 10);
  return t;
};

const tada: Builder = (stage) => {
  const t = tl();
  const bars = [0, 1, 2, 3].map((i) => el(stage, 'sc-bar', { left: `${26 + i * 13}%`, height: `${16 + i * 6}cqw` }));
  [0, 0.1, 0.2, 0.32].forEach((at, i) => {
    t.fromTo(bars[i], { y: 0, filter: 'brightness(1)' }, { y: '-3cqw', filter: 'brightness(1.6)', duration: 0.08, yoyo: true, repeat: 1 }, at);
    note(stage, t, at, 30 + i * 13, 48 - i * 4);
  });
  const star = el(stage, 'sc-bigstar');
  t.fromTo(star, { scale: 0, rotate: -90 }, { scale: 1, rotate: 0, duration: 0.6, ease: 'back.out(2.5)' }, 0.32).to(star, { opacity: 0, scale: 1.2, duration: 0.4 }, 1);
  sparkles(stage, t, 0.36, 50, 30, 14, 30);
  return t;
};

const lidPop: Builder = (stage) => {
  const t = tl();
  const lap = el(stage, 'sc-lap');
  const lid = el(lap, 'sc-lid');
  el(lap, 'sc-base');
  t.fromTo(lid, { rotate: -60 }, { rotate: 0, duration: 0.15, ease: 'power2.in' }, 0)
    .to(lid, { rotate: -6, duration: 0.06, yoyo: true, repeat: 3, ease: 'sine.inOut' }, 0.19);
  const pop = el(stage, 'sc-pop');
  t.fromTo(pop, { scale: 0, opacity: 1 }, { scale: 1.4, opacity: 0, duration: 0.4, ease: 'power2.out' }, 0.15);
  thump(stage, t, 0.15);
  sparkles(stage, t, 0.16, 50, 62, 10, 20);
  return t;
};

// MARK: - Bouncy things

const boingUp: Builder = (stage) => {
  const t = tl();
  const spring = el(stage, 'sc-spring');
  const ball = el(stage, 'sc-ball');
  t.to(spring, { scaleY: 0.45, duration: 0.1, ease: 'power2.in' }, 0)
    .to(spring, { scaleY: 1, duration: 0.6, ease: 'elastic.out(1.3, 0.25)' }, 0.1)
    .fromTo(ball, { y: 0 }, { y: '-24cqw', duration: 0.45, ease: 'power2.out' }, 0.1)
    .to(ball, { y: '-18cqw', duration: 0.5, ease: 'sine.inOut' }, 0.55)
    .to(ball, { scaleX: 1.15, scaleY: 0.85, duration: 0.07, yoyo: true, repeat: 7, ease: 'sine.inOut' }, 0.1);
  return t;
};

function duck(squeaks: number[], wave: boolean): Builder {
  return (stage) => {
    const t = tl();
    const d = el(stage, 'sc-duck');
    el(d, 'sc-duck-body');
    const head = el(d, 'sc-duck-head');
    el(head, 'sc-duck-eye');
    el(head, 'sc-duck-beak');
    const wing = el(d, 'sc-duck-wing');
    squeaks.forEach((at, i) => {
      t.to(d, { scaleY: 0.82, scaleX: 1.12, duration: 0.06, ease: 'power2.out' }, at).to(d, { scaleY: 1, scaleX: 1, duration: 0.4, ease: 'elastic.out(1.4, 0.3)' }, at + 0.06);
      const bubble = el(stage, 'sc-bubble-text', { left: `${62 + i * 6}%`, top: `${26 - i * 6}%`, opacity: '0' }, i ? 'squeak!' : 'squeak');
      t.fromTo(bubble, { scale: 0, opacity: 1 }, { scale: 1, duration: 0.3, ease: 'back.out(3)' }, at).to(bubble, { opacity: 0, duration: 0.25 }, at + 0.45);
    });
    if (wave) t.to(wing, { rotate: -40, duration: 0.12, yoyo: true, repeat: 5, ease: 'sine.inOut' }, 0.45);
    return t;
  };
}

// MARK: - Water

function bubbles(times: number[], big?: number): Builder {
  return (stage) => {
    const t = tl();
    times.forEach((at, i) => {
      const size = rand(4, 8);
      const b = el(stage, 'sc-bub', { left: `${30 + ((i * 37) % 40)}%`, top: '82%', width: `${size}cqw`, height: `${size}cqw` });
      t.fromTo(b, { y: 0, scale: 0.4, opacity: 1 }, { y: `-${rand(28, 46)}cqw`, scale: 1, duration: 0.6, ease: 'power1.out' }, at).to(b, { scale: 1.5, opacity: 0, duration: 0.12 }, at + 0.55);
    });
    if (big !== undefined) {
      const b = el(stage, 'sc-bub is-big', { left: '50%', top: '72%' });
      t.fromTo(b, { y: 0, scale: 0.3, opacity: 1 }, { y: '-26cqw', scale: 1, duration: 0.5, ease: 'power2.out' }, big - 0.3).to(b, { scale: 1.6, opacity: 0, duration: 0.15 }, big + 0.2);
      sparkles(stage, t, big + 0.2, 50, 46, 8, 18);
    }
    return t;
  };
}

const forestStream: Builder = (stage) => {
  const t = tl();
  for (let i = 0; i < 3; i++) {
    const w = el(stage, 'sc-stream', { top: `${50 + i * 10}%`, opacity: String(0.9 - i * 0.25) });
    t.fromTo(w, { backgroundPositionX: '0cqw' }, { backgroundPositionX: `${-40 - i * 10}cqw`, duration: 1.7, ease: 'none' }, 0);
  }
  for (let i = 0; i < 18; i++) {
    const at = rand(0, 1.4);
    const b = el(stage, 'sc-bub', { left: `${rand(15, 85)}%`, top: `${rand(48, 72)}%`, width: '3cqw', height: '3cqw' });
    t.fromTo(b, { scale: 0, opacity: 1 }, { scale: 1, y: '-4cqw', duration: 0.18, ease: 'back.out(3)' }, at).to(b, { opacity: 0, scale: 1.4, duration: 0.1 }, at + 0.2);
  }
  return t;
};

const bloopClose: Builder = (stage) => {
  const t = tl();
  const drop = el(stage, 'sc-drop');
  el(stage, 'sc-pool');
  t.fromTo(drop, { y: '-30cqw', opacity: 1 }, { y: 0, duration: 0.15, ease: 'power2.in' }, 0).set(drop, { opacity: 0 }, 0.15);
  ring(stage, t, 0.15, 50, 66, 18);
  ring(stage, t, 0.22, 50, 66, 28);
  const splash = el(stage, 'sc-drop is-small', { top: '60%' });
  t.fromTo(splash, { y: 0, opacity: 0 }, { y: '-12cqw', opacity: 1, duration: 0.12, ease: 'power2.out' }, 0.16).to(splash, { y: 0, opacity: 0, duration: 0.12, ease: 'power2.in' }, 0.28);
  ring(stage, t, 0.27, 50, 66, 12);
  return t;
};

const oceanWaves: Builder = (stage) => {
  const t = tl();
  const waves = [0, 1, 2].map((i) => el(stage, 'sc-wave', { bottom: `${i * 6}%`, opacity: String(1 - i * 0.28), zIndex: String(3 - i) }));
  waves.forEach((w, i) => {
    t.fromTo(w, { backgroundPositionX: '0cqw' }, { backgroundPositionX: `${-60 + i * 20}cqw`, duration: 2, ease: 'none' }, 0);
    t.fromTo(w, { scaleY: 0.5 }, { scaleY: 1.5 - i * 0.15, duration: 0.8, ease: 'power2.in' }, 0).to(w, { scaleY: 0.7, duration: 0.9, ease: 'power2.out' }, 0.9);
  });
  thump(stage, t, 0.86, 1.2);
  for (let i = 0; i < 16; i++) {
    const s = el(stage, 'sc-spray', { left: `${rand(25, 75)}%`, top: '50%' });
    t.fromTo(s, { x: 0, y: 0, opacity: 1, scale: rand(0.6, 1.2) }, { x: `${rand(-14, 14)}cqw`, y: `${rand(-22, -8)}cqw`, opacity: 0, duration: 0.7, ease: 'power2.out' }, 0.86);
  }
  return t;
};

// MARK: - Weather

const rainThunder: Builder = (stage) => {
  const t = tl();
  const cloud = el(stage, 'sc-cloud');
  for (let i = 0; i < 34; i++) {
    const at = 1.9 * Math.pow(Math.random(), 0.7);
    const d = el(stage, 'sc-rain', { left: `${rand(24, 76)}%` });
    t.fromTo(d, { y: 0, opacity: 1 }, { y: '42cqw', opacity: 0.2, duration: 0.45, ease: 'power1.in' }, at);
  }
  const bolt = el(stage, 'sc-bolt');
  const flash = el(stage, 'sc-flash');
  t.fromTo(flash, { opacity: 0.85 }, { opacity: 0, duration: 0.4, ease: 'power2.out' }, 0.72)
    .fromTo(bolt, { opacity: 1, scaleY: 0 }, { scaleY: 1, duration: 0.06 }, 0.72)
    .to(bolt, { opacity: 0, duration: 0.3 }, 0.95)
    .to(cloud, { x: '0.8cqw', duration: 0.05, yoyo: true, repeat: 9, ease: 'sine.inOut' }, 0.72);
  thump(stage, t, 0.74, 1.4);
  return t;
};

const birds = (tweets: [number, number][], forest: boolean): Builder => (stage) => {
  const t = tl();
  if (forest) {
    const sun = el(stage, 'sc-sun');
    t.fromTo(sun, { y: '16cqw' }, { y: 0, duration: 1.9, ease: 'power1.out' }, 0);
    [18, 38, 64, 82].forEach((x, i) => el(stage, 'sc-pine', { left: `${x}%`, transform: `translateX(-50%) scale(${1 - (i % 2) * 0.25})` }));
    [0, 0.3, 0.6].forEach((at, i) => note(stage, t, at, 40 + i * 10, 40));
  } else {
    el(stage, 'sc-wire');
  }
  const flock = [30, 50, 70].map((x) => {
    const b = el(stage, 'sc-bird', { left: `${x}%`, top: forest ? '30%' : '46%' });
    el(b, 'sc-bird-eye');
    el(b, 'sc-bird-beak');
    return b;
  });
  tweets.forEach(([at, who]) => {
    const b = flock[who];
    t.to(b, { y: '-3cqw', duration: 0.07, yoyo: true, repeat: 1, ease: 'power2.out' }, at);
    const mark = el(stage, 'sc-chirp', { left: `${30 + who * 20 + 5}%`, top: forest ? '22%' : '38%', opacity: '0' });
    t.fromTo(mark, { scale: 0.4, opacity: 1 }, { scale: 1.2, opacity: 0, duration: 0.35, ease: 'power2.out' }, at);
  });
  return t;
};

// MARK: - Vehicles

const supercar: Builder = (stage) => {
  const t = tl();
  el(stage, 'sc-road');
  const car = el(stage, 'sc-car', { left: '10%' });
  el(car, 'sc-cabin');
  const wheels = [el(car, 'sc-wheel is-back'), el(car, 'sc-wheel is-front')];
  const lines = [0, 1, 2].map((i) => el(stage, 'sc-speed', { top: `${54 + i * 5}%` }));
  t.to(car, { y: '0.3cqw', duration: 0.05, yoyo: true, repeat: 7 }, 0)
    .to(car, { y: '0.6cqw', duration: 0.03, yoyo: true, repeat: 11 }, 0.35)
    .to(wheels, { rotate: 1080, duration: 1.2, ease: 'power2.in' }, 0.35)
    .fromTo(lines, { scaleX: 0, opacity: 1 }, { scaleX: 1, duration: 0.5, stagger: 0.06, ease: 'power2.out' }, 0.5)
    .to(car, { x: '40cqw', duration: 0.38, ease: 'power3.in' }, 0.9)
    .to(car, { x: '46cqw', rotate: -2, duration: 0.25, ease: 'back.out(3)' }, 1.28)
    .to(car, { rotate: 0, duration: 0.3, ease: 'elastic.out(1.2, 0.4)' }, 1.5)
    .to(lines, { x: '40cqw', opacity: 0, duration: 0.4, ease: 'power3.in' }, 0.9);
  [1.3, 1.45].forEach((at, i) => {
    const beep = el(stage, 'sc-beep', { top: `${26 + i * 9}%`, right: `${10 + i * 8}%`, opacity: '0' }, 'beep!');
    t.fromTo(beep, { scale: 0, opacity: 1 }, { scale: 1, duration: 0.2, ease: 'back.out(3)' }, at).to(beep, { opacity: 0, duration: 0.25 }, at + 0.3);
  });
  return t;
};

const fighterJet: Builder = (stage) => {
  const t = tl();
  const jet = el(stage, 'sc-jet');
  const tail = el(jet, 'sc-jet-tail');
  el(jet, 'sc-jet-body');
  t.fromTo(jet, { x: '-60cqw', y: '16cqw', scale: 0.5 }, { x: '0cqw', y: '0cqw', scale: 1.3, duration: 0.6, ease: 'power1.in' }, 0.2)
    .to(jet, { x: '60cqw', y: '-16cqw', scale: 0.6, duration: 0.6, ease: 'power1.out' }, 0.8)
    .fromTo(tail, { scaleX: 0.2, opacity: 0.9 }, { scaleX: 1, duration: 0.6, ease: 'power1.in' }, 0.2)
    .to(tail, { opacity: 0, duration: 0.5 }, 1.1);
  thump(stage, t, 0.8, 0.6);
  sparkles(stage, t, 1.45, 85, 25, 6, 10);
  return t;
};

// MARK: - Zips

function zip(direction: 'open' | 'shut', duration: number, ding: number): Builder {
  return (stage) => {
    const t = tl();
    const track = el(stage, 'sc-zip');
    const gap = el(track, 'sc-zip-gap');
    const slider = el(track, 'sc-zip-slider');
    const [from, to] = direction === 'open' ? [0, 100] : [100, 0];
    t.fromTo(slider, { left: `${from}%` }, { left: `${to}%`, duration, ease: 'power1.in' }, 0).fromTo(
      gap,
      { clipPath: `inset(0 ${100 - from}% 0 0)` },
      { clipPath: `inset(0 ${100 - to}% 0 0)`, duration, ease: 'power1.in' },
      0,
    );
    ring(stage, t, ding, direction === 'open' ? 80 : 20, 50, 18);
    sparkles(stage, t, ding, direction === 'open' ? 80 : 20, 50, direction === 'open' ? 10 : 5, 16);
    return t;
  };
}

export const scenes: Record<SoundId, Builder> = {
  rollingShutter: shop('rolling', 1.2),
  quickShutter: shop('quick', 0.6),
  homeShutter: shop('home', 1.08),
  shopBell: bell([0, 0.16, 0.34]),
  popOpen,
  tada,
  boingUp,
  bubbleUp: bubbles([0, 0.09, 0.17, 0.24, 0.3, 0.36, 0.42, 0.5], 0.62),
  zipOpen: zip('open', 0.35, 0.4),
  squeakyHello: duck([0, 0.22], true),
  supercar,
  fighterJet,
  morningBirds: birds([[0, 0], [0.14, 0], [0.4, 1], [0.46, 1], [0.52, 1], [0.9, 2], [0.97, 2], [1.25, 0], [1.36, 0]], false),
  forestMorning: birds([[0.5, 1], [0.62, 1], [1.1, 2], [1.2, 2]], true),
  forestStream,
  oceanWaves,
  rainThunder,
  lidPop,
  bloopClose,
  zipShut: zip('shut', 0.14, 0.15),
  squeakClose: duck([0.15, 0.31], false),
  goodnight,
};
