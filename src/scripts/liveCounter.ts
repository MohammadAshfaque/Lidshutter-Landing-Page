// The live "sounds played by visitors" counter. Every sound played on this page
// counts. It only appears once the server has answered, so the number is never made up.

import { onPlay } from './audio';

const ENDPOINT = '/api/plays';
const POLL_MS = 20_000;
const FLUSH_MS = 3_000;

let serverCount: number | null = null;
let pending = 0;
let flushTimer: number | undefined;
let revealed = false;

const format = (n: number) => n.toLocaleString('en-US');

/** Rolls each digit of `el` to show `value`, like an odometer. */
function setOdometer(el: HTMLElement, value: number) {
  const text = format(value);
  el.setAttribute('aria-label', text);
  if (el.dataset.len !== String(text.length)) {
    el.dataset.len = String(text.length);
    el.replaceChildren(
      ...[...text].map((ch) => {
        const cell = document.createElement('span');
        cell.setAttribute('aria-hidden', 'true');
        if (!/\d/.test(ch)) {
          cell.textContent = ch;
          return cell;
        }
        cell.className = 'd';
        const col = document.createElement('span');
        col.className = 'col';
        for (let i = 0; i <= 9; i++) {
          const n = document.createElement('span');
          n.textContent = String(i);
          col.appendChild(n);
        }
        cell.appendChild(col);
        return cell;
      }),
    );
  }
  [...text].forEach((ch, i) => {
    const col = el.children[i]?.querySelector<HTMLElement>('.col');
    if (!col) return;
    // Digits further right roll a touch later, so changes ripple across.
    col.style.setProperty('--dd', `${(text.length - i) * 0.03}s`);
    col.style.transform = `translateY(${-Number(ch)}em)`;
  });
}

function reveal() {
  if (revealed) return;
  revealed = true;
  document.querySelectorAll<HTMLElement>('[data-intro-pill]').forEach((pill) => {
    pill.classList.add('is-leaving');
    pill.addEventListener('animationend', () => (pill.hidden = true), { once: true });
  });
  document.querySelectorAll<HTMLElement>('[data-live]').forEach((el) => (el.hidden = false));
}

function render() {
  if (serverCount === null) return;
  reveal();
  document.querySelectorAll<HTMLElement>('[data-live-count]').forEach((el) => setOdometer(el, serverCount! + pending));
}

function floatPlusOne() {
  document.querySelectorAll<HTMLElement>('[data-live]:not([hidden])').forEach((pill) => {
    const count = pill.querySelector<HTMLElement>('[data-live-count]');
    if (!count) return;
    const plus = document.createElement('span');
    plus.className = 'plus-one';
    plus.textContent = '+1';
    const p = pill.getBoundingClientRect();
    const c = count.getBoundingClientRect();
    plus.style.setProperty('--x', `${c.left - p.left + c.width / 2}px`);
    plus.addEventListener('animationend', () => plus.remove());
    pill.appendChild(plus);
  });
}

function accept(count: unknown) {
  if (typeof count === 'number' && Number.isFinite(count)) {
    serverCount = count;
    render();
  }
}

async function refresh() {
  try {
    const res = await fetch(ENDPOINT, { cache: 'no-store' });
    accept((await res.json()).count);
  } catch {
    /* offline or no database: the intro pill stays */
  }
}

async function flush() {
  flushTimer = undefined;
  if (pending === 0) return;
  const n = pending;
  try {
    const res = await fetch(ENDPOINT, { method: 'POST', body: JSON.stringify({ n }), keepalive: true });
    pending -= n;
    accept((await res.json()).count);
  } catch {
    /* keep the plays pending and try again with the next one */
  }
}

onPlay(() => {
  pending += 1;
  render();
  floatPlusOne();
  flushTimer ??= window.setTimeout(flush, FLUSH_MS);
});

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden' && pending > 0) {
    navigator.sendBeacon?.(ENDPOINT, JSON.stringify({ n: pending }));
    pending = 0;
  } else if (document.visibilityState === 'visible') {
    void refresh();
  }
});

void refresh();
setInterval(() => document.visibilityState === 'visible' && refresh(), POLL_MS);
