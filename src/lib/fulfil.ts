// What happens after a payment, on our side: the one Polar product's license key allows 1 Mac, so for a Mac pack
// we raise that key's activation limit to the number of Macs that was bought.
//
// Both /api/license-key (when the buyer lands on the thank-you page) and the order.paid webhook call this, so the
// limit is right even if the buyer closes the page. It is safe to run any number of times.

import { polarFetch } from './polar';

export interface CheckoutInfo {
  status?: string;
  customerId?: string;
  createdAt?: string;
  macs: number;
  plan?: string;
}

/** Reads a checkout from Polar, including the macs/plan our checkout stored in it. Null if Polar can't find it. */
export async function readCheckout(id: string): Promise<CheckoutInfo | null | 'error'> {
  const res = await polarFetch(`/v1/checkouts/${id}`);
  if (res.status === 404) return null;
  if (!res.ok) return 'error';
  const c = (await res.json()) as { status?: string; customer_id?: string | null; created_at?: string; metadata?: Record<string, unknown> };
  const macs = Number(c.metadata?.macs);
  return {
    status: c.status,
    customerId: c.customer_id ?? undefined,
    createdAt: c.created_at,
    macs: Number.isInteger(macs) && macs >= 1 && macs <= 10 ? macs : 1,
    plan: typeof c.metadata?.plan === 'string' ? c.metadata.plan : undefined,
  };
}

export interface BuyerKeys {
  keys: string[];
  portalUrl?: string;
}

/**
 * The keys this purchase made, with the right number of Macs. `keys` is empty while Polar is still making them.
 * Throws if Polar refuses a call, so a webhook can ask to be retried.
 */
export async function keysForPurchase(customerId: string, checkoutCreatedAt: string | undefined, macs: number): Promise<BuyerKeys> {
  const sessionRes = await polarFetch('/v1/customer-sessions/', { method: 'POST', body: JSON.stringify({ customer_id: customerId }) });
  if (!sessionRes.ok) throw new Error(`Polar customer session ${sessionRes.status}`);
  const session = (await sessionRes.json()) as { token?: string; customer_portal_url?: string };
  if (!session.token) throw new Error('Polar gave no customer session token');

  const listRes = await polarFetch('/v1/customer-portal/license-keys/?limit=100', {}, session.token);
  if (!listRes.ok) throw new Error(`Polar license key list ${listRes.status}`);
  const { items = [] } = (await listRes.json()) as {
    items?: { id?: string; key?: string; status?: string; created_at?: string; limit_activations?: number | null }[];
  };

  // Only the keys made by this purchase (a returning buyer may have older ones).
  // Without a purchase time, fall back to "the last half hour" so an older key is never touched.
  const bought = checkoutCreatedAt ? Date.parse(checkoutCreatedAt) : NaN;
  const since = Number.isFinite(bought) ? bought - 2 * 60 * 1000 : Date.now() - 30 * 60 * 1000;
  const mine = items.filter((k) => k.id && k.key && k.status === 'granted' && (!k.created_at || Date.parse(k.created_at) >= since));

  for (const key of mine) {
    if (key.limit_activations === macs) continue;
    const res = await polarFetch(`/v1/license-keys/${key.id}`, { method: 'PATCH', body: JSON.stringify({ limit_activations: macs }) });
    if (!res.ok) throw new Error(`Polar license key update ${res.status}`);
  }
  return { keys: mine.map((k) => k.key as string), portalUrl: session.customer_portal_url };
}
