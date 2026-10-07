// The list of pages for search engines (and AI crawlers). Pages that shouldn't be found (/thanks, /api) are left out.

import type { APIRoute } from 'astro';
import { site } from '../data/site';

const pages = [
  { path: '/', changefreq: 'weekly', priority: '1.0' },
  { path: '/changelog', changefreq: 'monthly', priority: '0.7' },
  { path: '/blog', changefreq: 'monthly', priority: '0.6' },
  { path: '/blog/sounds-made-in-code', changefreq: 'yearly', priority: '0.6' },
  { path: '/support', changefreq: 'yearly', priority: '0.4' },
  { path: '/privacy', changefreq: 'yearly', priority: '0.3' },
];

export const GET: APIRoute = () => {
  const urls = pages
    .map(
      (p) =>
        `  <url>\n    <loc>${new URL(p.path, site.url).href}</loc>\n    <changefreq>${p.changefreq}</changefreq>\n    <priority>${p.priority}</priority>\n  </url>`,
    )
    .join('\n');
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
  return new Response(xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
};
