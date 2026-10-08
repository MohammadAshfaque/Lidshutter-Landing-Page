// Plain-text summaries of LidShutter for AI assistants (llms.txt and llms-full.txt), built from the same data
// as the page so the facts always match.

import { faqs } from '../data/faq';
import { formatUsd, lowestUsd, pricing, regularUsd, site } from '../data/site';
import { totalSoundCount } from '../data/sounds';

const link = (path: string) => new URL(path, site.url).href;
const per = (usd: number, macs: number) => formatUsd(usd / macs);

const facts = () => `- What it is: a paid macOS menu bar app that plays a sound when you open your MacBook lid and another when you close it.
- Sounds: ${totalSoundCount} original sounds, all generated in code inside the app (no recordings, no audio files).
- Requirements: ${site.requirements}. Works on Macs with a lid; on MacBooks with a lid angle sensor the close sound can start before the lid shuts.
- Price: one-time purchase in US dollars, no subscription. One Mac costs ${formatUsd(regularUsd)}.
- Several Macs: one license key can cover 2 to 10 Macs (${pricing.packs.map((p) => `${p.macs} Macs ${formatUsd(p.usd)}`).join(', ')}).
- Refunds: 7 days from purchase, full refund, by emailing ${site.supportEmail}. A refunded key stops working.
- License: lifetime license with free updates. One key activates the number of Macs it was bought for; a key can be moved to a new Mac by deactivating the old one.
- No trial: the app stays locked until a license key is activated (needs internet once; then it works offline).
- Privacy: the app has no account and no analytics. It only contacts the license service to activate, deactivate and re-check a key, and lidshutter.com about once a day to look for a new version.
- Distribution: sold directly from lidshutter.com as a notarized download (not on the Mac App Store). Payments and license keys are handled by Polar.
- Maker: built by @${site.makerHandle} on X (${site.makerUrl})
- Support: ${site.supportEmail}`;

export const llmsTxt = () => `# ${site.name}

> ${site.description}

${facts()}

## Pages

- [Home, features and pricing](${link('/')}): what LidShutter does, the sounds, and how to buy it
- [FAQ](${link('/#faq')}): licenses, offline use, privacy, supported Macs
- [Changelog](${link('/changelog')}): what is new in each version
- [How to play a sound when you open your MacBook lid](${link('/blog/play-a-sound-when-you-open-your-macbook')}): what macOS does and doesn't do, and how to add a lid sound
- [How the close sound plays before the lid shuts](${link('/blog/macbook-lid-angle-sound')}): lid angle detection explained
- [How every sound is made in code](${link('/blog/sounds-made-in-code')}): how the sounds are built
- [Privacy policy](${link('/privacy')}): exactly what the app and the website collect
- [Refund policy](${link('/refund')}): 7-day refund
- [Terms of use](${link('/terms')}): license and use
- [Support](${link('/support')}): contact and feedback

## Optional

- [Full text for AI assistants](${link('/llms-full.txt')}): all of the above with every FAQ answer
`;

export const llmsFullTxt = () => `# ${site.name}

> ${site.description}

## Key facts

${facts()}

## Frequently asked questions

${faqs.map((f) => `### ${f.q}\n\n${f.a}`).join('\n\n')}

## Pricing in detail

One Mac: ${formatUsd(regularUsd)}.

Mac packs (one key, several Macs): ${pricing.packs.map((p) => `${p.macs} Macs for ${formatUsd(p.usd)} (${per(p.usd, p.macs)} per Mac)`).join('; ')}.

Prices are in US dollars and charged once.

## Links

- Website: ${link('/')}
- Changelog: ${link('/changelog')}
- Privacy policy: ${link('/privacy')}
- Support: ${site.supportEmail}
`;
