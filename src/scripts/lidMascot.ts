// Lid's moods: a happy loop of lifting its lid (light, clacks, happy eyes), and a
// cute angry fit when clicked. Same behaviour as before, with the brand mascot.

import { gsap } from 'gsap';
import { play } from './audio';

const HINGE = '30 87';
const OPEN = -28;
const ANGRY_LINES = ['Hey! I said don’t!', 'STOP IT!', 'Hmph!!', 'I’m telling!'];

export function initLidMascot(root: HTMLElement, bubble?: HTMLElement) {
  const q = (sel: string) => root.querySelector<SVGElement>(sel)!;
  const qa = (sel: string) => [...root.querySelectorAll<SVGElement>(sel)];
  const lid = q('.lm-lid');
  const body = q('.lm-body');
  const light = [q('.lm-glow'), q('.lm-strip')];
  const clacks = q('.lm-clacks');
  const faces = { sleepy: q('.lm-eyes-sleepy'), happy: q('.lm-eyes-happy'), angry: q('.lm-eyes-angry') };
  const mouthHappy = q('.lm-mouth-happy');
  const mouthAngry = q('.lm-mouth-angry');
  const anger = q('.lm-anger');
  const steam = qa('.lm-steam circle');
  const feet = qa('.lm-foot');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let clicks = 0;

  gsap.set(lid, { rotation: 0, svgOrigin: HINGE });

  const face = (mood: keyof typeof faces) => {
    const tl = gsap.timeline();
    (Object.keys(faces) as (keyof typeof faces)[]).forEach((k) => tl.set(faces[k], { opacity: k === mood ? 1 : 0 }, 0));
    return tl.set(mouthHappy, { opacity: mood === 'angry' ? 0 : 1 }, 0).set(mouthAngry, { opacity: mood === 'angry' ? 1 : 0 }, 0);
  };

  if (reduceMotion) {
    gsap.set(lid, { rotation: OPEN });
    gsap.set(light, { opacity: 1 });
    face('happy');
  }

  // Happy loop: lift the lid with a little pop, light up, wiggle the feet, close, doze.
  const loop = gsap.timeline({ repeat: -1, paused: true });
  loop
    .add(face('sleepy'), 0)
    .to(lid, { rotation: OPEN, duration: 0.6, ease: 'back.out(2.2)' }, 0.5)
    .to(light, { opacity: 1, duration: 0.3 }, 0.62)
    .add(face('happy'), 0.65)
    .fromTo(clacks, { opacity: 0, scale: 0.4, transformOrigin: '0% 100%' }, { opacity: 1, scale: 1, duration: 0.3, ease: 'back.out(4)' }, 0.75)
    .to(clacks, { opacity: 0, duration: 0.3 }, 1.6)
    .to(body, { y: -3, duration: 0.12, yoyo: true, repeat: 3, ease: 'sine.inOut' }, 0.75)
    .to(feet, { y: -2, duration: 0.1, yoyo: true, repeat: 5, stagger: 0.05, ease: 'sine.inOut' }, 0.8)
    .to(lid, { rotation: -22, duration: 0.25, yoyo: true, repeat: 1, ease: 'sine.inOut' }, 1.3)
    .to(lid, { rotation: 0, duration: 0.45, ease: 'power2.in' }, 2.4)
    .to(light, { opacity: 0, duration: 0.2 }, 2.6)
    .add(face('sleepy'), 2.85)
    .to(body, { y: 1.5, duration: 0.07, yoyo: true, repeat: 1 }, 2.85)
    .to({}, { duration: 1.1 }, 2.95);

  let visible = false;
  let angryUntil = 0;
  new IntersectionObserver(([e]) => {
    visible = e.isIntersecting;
    if (reduceMotion) return;
    if (visible && performance.now() > angryUntil) loop.play();
    else loop.pause();
  }).observe(root);

  const calmBubble = () => {
    if (!bubble) return;
    bubble.textContent = 'Don’t click me!';
    bubble.classList.remove('is-angry');
  };

  let calm: gsap.core.Tween | null = null;
  root.addEventListener('click', () => {
    play('squeakClose');
    if (bubble) {
      bubble.textContent = ANGRY_LINES[clicks++ % ANGRY_LINES.length];
      bubble.classList.add('is-angry');
      gsap.fromTo(bubble, { scale: 0.6 }, { scale: 1, duration: 0.4, ease: 'back.out(4)' });
    }
    if (reduceMotion) {
      setTimeout(calmBubble, 1900);
      return;
    }
    loop.pause();
    calm?.kill();
    root.classList.add('is-angry');
    angryUntil = performance.now() + 2000;

    gsap
      .timeline()
      .to(lid, { rotation: 0, duration: 0.1, ease: 'power3.in' }, 0)
      .to([...light, clacks], { opacity: 0, duration: 0.1 }, 0)
      .add(face('angry'), 0.08)
      .fromTo(anger, { opacity: 0, scale: 0.3, transformOrigin: '50% 50%' }, { opacity: 1, scale: 1, duration: 0.35, ease: 'back.out(4)' }, 0.1)
      .to(anger, { scale: 1.15, duration: 0.12, yoyo: true, repeat: 5, ease: 'sine.inOut' }, 0.45)
      .fromTo(body, { x: 0 }, { x: 2.5, duration: 0.05, yoyo: true, repeat: 9, ease: 'sine.inOut' }, 0.1)
      .fromTo(steam, { opacity: 0, y: 0, scale: 0.5, transformOrigin: '50% 50%' }, { opacity: 1, y: -14, scale: 1.2, duration: 0.5, stagger: 0.15, repeat: 2 }, 0.15)
      .to(steam, { opacity: 0, duration: 0.2 }, 1.6);

    calm = gsap.delayedCall(1.9, () => {
      root.classList.remove('is-angry');
      calmBubble();
      gsap
        .timeline()
        .to(anger, { opacity: 0, scale: 0.6, duration: 0.25 })
        .add(face('sleepy'), 0.1)
        .call(() => {
          if (visible) loop.restart();
        }, [], 0.5);
    });
  });
}
