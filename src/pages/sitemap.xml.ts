// The list of pages for search engines (and AI crawlers). Pages that shouldn't be found (/thanks, /api) are left out.

import type { APIRoute } from 'astro';
import { site } from '../data/site';

const pages = [
  { path: '/' },
  { path: '/changelog' },
  { path: '/blog' },
  { path: '/blog/play-a-sound-when-you-open-your-macbook' },
  { path: '/blog/macbook-lid-angle-sound' },
  { path: '/blog/sounds-made-in-code' },
  { path: '/support' },
  { path: '/privacy' },
  { path: '/terms' },
  { path: '/refund' },
];

export const GET: APIRoute = () => {
  const urls = pages
    .map(
      (p) =>
        `  <url>\n    <loc>${new URL(p.path, site.url).href}</loc>\n  </url>`,
    )
    .join('\n');
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
  return new Response(xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
};
