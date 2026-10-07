// Gives the thank-you page the license key(s) for the checkout the buyer just finished.
//
//   /api/license-key?checkout=<id from the address Polar sent them to>
//
// Polar makes the key a moment after the payment, so the page asks a few times. For a Mac pack this also sets
// how many Macs the key covers (lib/fulfil.ts) before showing it. This runs on our server because it needs our
// Polar token; the buyer's browser never sees it. The checkout id is a long random value only the buyer was
// sent, and the answer is never cached.

import type { APIRoute } from 'astro';
import { keysForPurchase, readCheckout } from '../../lib/fulfil';
import { polarToken } from '../../lib/polar';

export const prerender = false;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const reply = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });

export const GET: APIRoute = async ({ url }) => {
  const id = url.searchParams.get('checkout') ?? '';
  if (!UUID.test(id)) return reply({ status: 'invalid' }, 400);
  if (!polarToken) return reply({ status: 'unavailable' });

  try {
    const checkout = await readCheckout(id);
    if (checkout === null) return reply({ status: 'invalid' }, 404);
    if (checkout === 'error') return reply({ status: 'unavailable' });

    if (checkout.status === 'failed' || checkout.status === 'expired') return reply({ status: 'unpaid' });
    if (checkout.status !== 'succeeded' || !checkout.customerId) return reply({ status: 'pending' });

    const { keys, portalUrl } = await keysForPurchase(checkout.customerId, checkout.createdAt, checkout.macs);
    return reply(keys.length ? { status: 'ready', keys, portalUrl } : { status: 'pending', portalUrl });
  } catch (error) {
    console.error('Could not look up license key', error);
    return reply({ status: 'unavailable' });
  }
};
