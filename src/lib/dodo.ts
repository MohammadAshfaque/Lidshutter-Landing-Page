// Dodo Payments settings and the product each purchase maps to.
// Everything comes from environment variables; see DODO-SETUP.md.

import { pricing, tierFor } from '../data/site';

const live = process.env.DODO_ENV === 'live';

/** `test` until you set DODO_ENV=live. */
export const dodoBase = live ? 'https://live.dodopayments.com' : 'https://test.dodopayments.com';
export const dodoKey = process.env.DODO_API_KEY;

/** Launch products: one per price step, 1 Mac each. DODO_PRODUCT_LAUNCH_1 … _4. */
const launchProducts = pricing.tiers.map((_, i) => process.env[`DODO_PRODUCT_LAUNCH_${i + 1}`]);

/** Regular products by number of Macs: DODO_PRODUCT_MACS_1 … _10. */
const macProducts = (n: number) => process.env[`DODO_PRODUCT_MACS_${n}`];

export const launchProductIds = launchProducts.filter((id): id is string => Boolean(id));

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
      : { macs, usd: tier.usd, productId: launchProducts[tier.index], kind: 'launch' };
  }
  const pack = pricing.packs.find((p) => p.macs === macs);
  if (!pack) return null;
  if (!tier.launchOver && !pricing.showPacksDuringLaunch) return null;
  return { macs, usd: pack.usd, productId: macProducts(macs), kind: 'regular' };
}
