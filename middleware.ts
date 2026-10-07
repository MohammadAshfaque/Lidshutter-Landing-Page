// Bot traffic tracking for DataFast: tells DataFast when an AI assistant or search crawler (ChatGPT, Claude,
// Perplexity, Googlebot and so on) asks for a page on lidshutter.com. Normal visitors are ignored, and nothing waits
// for DataFast: the report goes out in the background after the page has been served.
//
// This is Vercel's own routing middleware, so it also sees requests for the static pages. It never runs for the
// /api routes (checkout, the Polar webhook, license keys), only for pages and crawler files like robots.txt.
// Docs: https://datafa.st/docs/bot-traffic-tracking

import { trackAICrawlerRequest } from '@datafast/ai-crawl';
import { waitUntil } from '@vercel/functions';
import { next, rewrite } from '@vercel/functions/middleware';

export default function middleware(request: Request) {
  // A safety net: if the Polar webhook address is saved without its path (just https://lidshutter.com/), the signed
  // message is handed to the webhook handler instead of failing with a 405. The handler still checks the signature.
  if (request.method === 'POST' && new URL(request.url).pathname === '/' && request.headers.has('webhook-signature')) {
    return rewrite(new URL('/api/polar-webhook', request.url));
  }
  try {
    trackAICrawlerRequest(request, { waitUntil }, { websiteId: 'dfid_s32MgUe709d4iFfVo1B94' });
  } catch {
    /* tracking must never break a page */
  }
  return next({ headers: { 'x-lidshutter-tracking': '1' } });
}

export const config = {
  // Pages and crawler files; not /api, build files, images, fonts, audio or downloads.
  matcher: ['/((?!api/|_astro/|_vercel/|.*\\.(?:png|jpe?g|gif|svg|ico|webp|avif|css|js|mjs|map|woff2?|ttf|mp3|wav|m4a|ogg|mp4|webm|json|dmg|zip)$).*)'],
};
