// Polar tells us about each paid order here. Two jobs:
//   1. Count launch licenses sold, which moves the launch price up (1.99 → 2.99 → 3.99 → 4.99).
//   2. For a Mac pack, raise the license key's activation limit to the number of Macs bought (lib/fulfil.ts).
//
// Polar signs every webhook, and we check that signature, so only Polar can move the count. Each order is
// counted once, even if Polar delivers the webhook more than once. If anything fails we answer with an error and
// Polar sends the webhook again later.

import type { APIRoute } from 'astro';
import { keysForPurchase, readCheckout } from '../../lib/fulfil';
import { addToNumber, firstTime } from '../../lib/redis';
import { SOLD_KEY } from '../../lib/sold';
import { launchUnits, verify } from '../../lib/webhook';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const secret = process.env.POLAR_WEBHOOK_SECRET?.trim().replace(/^["']+|["']+$/g, '');
  if (!secret) return new Response('Webhook secret not set', { status: 503 });

  const raw = await request.text();
  if (!verify(secret, request.headers, raw)) return new Response('Invalid signature', { status: 401 });

  let event: any;
  try {
    event = JSON.parse(raw);
  } catch {
    return new Response('Bad request', { status: 400 });
  }

  if (event?.type === 'order.paid') {
    try {
      const order = event.data ?? {};
      // The macs/plan we stored when the checkout was made. Read them from the order, or from the checkout if the
      // order doesn't carry them.
      let macs = Number(order.metadata?.macs);
      let plan = typeof order.metadata?.plan === 'string' ? order.metadata.plan : undefined;
      let createdAt: string | undefined;
      let customerId: string | undefined = order.customer_id ?? order.customer?.id;
      if ((!macs || !plan) && order.checkout_id) {
        const checkout = await readCheckout(order.checkout_id);
        if (checkout === 'error') throw new Error('Could not read the checkout');
        if (checkout) {
          macs = checkout.macs;
          plan = checkout.plan;
          createdAt = checkout.createdAt;
          customerId ??= checkout.customerId;
        }
      }
      macs = Number.isInteger(macs) && macs >= 1 && macs <= 10 ? macs : 1;

      const units = launchUnits({ plan });
      if (units > 0) {
        // A repeated delivery of the same order must not count twice.
        const orderId = order.id ?? request.headers.get('webhook-id');
        if (await firstTime(`lidshutter:order:${orderId}`, 30 * 24 * 3600)) await addToNumber(SOLD_KEY, units);
      }

      if (macs > 1 && customerId) {
        const { keys } = await keysForPurchase(customerId, createdAt ?? order.created_at, macs);
        // Polar may not have made the key yet: ask to be called again.
        if (keys.length === 0) return new Response('Key not ready', { status: 503 });
      }
    } catch (error) {
      console.error('Could not process order', error);
      return new Response('Try again', { status: 500 }); // Polar retries failed webhooks
    }
  }
  return new Response('ok', { status: 202 });
};
