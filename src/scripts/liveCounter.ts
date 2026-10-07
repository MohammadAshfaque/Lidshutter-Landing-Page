// The live "sounds played by visitors" counter. Every sound played on this page
// counts. It only appears once the server has answered, so the number is never made up.

import { onPlay } from './audio';

const ENDPOINT = '/api/plays';
const POLL_MS = 20_000;
const FLUSH_MS = 800;
const PENDING_KEY = 'lidshutter:plays-pending';

let serverCount: number | null = null;
let pending = 0;
/** Plays being sent right now (counted on screen, but not sent twice). */
let inflight = 0;
let flushTimer: number | undefined;
let revealed = false;

/** Plays not yet saved on the server are also kept in this browser, so a refresh or closed tab can't lose them. */
function savePending() {
  try {
    if (pending > 0) localStorage.setItem(PENDING_KEY, String(pending));
    else localStorage.removeItem(PENDING_KEY);
  } catch {
    /* storage blocked: the beacon below still tries */
  }
}

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
  document.querySelectorAll<HTMLElement>('[data-live-count]').forEach((el) => setOdometer(el, serverCount! + pending + inflight));
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
  if (pending === 0 || inflight > 0) return;
  const n = pending;
  pending = 0;
  inflight = n;
  savePending();
  try {
    // keepalive lets the request finish even if the page is refreshed right now.
    const res = await fetch(ENDPOINT, { method: 'POST', body: JSON.stringify({ n }), keepalive: true });
    if (!res.ok && res.status !== 429) throw new Error(`Plays ${res.status}`);
    inflight = 0;
    accept((await res.json()).count);
  } catch {
    // Not saved: put them back and try again soon.
    inflight = 0;
    pending += n;
    savePending();
    render();
    flushTimer ??= window.setTimeout(flush, 5_000);
    return;
  }
  if (pending > 0) flushTimer ??= window.setTimeout(flush, FLUSH_MS);
}

/** Hands whatever is pending to the browser to send even while the page is closing or refreshing. */
function beaconPending() {
  if (pending === 0) return;
  if (navigator.sendBeacon?.(ENDPOINT, JSON.stringify({ n: pending }))) {
    pending = 0;
    savePending();
  }
}

onPlay(() => {
  pending += 1;
  savePending();
  render();
  floatPlusOne();
  flushTimer ??= window.setTimeout(flush, FLUSH_MS);
});

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') beaconPending();
  else void refresh();
});
// Safari doesn't always say "hidden" on a refresh, but it always says pagehide.
window.addEventListener('pagehide', beaconPending);

// Plays that were still waiting when the last page closed (or a send that failed) go out now.
try {
  const left = Number(localStorage.getItem(PENDING_KEY));
  if (Number.isInteger(left) && left > 0) {
    pending = Math.min(left, 500);
    flushTimer ??= window.setTimeout(flush, FLUSH_MS);
  }
} catch {
  /* storage blocked */
}

void refresh();
setInterval(() => document.visibilityState === 'visible' && refresh(), POLL_MS);
