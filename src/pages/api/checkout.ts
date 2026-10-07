// Starts a Polar checkout for the price the visitor is looking at.
//
//   /api/checkout?macs=1&expect=1.99
//
// The price is decided HERE from the real sold count, never from the browser, so nobody can
// buy at a launch price that's gone. `expect` is the price the page showed; if the launch step
// moved while they were reading, they're sent back to see the new price instead of being
// charged one they didn't see.

import type { APIRoute } from 'astro';
import { site, formatUsd } from '../../data/site';
import { planFor, polarFetch, polarToken } from '../../lib/polar';
import { soldCount } from '../../lib/sold';

export const prerender = false;

const back = (reason: string, origin: string) =>
  new Response(null, { status: 303, headers: { Location: `${origin}/?checkout=${reason}#pricing` } });

export const GET: APIRoute = async ({ url, request, clientAddress }) => {
  const origin = import.meta.env.PROD ? site.url : url.origin;
  const macs = Number(url.searchParams.get('macs') ?? 1);
  const expect = Number(url.searchParams.get('expect'));
  if (!Number.isInteger(macs) || macs < 1 || macs > 10) return back('invalid', origin);

  let sold = 0;
  try {
    sold = (await soldCount()) ?? 0;
  } catch {
    return back('unavailable', origin);
  }

  const plan = planFor(macs, sold);
  if (!plan) return back('invalid', origin);
  if (Number.isFinite(expect) && expect > 0 && formatUsd(expect) !== formatUsd(plan.usd)) return back('price-changed', origin);
  if (!polarToken || !plan.productId) return back('unavailable', origin);

  // Polar picks the buyer's local currency from the IP address that creates the checkout, so pass theirs on
  // (otherwise it would see this server's address).
  let ip: string | undefined;
  try {
    ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || clientAddress;
  } catch {
    ip = undefined;
  }

  try {
    const res = await polarFetch('/v1/checkouts/', {
      method: 'POST',
      body: JSON.stringify({
        products: [plan.productId],
        // Polar fills in {CHECKOUT_ID}; /thanks uses it to look up and show the license key.
        success_url: `${origin}/thanks?checkout_id={CHECKOUT_ID}`,
        return_url: `${origin}/#pricing`,
        ...(ip ? { customer_ip_address: ip } : {}),
        metadata: { macs: String(plan.macs), plan: plan.kind, price_usd: plan.usd.toFixed(2) },
      }),
    });
    const body = (await res.json().catch(() => ({}))) as { url?: string | null };
    if (!res.ok || !body.url) {
      console.error('Polar checkout failed', res.status, JSON.stringify(body).slice(0, 300));
      return back('unavailable', origin);
    }
    return new Response(null, { status: 303, headers: { Location: body.url, 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('Polar checkout error', error);
    return back('unavailable', origin);
  }
};
