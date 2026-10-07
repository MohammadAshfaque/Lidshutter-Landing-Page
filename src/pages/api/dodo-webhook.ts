// Dodo Payments tells us about each successful payment here. We use it to count launch
// licenses sold, which moves the launch price up (1.99 → 2.99 → 3.99 → 4.99).
//
// Dodo signs every webhook (the "Standard Webhooks" format), and we check that signature, so
// only Dodo can move the count. Each webhook is counted once, even if Dodo sends it twice.

import type { APIRoute } from 'astro';
import { addToNumber, firstTime } from '../../lib/redis';
import { SOLD_KEY } from '../../lib/sold';
import { launchProductIds } from '../../lib/dodo';
import { launchUnits, verify } from '../../lib/webhook';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const secret = process.env.DODO_WEBHOOK_SECRET;
  if (!secret) return new Response('Webhook secret not set', { status: 503 });

  const raw = await request.text();
  if (!verify(secret, request.headers, raw)) return new Response('Invalid signature', { status: 401 });

  let event: any;
  try {
    event = JSON.parse(raw);
  } catch {
    return new Response('Bad request', { status: 400 });
  }

  if (event?.type === 'payment.succeeded') {
    const units = launchUnits(event.data, launchProductIds);
    if (units > 0) {
      try {
        // A repeated delivery of the same webhook must not count twice.
        if (await firstTime(`lidshutter:webhook:${request.headers.get('webhook-id')}`, 7 * 24 * 3600)) {
          await addToNumber(SOLD_KEY, units);
        }
      } catch (error) {
        console.error('Could not record sale', error);
        return new Response('Try again', { status: 500 }); // Dodo retries failed webhooks
      }
    }
  }
  return new Response('ok');
};
