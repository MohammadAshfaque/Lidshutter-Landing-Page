# lidshutter.com

The landing page for LidShutter, built with Astro, GSAP and plain CSS.

## Run it locally

```bash
npm install
npm run dev
```

Then open http://localhost:4321.

## Before launch

- Edit `src/data/site.ts`: prices, launch slots, `downloadUrl` (your notarized DMG) and `supportEmail`.
- Follow `DODO-SETUP.md` to set up payments and license keys, and copy `.env.example` for the environment variables.

## Where things live

| Path | What it is |
|---|---|
| `src/components/Hero.astro` | The MacBook lid that opens as you scroll, with the app running inside it |
| `src/components/DiceRoll.astro` | The dice that plays the 22 sounds |
| `src/components/AppDashboard.astro` | Working copy of the app's menu bar menu and dashboard (shown inside the hero lid) |
| `src/components/Pricing.astro` | Launch pricing, country prices and the Buy button |
| `src/scripts/synth.ts` | Port of `SoundSynth.swift`: the sounds, generated in the browser |
| `src/data/sounds.ts` | Sound names, subtitles and groups (mirrors the app) |
| `src/styles/global.css` | Design tokens taken from `Theme.swift` |
| `src/pages/privacy.astro`, `support.astro`, `thanks.astro` | Privacy policy, feedback form, and the page buyers land on after paying |
| `src/pages/api/` | Checkout, the Dodo sales webhook, sold count, country, feedback |

If you add or change a sound in the app, update `synth.ts` and `sounds.ts` to match.

## Deploy

Push to GitHub and import the repo in Vercel. Astro is detected automatically.

## Live "sounds played" counter

The counter at the top of the page counts every sound visitors play. It needs a free Upstash Redis database:

1. In your Vercel project, open **Storage → Create Database → Upstash for Redis** (free plan).
2. Connect it to the project. Vercel adds the `KV_REST_API_URL` / `KV_REST_API_TOKEN` (or `UPSTASH_REDIS_REST_*`) environment variables for you.
3. Redeploy.

Until a database is connected, the page shows the regular "A tiny menu bar app for MacBook" pill instead, so it never displays a made-up number. Locally, `npm run dev` uses a temporary in-memory counter that resets on restart.

The API lives in `src/pages/api/plays.ts`: at most 25 plays per request and 150 per minute per visitor.
