import { getNumber } from './redis';

export const SOLD_KEY = 'lidshutter:launch-sold';

/** Test purchases made before launch that the counter recorded. They are taken off so the real count starts at 0. */
const TEST_SALES_COUNTED = 1;

/** Launch licenses sold so far (null when there's no database). SOLD_OFFSET adds any sold another way. */
export async function soldCount(): Promise<number | null> {
  const stored = await getNumber(SOLD_KEY);
  if (stored === null) return null;
  return Math.max(0, stored - TEST_SALES_COUNTED + (Number(process.env.SOLD_OFFSET) || 0));
}
