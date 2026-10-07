// Which currency each country sees on the page, and roughly how many of it equal one US dollar.
// The rates are approximate and only for DISPLAY: Dodo Payments converts and charges at
// checkout, so the real amount can differ a little. Update the rates now and then.
//
// Optional per-country fields:
//   prices: exact local prices, keyed by the USD price, when you want a specific number. Example:
//           IN: { currency: 'INR', rate: 88, prices: { '1.99': 149, '4.99': 399 } }
//   ppp:    a purchasing-power discount (0.6 = 40% off) applied to the converted price.
//           Only use this if Dodo charges the same discounted amount for that country,
//           otherwise the page would show a lower price than the checkout charges.

export interface Region {
  currency: string;
  rate: number;
  prices?: Record<string, number>;
  ppp?: number;
}

const EUR: Region = { currency: 'EUR', rate: 0.92 };

export const regions: Record<string, Region> = {
  US: { currency: 'USD', rate: 1 },
  GB: { currency: 'GBP', rate: 0.78 },
  CA: { currency: 'CAD', rate: 1.37 },
  AU: { currency: 'AUD', rate: 1.52 },
  NZ: { currency: 'NZD', rate: 1.65 },
  IN: { currency: 'INR', rate: 88 },
  JP: { currency: 'JPY', rate: 150 },
  KR: { currency: 'KRW', rate: 1350 },
  SG: { currency: 'SGD', rate: 1.33 },
  HK: { currency: 'HKD', rate: 7.8 },
  AE: { currency: 'AED', rate: 3.67 },
  SA: { currency: 'SAR', rate: 3.75 },
  IL: { currency: 'ILS', rate: 3.7 },
  TR: { currency: 'TRY', rate: 34 },
  BR: { currency: 'BRL', rate: 5.4 },
  MX: { currency: 'MXN', rate: 18.5 },
  CH: { currency: 'CHF', rate: 0.88 },
  SE: { currency: 'SEK', rate: 10.5 },
  NO: { currency: 'NOK', rate: 10.7 },
  DK: { currency: 'DKK', rate: 6.9 },
  PL: { currency: 'PLN', rate: 3.9 },
  CZ: { currency: 'CZK', rate: 23 },
  ZA: { currency: 'ZAR', rate: 18 },
  NG: { currency: 'NGN', rate: 1500 },
  EG: { currency: 'EGP', rate: 49 },
  PK: { currency: 'PKR', rate: 280 },
  BD: { currency: 'BDT', rate: 120 },
  ID: { currency: 'IDR', rate: 16000 },
  PH: { currency: 'PHP', rate: 57 },
  TH: { currency: 'THB', rate: 35 },
  VN: { currency: 'VND', rate: 25000 },
  // Euro countries
  ...Object.fromEntries(
    ['DE', 'FR', 'ES', 'IT', 'NL', 'BE', 'AT', 'IE', 'PT', 'FI', 'GR', 'LU', 'SK', 'SI', 'EE', 'LV', 'LT', 'MT', 'CY', 'HR'].map((c) => [c, EUR]),
  ),
};
