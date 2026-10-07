// Polar tells us about each paid order here. We use it to count launch licenses sold, which moves the
// launch price up (1.99 → 2.99 → 3.99 → 4.99).
//
// Polar signs every webhook, and we check that signature, so only Polar can move the count. Each order is
// counted once, even if Polar delivers the webhook more than once.

import type { APIRoute } from 'astro';
import { addToNumber, firstTime } from '../../lib/redis';
import { SOLD_KEY } from '../../lib/sold';
import { launchProductIds } from '../../lib/polar';
import { launchUnits, verify } from '../../lib/webhook';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const secret = process.env.POLAR_WEBHOOK_SECRET;
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
    const units = launchUnits(event.data, launchProductIds);
    if (units > 0) {
      try {
        // A repeated delivery of the same order must not count twice.
        const orderId = event.data?.id ?? request.headers.get('webhook-id');
        if (await firstTime(`lidshutter:order:${orderId}`, 30 * 24 * 3600)) {
          await addToNumber(SOLD_KEY, units);
        }
      } catch (error) {
        console.error('Could not record sale', error);
        return new Response('Try again', { status: 500 }); // Polar retries failed webhooks
      }
    }
  }
  return new Response('ok', { status: 202 });
};
