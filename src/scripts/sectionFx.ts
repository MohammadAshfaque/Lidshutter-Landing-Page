// Section headings reveal word by word, sliding up from behind a mask.

import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Wraps each word in a mask so it can slide up into view. Gradient text stays one piece. */
function splitWords(el: Element): HTMLElement[] {
  const words: HTMLElement[] = [];
  const mask = (content: Node | string) => {
    const outer = document.createElement('span');
    outer.className = 'w';
    const inner = document.createElement('span');
    inner.className = 'wi';
    inner.append(content);
    outer.append(inner);
    words.push(inner);
    return outer;
  };
  [...el.childNodes].forEach((node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      const parts = (node.textContent ?? '').split(/(\s+)/);
      const frag = document.createDocumentFragment();
      parts.forEach((p) => frag.append(/^\s+$/.test(p) || !p ? p : mask(p)));
      node.replaceWith(frag);
    } else if (node instanceof HTMLElement && node.tagName !== 'BR') {
      if (node.classList.contains('lit')) {
        const placeholder = document.createComment('');
        node.replaceWith(placeholder);
        placeholder.replaceWith(mask(node));
      } else {
        words.push(...splitWords(node));
      }
    }
  });
  return words;
}

if (!reduceMotion) {
  // Headings: words slide up one after another, once.
  document.querySelectorAll<HTMLElement>('.section-head .h2').forEach((h2) => {
    gsap.from(splitWords(h2), {
      yPercent: 110,
      duration: 0.9,
      stagger: 0.05,
      ease: 'power4.out',
      scrollTrigger: { trigger: h2, start: 'top 90%', once: true },
    });
  });
}
