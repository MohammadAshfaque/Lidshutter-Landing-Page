// Polar settings and what each purchase costs.
// Everything comes from environment variables; see POLAR-SETUP.md.

import { pricing, tierFor } from '../data/site';

/** Environment values with stray spaces or quotation marks around them cleaned off. */
const clean = (value: string | undefined) => value?.trim().replace(/^["']+|["']+$/g, '').trim() || undefined;

const live = clean(process.env.POLAR_ENV)?.toLowerCase() === 'live';

/** Polar's sandbox until you set POLAR_ENV=live. */
// (POLAR_API_BASE only exists so the checks can run against a stand-in server.)
export const polarBase = process.env.POLAR_API_BASE ?? (live ? 'https://api.polar.sh' : 'https://sandbox-api.polar.sh');
/** An Organization Access Token (Polar → Settings → Developers). */
export const polarToken = clean(process.env.POLAR_ACCESS_TOKEN);

/** What the site is using, for the logs only (never the token itself). */
export const polarDiagnostics = () =>
  `host=${new URL(polarBase).host} tokenLength=${polarToken?.length ?? 0} tokenStart=${polarToken?.slice(0, 10) ?? 'none'} productSet=${Boolean(productId)}`;

/**
 * The ONE product everything is sold through (POLAR_PRODUCT_ID). Its license-key benefit allows 1 Mac; the price
 * and, for Mac packs, the number of Macs are set by this site for each sale (see api/checkout.ts and lib/fulfil.ts).
 */
export const productId = clean(process.env.POLAR_PRODUCT_ID);

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
      ? { macs, usd: pricing.tiers[pricing.tiers.length - 1], productId, kind: 'regular' }
      : { macs, usd: tier.usd, productId, kind: 'launch' };
  }
  const pack = pricing.packs.find((p) => p.macs === macs);
  if (!pack) return null;
  if (!tier.launchOver && !pricing.showPacksDuringLaunch) return null;
  return { macs, usd: pack.usd, productId, kind: 'regular' };
}

/** Calls Polar's API with the organization token. */
export function polarFetch(path: string, init: RequestInit = {}, token = polarToken): Promise<Response> {
  return fetch(`${polarBase}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...(init.headers ?? {}) },
  });
}
