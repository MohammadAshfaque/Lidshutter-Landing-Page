// Smooth, momentum-style scrolling (Lenis), kept in step with GSAP ScrollTrigger.

import Lenis from 'lenis';
import 'lenis/dist/lenis.css';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const NAV_OFFSET = 84;

if (!reduceMotion) {
  const lenis = new Lenis({
    lerp: 0.09,
    smoothWheel: true,
    wheelMultiplier: 1,
    touchMultiplier: 1.2,
  });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((time) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);
  (window as unknown as { lenis: Lenis }).lenis = lenis;

  // In-page links (#how, /#pricing on the home page...) glide to their section with a
  // fixed-duration ease, so the trip never crawls or stalls on the way there.
  const easeInOutQuart = (t: number) => (t < 0.5 ? 8 * t ** 4 : 1 - (-2 * t + 2) ** 4 / 2);

  document.addEventListener('click', (e) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const link = (e.target as Element).closest('a[href*="#"]') as HTMLAnchorElement | null;
    if (!link) return;
    const url = new URL(link.href, location.href);
    if (url.pathname !== location.pathname || !url.hash) return;
    const target = document.getElementById(decodeURIComponent(url.hash.slice(1)));
    if (!target) return;
    e.preventDefault();

    const y = target.getBoundingClientRect().top + window.scrollY - NAV_OFFSET;
    const distance = Math.abs(y - window.scrollY);
    // Longer trips take a little longer, within a comfortable range.
    const duration = Math.min(1.6, Math.max(0.7, distance / 3200));
    lenis.scrollTo(y, { duration, easing: easeInOutQuart, lock: true, force: true });
    history.replaceState(null, '', url.hash);
  });
}
