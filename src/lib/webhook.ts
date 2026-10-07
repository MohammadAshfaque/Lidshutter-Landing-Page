// Checking and reading Polar webhooks (Polar signs them in the "Standard Webhooks" format).

import { createHmac, timingSafeEqual } from 'node:crypto';

const MAX_AGE_SECONDS = 5 * 60;

/**
 * The keys a signature may have been made with. Secrets created from 8 September 2026 follow Standard Webhooks
 * (`whsec_` + base64); older Polar secrets used the plain secret text as the key. Trying both means either works.
 */
function candidateKeys(secret: string): Buffer[] {
  const keys = [Buffer.from(secret, 'utf8')];
  if (secret.startsWith('whsec_')) keys.unshift(Buffer.from(secret.slice(6), 'base64'));
  return keys;
}

/** Checks the webhook-id / webhook-timestamp / webhook-signature headers against the secret. */
export function verify(secret: string, headers: Headers, rawBody: string, nowSeconds = Date.now() / 1000): boolean {
  const id = headers.get('webhook-id');
  const timestamp = headers.get('webhook-timestamp');
  const signature = headers.get('webhook-signature');
  if (!id || !timestamp || !signature) return false;
  if (!Number.isFinite(Number(timestamp)) || Math.abs(nowSeconds - Number(timestamp)) > MAX_AGE_SECONDS) return false;

  const signed = `${id}.${timestamp}.${rawBody}`;
  const given = signature
    .split(' ')
    .map((part) => part.split(','))
    .filter(([version, value]) => version === 'v1' && value)
    .map(([, value]) => Buffer.from(value, 'base64'));

  return candidateKeys(secret).some((key) => {
    const expected = createHmac('sha256', key).update(signed).digest();
    return given.some((g) => g.length === expected.length && timingSafeEqual(g, expected));
  });
}

/** Launch licenses an order is worth: our checkout marks launch sales in the metadata it sets (buyers can't change it). */
export function launchUnits(metadata: any): number {
  return metadata?.plan === 'launch' ? 1 : 0;
}
