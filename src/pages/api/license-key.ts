// Gives the thank-you page the license key(s) for the checkout the buyer just finished.
//
//   /api/license-key?checkout=<id from the address Polar sent them to>
//
// Polar makes the key a moment after the payment, so the page asks a few times. This runs on our server
// because it needs our Polar token; the buyer's browser never sees it. The checkout id is a long random
// value only the buyer was sent, and the answer is never cached.

import type { APIRoute } from 'astro';
import { polarFetch, polarToken } from '../../lib/polar';

export const prerender = false;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const reply = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });

export const GET: APIRoute = async ({ url }) => {
  const id = url.searchParams.get('checkout') ?? '';
  if (!UUID.test(id)) return reply({ status: 'invalid' }, 400);
  if (!polarToken) return reply({ status: 'unavailable' });

  try {
    const checkoutRes = await polarFetch(`/v1/checkouts/${id}`);
    if (checkoutRes.status === 404) return reply({ status: 'invalid' }, 404);
    if (!checkoutRes.ok) return reply({ status: 'unavailable' });
    const checkout = (await checkoutRes.json()) as { status?: string; customer_id?: string | null; created_at?: string };

    if (checkout.status === 'failed' || checkout.status === 'expired') return reply({ status: 'unpaid' });
    if (checkout.status !== 'succeeded' || !checkout.customer_id) return reply({ status: 'pending' });

    // A short-lived portal session for this customer lets us read their keys.
    const sessionRes = await polarFetch('/v1/customer-sessions/', {
      method: 'POST',
      body: JSON.stringify({ customer_id: checkout.customer_id }),
    });
    if (!sessionRes.ok) return reply({ status: 'unavailable' });
    const session = (await sessionRes.json()) as { token?: string; customer_portal_url?: string };
    if (!session.token) return reply({ status: 'unavailable' });

    const keysRes = await polarFetch('/v1/customer-portal/license-keys/?limit=100', {}, session.token);
    if (!keysRes.ok) return reply({ status: 'unavailable', portalUrl: session.customer_portal_url });
    const { items = [] } = (await keysRes.json()) as { items?: { key?: string; status?: string; created_at?: string }[] };

    // Only the keys made by this purchase (a returning buyer may have older ones).
    const since = checkout.created_at ? Date.parse(checkout.created_at) - 2 * 60 * 1000 : 0;
    const keys = items
      .filter((k) => k.key && k.status === 'granted' && (!k.created_at || Date.parse(k.created_at) >= since))
      .map((k) => k.key as string);

    return reply(keys.length ? { status: 'ready', keys, portalUrl: session.customer_portal_url } : { status: 'pending', portalUrl: session.customer_portal_url });
  } catch (error) {
    console.error('Could not look up license key', error);
    return reply({ status: 'unavailable' });
  }
};
