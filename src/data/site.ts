// Everything you might want to change before launch lives here.

// ---------------------------------------------------------------------------
// Pricing. All prices are in US dollars, on the page and at checkout. Polar does the charging.
// ---------------------------------------------------------------------------

export const pricing = {
  // false: one Mac costs the last price below ($4.99) from day one, and the Mac packs show right away.
  // true: launch pricing. Each price below has a few slots; when they're all taken the next price applies.
  launch: false,

  // LAUNCH PRICING (one Mac), used only when `launch` is true: each price has a few slots. When they're all taken, the next
  // price applies, up to the last one. The count of sold slots comes from /api/sold (the
  // Polar webhook keeps it); `sold` below is only the fallback until that answers.
  tiers: [1.99, 2.99, 3.99, 4.99],
  slotsPerTier: 5,
  sold: 0,

  // MORE MACS: one key that activates on 2 to 10 Macs. These are the regular prices that
  // apply once the launch slots are gone (the last launch price, $4.99, is the 1-Mac price).
  packs: [
    { macs: 2, usd: 8.99 },
    { macs: 3, usd: 12.99 },
    { macs: 4, usd: 16.99 },
    { macs: 5, usd: 19.99 },
    { macs: 6, usd: 22.99 },
    { macs: 7, usd: 25.99 },
    { macs: 8, usd: 28.99 },
    { macs: 9, usd: 31.99 },
    { macs: 10, usd: 34.99 },
  ],

  // false: Mac packs appear only after the launch slots are gone.
  // true: show them from day one, next to the launch price.
  showPacksDuringLaunch: false,
};

export const launchSlots = pricing.tiers.length * pricing.slotsPerTier;

/** What one Mac costs once launch pricing is over (or when there is none). */
export const regularUsd = pricing.tiers[pricing.tiers.length - 1];

/** The lowest price anyone can pay for one Mac. */
export const lowestUsd = pricing.launch ? pricing.tiers[0] : regularUsd;

/** Where a given number of sold slots puts the launch price. */
export function tierFor(sold: number) {
  if (!pricing.launch) return { index: pricing.tiers.length - 1, usd: regularUsd, nextUsd: null, taken: 0, left: 0, launchOver: true };
  const clamped = Math.max(0, Math.floor(sold));
  const over = clamped >= launchSlots;
  const index = Math.min(Math.floor(clamped / pricing.slotsPerTier), pricing.tiers.length - 1);
  const last = index === pricing.tiers.length - 1;
  return {
    index,
    usd: pricing.tiers[index],
    nextUsd: last ? null : pricing.tiers[index + 1],
    taken: over ? pricing.slotsPerTier : clamped - index * pricing.slotsPerTier,
    left: over ? 0 : pricing.slotsPerTier - (clamped - index * pricing.slotsPerTier),
    launchOver: over,
  };
}

export const formatUsd = (usd: number) => `$${usd.toFixed(2)}`;

export const currentTier = tierFor(pricing.sold);

export const site = {
  name: 'LidShutter',
  url: 'https://lidshutter.com',
  tagline: 'Open your Mac like you open your shop.',
  // What search results show: the words people actually search for, kept short enough not to be cut off.
  homeTitle: 'LidShutter – Play a Sound When You Open Your MacBook',
  metaDescription:
    'LidShutter is a Mac menu bar app that plays a sound when you open or close your MacBook lid. 22 original sounds, works offline, one-time price.',
  description:
    'LidShutter is a tiny Mac menu bar app that plays a rolling shop shutter when you open your MacBook lid, and a cheerful pop when you close it. 22 original sounds. Works offline after you activate it.',
  price: formatUsd(currentTier.usd),
  // The newest notarized DMG. The release script (Tools/release.sh in the app project) puts it here for you.
  downloadUrl: '/LidShutter.dmg',
  supportEmail: 'support@lidshutter.com',
  // The person who makes LidShutter, shown in the footer and in the search-engine data.
  makerHandle: 'ashfaque_dev',
  makerUrl: 'https://x.com/ashfaque_dev',
  // Where buyers sign in to see their license key again. Polar → Settings shows your organization slug:
  // the address is https://polar.sh/<your-slug>/portal
  portalUrl: 'https://polar.sh/lidshutter/portal',
  requirements: 'macOS 13 Ventura or later',
};
