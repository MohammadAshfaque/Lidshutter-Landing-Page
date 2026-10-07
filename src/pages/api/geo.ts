// Tells the page which country the visitor is in, so prices show in their own currency.
// Vercel adds the country to every request. `?country=IN` overrides it, to preview other countries.

import type { APIRoute } from 'astro';

export const prerender = false;

export const GET: APIRoute = ({ request, url }) => {
  const override = url.searchParams.get('country')?.toUpperCase();
  const country = (override && /^[A-Z]{2}$/.test(override) ? override : request.headers.get('x-vercel-ip-country')) ?? null;
  return new Response(JSON.stringify({ country }), {
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
};
