import { getNumber } from './redis';

export const SOLD_KEY = 'lidshutter:launch-sold';

/** Launch licenses sold so far (null when there's no database). SOLD_OFFSET adds any sold another way. */
export async function soldCount(): Promise<number | null> {
  const stored = await getNumber(SOLD_KEY);
  if (stored === null) return null;
  return stored + (Number(process.env.SOLD_OFFSET) || 0);
}
