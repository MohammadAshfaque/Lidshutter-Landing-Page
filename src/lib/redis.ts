// Tiny Upstash Redis helpers (the same free database the live "sounds played" counter uses).
// Without a database in local development, counts are kept in memory so the page can be tried out.

const url = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;

export const hasDatabase = Boolean(url && token);
const devStore = !hasDatabase && import.meta.env.DEV;
const memory = new Map<string, number>();

async function pipeline(commands: (string | number)[][]): Promise<unknown[]> {
  const res = await fetch(`${url}/pipeline`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(commands),
  });
  if (!res.ok) throw new Error(`Redis ${res.status}`);
  return ((await res.json()) as { result: unknown }[]).map((r) => r.result);
}

/** The number stored at `key`, or null when there's no database to ask. */
export async function getNumber(key: string): Promise<number | null> {
  if (devStore) return memory.get(key) ?? 0;
  if (!hasDatabase) return null;
  const [value] = await pipeline([['GET', key]]);
  return Number(value ?? 0);
}

export async function addToNumber(key: string, amount: number): Promise<void> {
  if (devStore) {
    memory.set(key, (memory.get(key) ?? 0) + amount);
    return;
  }
  if (!hasDatabase) throw new Error('No database connected');
  await pipeline([['INCRBY', key, amount]]);
}

/** True the first time `key` is seen (and remembers it for `seconds`); false for repeats. */
export async function firstTime(key: string, seconds: number): Promise<boolean> {
  if (devStore) {
    if (memory.has(key)) return false;
    memory.set(key, 1);
    return true;
  }
  if (!hasDatabase) throw new Error('No database connected');
  const [result] = await pipeline([['SET', key, 1, 'NX', 'EX', seconds]]);
  return result === 'OK';
}
