// Makes the pricing section live: asks how many launch licenses have sold (the right price and
// slots left) and fills it all in. Prices are always shown in US dollars.
// The page works without this: it starts with the dollar prices from site.ts and updates if
// the answers arrive.

import { pricing, tierFor, formatUsd, launchSlots } from '../data/site';
import { formatMoney, localPrice, type LocalPrice } from '../lib/regionPrice';

export interface PricingState {
  country: string | null;
  sold: number;
  /** What one Mac costs right now, in the visitor's currency. */
  price: LocalPrice;
  usd: number;
  launchOver: boolean;
}

const params = new URLSearchParams(location.search);
// Prices are always US dollars, written the US way.
const locale = 'en-US';

export const state: PricingState = compute(null, pricing.sold);

function compute(country: string | null, sold: number): PricingState {
  const tier = tierFor(sold);
  const usd = tier.launchOver ? pricing.tiers[pricing.tiers.length - 1] : tier.usd;
  return { country, sold, price: localPrice(usd, country, locale), usd, launchOver: tier.launchOver };
}

const $$ = <T extends HTMLElement>(sel: string) => [...document.querySelectorAll<T>(sel)];

function render() {
  const tier = tierFor(state.sold);
  const price = (usd: number) => localPrice(usd, state.country, locale);

  // Every price on the page that carries its dollar value.
  $$('[data-usd]').forEach((el) => (el.textContent = price(Number(el.dataset.usd)).text));
  $$('[data-per-mac]').forEach((el) => {
    const usd = Number(el.dataset.usd);
    const macs = Number(el.dataset.perMac);
    el.textContent = `${price(usd / macs).text} per Mac`;
  });

  // The price tag and its label.
  $$('[data-price-label]').forEach((el) => (el.textContent = tier.launchOver ? 'Per Mac' : 'Launch price'));
  $$('[data-buy-price]').forEach((el) => (el.textContent = state.price.text));

  // The price steps: current one lit, earlier ones struck through.
  $$('[data-step]').forEach((el) => {
    const i = Number(el.dataset.step);
    el.classList.toggle('now', !tier.launchOver && i === tier.index);
    el.classList.toggle('past', tier.launchOver || i < tier.index);
  });

  // Slots: lit as they sell.
  $$('.slot-row i').forEach((el, i) => el.classList.toggle('taken', i < tier.taken || tier.launchOver));
  $$('[data-slot-text]').forEach((el) => {
    if (!pricing.launch) {
      el.innerHTML = '<b>One-time payment</b> · no subscription';
    } else if (tier.launchOver) {
      el.innerHTML = `<b>Launch pricing has ended</b> · ${state.price.text} per Mac`;
    } else if (tier.nextUsd) {
      el.innerHTML = `<b>${tier.left} of ${pricing.slotsPerTier}</b> left at ${price(tier.usd).text} · then ${price(tier.nextUsd).text}`;
    } else {
      el.innerHTML = `<b>${tier.left} of ${pricing.slotsPerTier}</b> left at ${price(tier.usd).text} · then regular pricing`;
    }
  });
  $$('[data-launch-chip]').forEach((el) => (el.hidden = tier.launchOver));
  $$('[data-launch-note]').forEach((el) => {
    el.hidden = tier.launchOver;
    el.textContent = tier.nextUsd
      ? `Launch pricing: ${tier.left} of ${pricing.slotsPerTier} left at ${price(tier.usd).text}, then ${price(tier.nextUsd).text}.`
      : `Launch pricing: the last ${tier.left} of ${pricing.slotsPerTier} slots, then regular pricing.`;
  });

  // Multi-Mac packs appear once the launch slots are gone (or from day one, if site.ts says so).
  const showPacks = tier.launchOver || pricing.showPacksDuringLaunch;
  $$('[data-packs]').forEach((el) => (el.hidden = !showPacks));
  $$('[data-packs-hint]').forEach((el) => (el.hidden = showPacks));

  // Buy links carry the price the visitor sees; checkout refuses to charge a different one.
  $$<HTMLAnchorElement>('[data-buy-link]').forEach((a) => {
    const macs = Number(a.dataset.macs ?? 1);
    const usd = macs === 1 ? state.usd : pricing.packs.find((p) => p.macs === macs)?.usd ?? 0;
    a.href = `/api/checkout?macs=${macs}&expect=${usd.toFixed(2)}`;
  });

  // A note when prices are converted.
  $$('[data-region-note]').forEach((el) => {
    const converted = state.price.currency !== 'USD';
    el.hidden = !converted;
    el.textContent = converted
      ? `Prices are shown in ${state.price.currency} as an estimate. You'll see the exact amount at checkout.`
      : '';
  });

  window.dispatchEvent(new CustomEvent('pricing:update', { detail: state }));
}

/** Messages when checkout sent the visitor back here. */
function showCheckoutMessage() {
  const messages: Record<string, string> = {
    'price-changed': 'The launch price just moved up while you were looking. The new price is shown here.',
    unavailable: 'Checkout isn’t available right now. Please try again in a minute, or email support@lidshutter.com.',
    invalid: 'That option isn’t available. Please pick one from the page.',
  };
  const message = messages[params.get('checkout') ?? ''];
  if (!message) return;
  $$('[data-buy-alert]').forEach((el) => {
    el.textContent = message;
    el.hidden = false;
  });
}

/** Asks the server, trying a few times: the first answer can be slow when a server function is starting up. */
async function json<T>(url: string, tries = 3): Promise<T | null> {
  for (let attempt = 0; attempt < tries; attempt++) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
      if (res.ok) return (await res.json()) as T;
    } catch {
      /* try again */
    }
    await new Promise((resolve) => setTimeout(resolve, 800 * (attempt + 1)));
  }
  return null;
}

async function start() {
  render();
  showCheckoutMessage();
  if (!pricing.launch) return; // one price, nothing to look up
  const sold = await json<{ sold: number | null }>('/api/sold');
  Object.assign(state, compute(null, typeof sold?.sold === 'number' ? sold.sold : pricing.sold));
  render();
}

export { formatMoney, formatUsd, launchSlots };
start();
