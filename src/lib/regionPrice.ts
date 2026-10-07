// Turns a US dollar price into what a visitor from a given country should see.

import { regions } from '../data/regions';

export interface LocalPrice {
  text: string; // "₹439" or "$1.99"
  value: number;
  digits: number;
  currency: string;
  /** true when the amount is converted, so it's shown as approximate */
  approximate: boolean;
}

/** Rounds up to a friendly local price: 1.83 → 1.99, 175 → 179, 438.9 → 439, 31,840 → 32,000. */
function nice(amount: number, digits: number): number {
  if (digits > 0 && amount < 20) return Math.ceil(amount) - 0.01;
  if (amount < 1000) return Math.ceil(amount / 10) * 10 - 1;
  const step = 10 ** (Math.floor(Math.log10(amount)) - 1);
  return Math.ceil(amount / step) * step;
}

/** Formats an amount in a currency, for the final price and for the count-up on the price tag. */
export function formatMoney(value: number, digits: number, currency: string, locale = 'en-US'): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    currencyDisplay: 'narrowSymbol',
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
}

export function localPrice(usd: number, country: string | null | undefined, locale?: string): LocalPrice {
  const region = (country && regions[country.toUpperCase()]) || regions.US;
  const approximate = region.currency !== 'USD';
  const format = (value: number, digits: number) => formatMoney(value, digits, region.currency, locale);

  if (!approximate) return { text: format(usd, 2), value: usd, digits: 2, currency: 'USD', approximate };

  const digits = new Intl.NumberFormat(locale ?? 'en-US', { style: 'currency', currency: region.currency }).resolvedOptions().maximumFractionDigits ?? 2;
  const exact = region.prices?.[usd.toFixed(2)];
  const value = exact ?? nice(usd * region.rate * (region.ppp ?? 1), digits);
  // Whole numbers read better when the amount has no cents.
  const shown = Number.isInteger(value) ? 0 : digits;
  return { text: format(value, shown), value, digits: shown, currency: region.currency, approximate: exact === undefined };
}
