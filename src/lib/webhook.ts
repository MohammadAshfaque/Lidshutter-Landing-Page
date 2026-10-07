// Checking and reading Dodo Payments webhooks.

import { createHmac, timingSafeEqual } from 'node:crypto';

const MAX_AGE_SECONDS = 5 * 60;

/** Checks the webhook-id / webhook-timestamp / webhook-signature headers against the secret. */
export function verify(secret: string, headers: Headers, rawBody: string, nowSeconds = Date.now() / 1000): boolean {
  const id = headers.get('webhook-id');
  const timestamp = headers.get('webhook-timestamp');
  const signature = headers.get('webhook-signature');
  if (!id || !timestamp || !signature) return false;
  if (Math.abs(nowSeconds - Number(timestamp)) > MAX_AGE_SECONDS) return false;

  const key = Buffer.from(secret.startsWith('whsec_') ? secret.slice(6) : secret, 'base64');
  const expected = createHmac('sha256', key).update(`${id}.${timestamp}.${rawBody}`).digest();

  // The header can hold several signatures: "v1,abc v1,def".
  return signature.split(' ').some((part) => {
    const [version, value] = part.split(',');
    if (version !== 'v1' || !value) return false;
    const given = Buffer.from(value, 'base64');
    return given.length === expected.length && timingSafeEqual(given, expected);
  });
}

/** How many launch licenses a payment contains. */
export function launchUnits(data: any, launchProductIds: string[]): number {
  const cart: { product_id?: string; quantity?: number }[] = Array.isArray(data?.product_cart)
    ? data.product_cart
    : data?.product_id
      ? [{ product_id: data.product_id, quantity: 1 }]
      : [];
  return cart
    .filter((item) => item.product_id && launchProductIds.includes(item.product_id))
    .reduce((sum, item) => sum + (Number(item.quantity) || 1), 0);
}

