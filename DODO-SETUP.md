# Selling LidShutter with Dodo Payments

How a sale works: the visitor presses **Buy** → our server (`/api/checkout`) works out the right price from the real number of launch licenses sold and sends them to a Dodo checkout → Dodo takes the payment, creates a **license key** and emails it → the buyer lands on `/thanks` (the key is shown there too) → they paste it into the app. Dodo also calls our webhook (`/api/dodo-webhook`), which counts the sale and moves the launch price up.

Do everything below in **test mode first** (Dodo has a test/live switch in the dashboard), then repeat in live mode.

## 1. Create the license-key entitlement
Dodo dashboard → **Entitlements → Create → License Key**.

| Setting | Value |
|---|---|
| Fulfillment mode | Automatic |
| Activations limit | **1** (for single-Mac products). For a pack of N Macs, make another entitlement with limit **N**. |
| License length | **No expiration** (an expiry would lock customers out later) |
| Activation message | `Download LidShutter: <your download link>. Open it, go to License, paste this key and press Activate.` |

Make 10 entitlements in total: limit 1, 2, 3 … 10.

## 2. Create the products (all **one-time payment**)
| Product | Price | Entitlement | Env var |
|---|---|---|---|
| LidShutter Launch 1 | $1.99 | limit 1 | `DODO_PRODUCT_LAUNCH_1` |
| LidShutter Launch 2 | $2.99 | limit 1 | `DODO_PRODUCT_LAUNCH_2` |
| LidShutter Launch 3 | $3.99 | limit 1 | `DODO_PRODUCT_LAUNCH_3` |
| LidShutter Launch 4 | $4.99 | limit 1 | `DODO_PRODUCT_LAUNCH_4` |
| LidShutter, 1 Mac | $4.99 | limit 1 | `DODO_PRODUCT_MACS_1` |
| LidShutter, 2 Macs … 10 Macs | $8.99 … $34.99 (see `src/data/site.ts`) | limit 2 … 10 | `DODO_PRODUCT_MACS_2` … `_10` |

Keep the quantity picker off: one purchase = one key. (Dodo makes one key per unit of quantity.) Copy each product's ID (`pdt_…`) into the env var.
If you change a price in `src/data/site.ts`, change the matching Dodo product too. Checkout refuses to charge a price the visitor didn't see.

## 3. Get the keys
- **API key**: Developer → API Keys → create one → `DODO_API_KEY` (use the test-mode key while testing).
- **Webhook**: Developer → Webhooks → Add endpoint → `https://lidshutter.com/api/dodo-webhook`, event **payment.succeeded** → copy the signing secret → `DODO_WEBHOOK_SECRET`.
- **Return page**: in checkout settings (or on the product) set the return URL to `https://lidshutter.com/thanks`. Dodo adds `?license_key=…` to it.

## 4. Vercel
1. Project → Storage → add **Upstash Redis** (free). It fills `UPSTASH_REDIS_REST_URL` / `_TOKEN`. Without it the launch counter can't work.
2. Settings → Environment Variables → add everything in `.env.example` (`DODO_ENV=test` for now).
3. Deploy. Also add `RESEND_API_KEY` so the Support form can email you.

## 5. Test it (test mode)
1. Open the site, press **Buy**, pay with Dodo's test card. You should land on `/thanks` with a key. (If the page says the key was emailed instead of showing it, Dodo didn't add `?license_key=` to the return address. The email still has the key, so nothing is lost, but tell me and I'll adjust the page.)
2. Check the email arrived with the key and your download link.
3. Reload the site: "5 of 5 left at $1.99" should now read "4 of 5 left".
4. In the app (build with `LicenseConfig.apiHost = "https://test.dodopayments.com"`): paste the key → Activate → the app unlocks and the tour starts.
5. Try the same key on a second Mac: it should say it's already active on all the Macs it covers. In the first Mac use License → Deactivate this Mac, then the second Mac can activate.
6. Refund the test payment in Dodo. Within about a week of the Mac being online, the app locks itself again.
7. Check `payment.succeeded` really contains `data.product_cart` (Dodo dashboard → Webhooks → event log). The counter relies on it. If your event looks different, tell me and I'll adjust `src/lib/webhook.ts`.

## 6. Go live
1. In Dodo switch to live mode and recreate the entitlements/products there (IDs differ). Update the env vars, set **`DODO_ENV=live`**, create a live webhook endpoint and use its new secret.
2. Build the app with `LicenseConfig.apiHost = "https://live.dodopayments.com"` (that's the default in the code).
3. Set `site.downloadUrl` in `src/data/site.ts` to your notarized DMG, and put the same link in the Dodo activation message.
4. Do one real purchase yourself (and refund it) before announcing.

## Shipping the app (outside the Mac App Store)
License keys and an outside payment link aren't allowed in the Mac App Store, so sell it directly:
1. Join the Apple Developer Program, make a **Developer ID Application** certificate, and sign the app with it (Xcode → Signing: your team + "Developer ID Application").
2. Product → Archive → Distribute App → **Developer ID** → Upload (this notarizes it), then export.
3. Put it in a DMG (`hdiutil create` or `create-dmg`), notarize the DMG (`xcrun notarytool submit LidShutter.dmg --keychain-profile "<profile>" --wait`), then `xcrun stapler staple LidShutter.dmg`.
4. Check: `spctl -a -vv -t install LidShutter.dmg` says "accepted, source=Notarized Developer ID".

## What the app talks to
Only Dodo's license endpoints: once on activation, once on deactivation, and at most once a week to confirm the key wasn't refunded. Offline never locks a paid Mac. The app has a checker for its license logic: `sh Tools/LicenseTests/run.sh` (in the app folder).
