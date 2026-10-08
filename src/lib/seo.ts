// Search-engine and AI-answer data (JSON-LD). It says in a machine-readable way what LidShutter is, what it costs
// and what people ask about it. Everything here comes from the same data as the page, so nothing can drift.

import { faqs } from '../data/faq';
import { formatUsd, lowestUsd, pricing, site } from '../data/site';
import { totalSoundCount } from '../data/sounds';

const id = (name: string) => `${site.url}/#${name}`;
const absolute = (path: string) => new URL(path, site.url).href;

export const ogImage = absolute('/og/lidshutter.png');

export const organization = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  '@id': id('organization'),
  name: site.name,
  url: site.url,
  logo: absolute('/icons/app-icon-512.png'),
  email: site.supportEmail,
  sameAs: [site.makerUrl],
  founder: { '@type': 'Person', name: `@${site.makerHandle}`, url: site.makerUrl, sameAs: [site.makerUrl] },
  contactPoint: { '@type': 'ContactPoint', contactType: 'customer support', email: site.supportEmail, availableLanguage: 'English' },
};

export const website = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  '@id': id('website'),
  url: site.url,
  name: site.name,
  description: site.description,
  inLanguage: 'en',
  publisher: { '@id': id('organization') },
};

export const softwareApplication = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  '@id': id('app'),
  name: site.name,
  alternateName: 'LidShutter for Mac',
  description: site.description,
  url: site.url,
  image: ogImage,
  applicationCategory: 'UtilitiesApplication',
  applicationSubCategory: 'Menu bar app',
  operatingSystem: 'macOS 13 or later',
  softwareRequirements: site.requirements,
  downloadUrl: absolute(site.downloadUrl),
  featureList: [
    `${totalSoundCount} original sounds generated in code`,
    'Plays a sound when the MacBook lid opens and a goodbye sound when it closes',
    'Reads the lid angle so the close sound lands as the lid shuts',
    'Trackpad vibration that follows each sound',
    'Works offline after activation',
    'No account and no analytics in the app',
  ],
  inLanguage: 'en',
  publisher: { '@id': id('organization') },
  offers: {
    '@type': 'AggregateOffer',
    priceCurrency: 'USD',
    lowPrice: lowestUsd.toFixed(2),
    highPrice: pricing.packs[pricing.packs.length - 1].usd.toFixed(2),
    offerCount: pricing.packs.length + 1,
    availability: 'https://schema.org/InStock',
    url: `${site.url}/#pricing`,
    description: `One-time purchase, no subscription. ${formatUsd(lowestUsd)} for one Mac; packs for 2 to 10 Macs.`,
  },
};

export const faqPage = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  '@id': id('faq'),
  mainEntity: faqs.map((f) => ({
    '@type': 'Question',
    name: f.q,
    acceptedAnswer: { '@type': 'Answer', text: f.a },
  })),
};

export const breadcrumbs = (trail: { name: string; path: string }[]) => ({
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: trail.map((t, i) => ({ '@type': 'ListItem', position: i + 1, name: t.name, item: absolute(t.path) })),
});

export const article = (headline: string, description: string, path: string) => ({
  '@context': 'https://schema.org',
  '@type': 'BlogPosting',
  headline,
  description,
  image: ogImage,
  url: absolute(path),
  mainEntityOfPage: absolute(path),
  author: { '@id': id('organization') },
  publisher: { '@id': id('organization') },
  inLanguage: 'en',
});

export const howTo = (name: string, description: string, steps: { name: string; text: string }[]) => ({
  '@context': 'https://schema.org',
  '@type': 'HowTo',
  name,
  description,
  step: steps.map((s, i) => ({ '@type': 'HowToStep', position: i + 1, name: s.name, text: s.text })),
});

/** Safe to place inside a script tag. */
export const jsonLd = (data: object | object[]) => JSON.stringify(data).replace(/</g, '\\u003c');
