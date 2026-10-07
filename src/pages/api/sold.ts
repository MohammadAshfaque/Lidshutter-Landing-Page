// How many launch licenses have sold, so the page shows the right price and slots left.
// The Polar webhook (polar-webhook.ts) keeps the count; SOLD_OFFSET adds any you sold another way.

import type { APIRoute } from 'astro';
import { soldCount } from '../../lib/sold';

export const prerender = false;

export const GET: APIRoute = async () => {
  let sold: number | null = null;
  try {
    sold = await soldCount();
  } catch {
    /* the page falls back to the number in site.ts */
  }
  return new Response(JSON.stringify({ sold }), {
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, s-maxage=20, stale-while-revalidate=60' },
  });
};
