// The live "sounds played" counter, stored in Upstash Redis.
// Connect Upstash in Vercel (Storage → Upstash for Redis) and these env vars appear automatically.

import type { APIRoute } from 'astro';

export const prerender = false;

const KEY = 'lidshutter:plays';
const MAX_PER_REQUEST = 25;
const MAX_PER_MINUTE = 150;

const url = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;

// Without a database in local development, count in memory so the UI can be tried out.
let devCount = 0;
const useDevStore = !url && import.meta.env.DEV;

async function redis(commands: (string | number)[][]): Promise<unknown[]> {
  const res = await fetch(`${url}/pipeline`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(commands),
  });
  if (!res.ok) throw new Error(`Redis ${res.status}`);
  const results = (await res.json()) as { result: unknown }[];
  return results.map((r) => r.result);
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });

export const GET: APIRoute = async () => {
  if (useDevStore) return json({ count: devCount });
  if (!url || !token) return json({ count: null }, 503);
  try {
    const [count] = await redis([['GET', KEY]]);
    return json({ count: Number(count ?? 0) });
  } catch {
    return json({ count: null }, 502);
  }
};

export const POST: APIRoute = async ({ request, clientAddress }) => {
  let n = 1;
  try {
    // sendBeacon posts as text/plain, so parse the body by hand.
    n = Number(JSON.parse(await request.text()).n);
  } catch {
    return json({ error: 'Bad request' }, 400);
  }
  if (!Number.isInteger(n) || n < 1) return json({ error: 'Bad request' }, 400);
  n = Math.min(n, MAX_PER_REQUEST);

  if (useDevStore) {
    devCount += n;
    return json({ count: devCount });
  }
  if (!url || !token) return json({ count: null }, 503);

  try {
    const minute = Math.floor(Date.now() / 60_000);
    const limitKey = `lidshutter:rl:${clientAddress}:${minute}`;
    const [used] = await redis([['INCRBY', limitKey, n], ['EXPIRE', limitKey, 90]]);
    if (Number(used) > MAX_PER_MINUTE) {
      const [count] = await redis([['GET', KEY]]);
      return json({ count: Number(count ?? 0) }, 429);
    }
    const [count] = await redis([['INCRBY', KEY, n]]);
    return json({ count: Number(count) });
  } catch {
    return json({ count: null }, 502);
  }
};
