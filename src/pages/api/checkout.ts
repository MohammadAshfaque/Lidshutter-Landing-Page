// Starts a Dodo Payments checkout for the price the visitor is looking at.
//
//   /api/checkout?macs=1&expect=1.99
//
// The price is decided HERE from the real sold count, never from the browser, so nobody can
// buy at a launch price that's gone. `expect` is the price the page showed; if the launch step
// moved while they were reading, they're sent back to see the new price instead of being
// charged one they didn't see.

import type { APIRoute } from 'astro';
import { site, formatUsd } from '../../data/site';
import { dodoBase, dodoKey, planFor } from '../../lib/dodo';
import { soldCount } from '../../lib/sold';

export const prerender = false;

const back = (reason: string, origin: string) =>
  new Response(null, { status: 303, headers: { Location: `${origin}/?checkout=${reason}#pricing` } });

export const GET: APIRoute = async ({ url }) => {
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
  if (!dodoKey || !plan.productId) return back('unavailable', origin);

  try {
    const res = await fetch(`${dodoBase}/checkouts`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${dodoKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        product_cart: [{ product_id: plan.productId, quantity: 1 }],
        // Dodo adds ?license_key=… to this address after payment; /thanks shows it.
        return_url: `${origin}/thanks`,
        metadata: { macs: String(plan.macs), plan: plan.kind, price_usd: plan.usd.toFixed(2) },
      }),
    });
    const body = (await res.json().catch(() => ({}))) as { checkout_url?: string | null };
    if (!res.ok || !body.checkout_url) {
      console.error('Dodo checkout failed', res.status, JSON.stringify(body).slice(0, 300));
      return back('unavailable', origin);
    }
    return new Response(null, { status: 303, headers: { Location: body.checkout_url, 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('Dodo checkout error', error);
    return back('unavailable', origin);
  }
};
