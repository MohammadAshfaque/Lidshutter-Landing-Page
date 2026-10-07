// Polar settings and the product each purchase maps to.
// Everything comes from environment variables; see POLAR-SETUP.md.

import { pricing, tierFor } from '../data/site';

const live = process.env.POLAR_ENV === 'live';

/** Polar's sandbox until you set POLAR_ENV=live. */
// (POLAR_API_BASE only exists so the checks can run against a stand-in server.)
export const polarBase = process.env.POLAR_API_BASE ?? (live ? 'https://api.polar.sh' : 'https://sandbox-api.polar.sh');
/** An Organization Access Token (Polar → Settings → Developers). */
export const polarToken = process.env.POLAR_ACCESS_TOKEN;

/** One product per number of Macs: POLAR_PRODUCT_MACS_1 … _10. The launch prices ($1.99 … $4.99) all use the 1-Mac product. */
const macProducts = (n: number) => process.env[`POLAR_PRODUCT_MACS_${n}`];

/** Orders of these products count toward the launch slots (before the launch ends, every 1-Mac sale is a launch sale). */
export const launchProductIds = [macProducts(1)].filter((id): id is string => Boolean(id));

export interface Plan {
  macs: number;
  usd: number;
  productId: string | undefined;
  kind: 'launch' | 'regular';
}

/** What a purchase of `macs` Macs costs right now, given how many launch slots are sold. */
export function planFor(macs: number, sold: number): Plan | null {
  const tier = tierFor(sold);
  if (macs === 1) {
    return tier.launchOver
      ? { macs, usd: pricing.tiers[pricing.tiers.length - 1], productId: macProducts(1), kind: 'regular' }
      : { macs, usd: tier.usd, productId: macProducts(1), kind: 'launch' };
  }
  const pack = pricing.packs.find((p) => p.macs === macs);
  if (!pack) return null;
  if (!tier.launchOver && !pricing.showPacksDuringLaunch) return null;
  return { macs, usd: pack.usd, productId: macProducts(macs), kind: 'regular' };
}

/** Calls Polar's API with the organization token. */
export function polarFetch(path: string, init: RequestInit = {}, token = polarToken): Promise<Response> {
  return fetch(`${polarBase}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...(init.headers ?? {}) },
  });
}
