# Selling LidShutter with Polar

How a sale works: the visitor presses **Buy** → our server (`/api/checkout`) works out the right price from the real number of launch licenses sold and sends them to a Polar checkout → Polar takes the payment (as the seller of record, so it handles sales tax and VAT) and creates a **license key** → the buyer lands on `/thanks`, which fetches the key and shows it (it is also always in their Polar customer portal) → they paste it into the app. Polar also calls our webhook (`/api/polar-webhook`), which counts the sale and moves the launch price up.

Do everything below in the **sandbox** first (a separate copy of Polar at sandbox.polar.sh with fake payments), then repeat it in the live account.

## 0. Know the fees
Polar's fees are a percentage plus a fixed amount per sale (Starter plan: 5% + 50¢, plus 1.5% for international cards; Pro, $20/month: 3.8% + 40¢). On a $1.99 launch sale that is roughly 60¢, so you keep about $1.39. Check the current numbers on Polar's pricing page. You are always responsible for income tax in your own country.

## 1. Account and organization IDs
1. Create the account and organization at polar.sh and finish Polar's identity and payout setup.
2. Create the same in the sandbox (sandbox.polar.sh). It is a separate organization with separate IDs, products and tokens.
3. In each, copy the **Organization ID** (Settings → General). Put them in the app: `LidShutter/License.swift` → `LicenseConfig`: `organizationID` for the sandbox (Debug builds) and for live (Release builds). `Tools/release.sh` refuses to build until both are filled in.
4. Note your organization **slug** (the name in your Polar address). The customer portal is `https://polar.sh/<slug>/portal`. Put it in `src/data/site.ts` → `portalUrl`.

## 2. One license-key benefit
Benefits → **New Benefit** → **License Keys**. Make **one**:

| Setting | Value |
|---|---|
| Prefix | `LIDSHUTTER-` |
| Visibility | shown to customers (not Hidden) |
| Expiration | **None**. An expiry would lock customers out later. |
| Limit activations | on, **1** |
| Let customers deactivate in Polar | ticked |
| Limit usage | off |

It allows 1 Mac. When someone buys a Mac pack, our server raises that key's limit to the number of Macs they bought (2 to 10), so you never make a benefit per pack.

## 3. One product
Products → **New Product**. Name it "LidShutter". Pricing: **One-time**, **Fixed price**, USD only (leave "Add Currency", seat and unit pricing alone). Price: **$4.99**. Attach the license-key benefit from step 2. Save, open the product and copy its **Product ID** into `POLAR_PRODUCT_ID`.

**You never create more products and never change a price in Polar.** For every sale the site tells Polar the exact price (the launch prices $1.99, $2.99, $3.99, then $4.99, or the Mac pack price) and how many Macs the key covers, and counts the launch sales through the webhook. The $4.99 on the product is only a fallback. The prices live in `src/data/site.ts`.

### Prices in local currencies
Because the site sets each sale's price in US dollars, buyers are charged in USD and their bank converts it. The landing page still shows an approximate local price. (Fixed local-currency prices would need a separate Polar product per price, which this setup avoids on purpose.)

### Tax
Polar is the seller of record: it collects and pays sales tax and VAT. By default Polar shows prices **including** tax in most countries and **excluding** tax in the US, Canada and India. Where the price includes tax, the tax comes out of your $1.99. Look in your Polar organization settings for the tax-inclusive / tax-exclusive choice and decide which you want before launch.

## 4. Access token and webhook
- **Token:** Settings → Developers → **New Access Token** (an Organization Access Token) with the scopes `checkouts:write`, `checkouts:read`, `customer_sessions:write`, `license_keys:write` → `POLAR_ACCESS_TOKEN`. The sandbox and live organizations each have their own.
- **Webhook:** Settings → Webhooks → **Add Endpoint**. URL `https://lidshutter.com/api/polar-webhook`, format **Raw**, event **order.paid** only. Set a secret (Polar can generate one) → `POLAR_WEBHOOK_SECRET`.

## 5. Vercel
1. Project → Storage → add **Upstash Redis** (free). It fills `UPSTASH_REDIS_REST_URL` / `_TOKEN`. Without it the launch counter can't work.
2. Settings → Environment Variables → add everything in `.env.example` (`POLAR_ENV=sandbox` for now, with the sandbox token, secret and product IDs).
3. Deploy. Also add `RESEND_API_KEY` so the Support form can email you.

## 6. Test it (sandbox)
1. Open the site, press **Buy**, and pay with a Polar test card (`4242 4242 4242 4242`, any future date, any CVC). You should land on `/thanks` and see a key after a few seconds.
   To try a Mac pack before the launch is over, set `SOLD_OFFSET=20` in Vercel for the test, then remove it again.
   After a pack purchase, open the key in the Polar sandbox (or the customer portal) and check its activation limit is the number of Macs you bought.
2. Reload the site: "5 of 5 left at $1.99" should now read "4 of 5 left".
3. Build the app from Xcode (Debug builds use the sandbox): paste the key → Activate → the app unlocks and the tour starts.
4. Try the same key on a second Mac: it should say it's already active on all the Macs it covers. On the first Mac use License → Deactivate this Mac, then the second Mac can activate.
5. In the Polar sandbox dashboard, refund the order. Check that the key stops working (in the customer portal and, within about a week of the Mac being online, in the app, which then locks itself). If the key still works after a refund, revoke the key by hand in the dashboard and tell me.
6. In Settings → Webhooks, open the delivery log and confirm the `order.paid` events arrived with a green tick. The counter depends on them.
7. Try a purchase from another country (a VPN) and confirm the local currency shows, if you added any.

If `/thanks` says it couldn't show the key, the key is still in the customer portal; tell me and I'll check the lookup against what your Polar returns.

## 7. Go live
1. In live Polar, repeat steps 2-4 (benefits, products, token, webhook). The IDs, token and secret are all different from the sandbox.
2. In Vercel, replace the sandbox values with the live ones and set **`POLAR_ENV=live`**.
3. Make sure the live organization ID is in `License.swift`, then build the app with `sh Tools/release.sh 1.0 "First release."`.
4. Set the activation message / download link: the download button points to `/LidShutter.dmg` on the site, and `/thanks` shows the same download button.
5. Do one real purchase yourself (and refund it) before announcing.

## Shipping the app (outside the Mac App Store)
License keys and an outside payment link aren't allowed in the Mac App Store, so sell it directly. Everything (build, sign, notarize, DMG, update list, upload) is one command in the app project:

```bash
sh Tools/release.sh 1.0 "First release."
```

Set it up once with your Apple Developer ID. The steps are in the app project's `RELEASING.md`. Customers get updates inside LidShutter: the same command, with a new version number, is how you ship every update.

## What the app talks to
Polar's license endpoints (once on activation, once on deactivation, and at most once a week to confirm the key wasn't refunded) and `lidshutter.com/appcast.xml` (about once a day, to see whether a newer version exists). Offline never locks a paid Mac. The app has a checker for its license logic: `sh Tools/LicenseTests/run.sh` (in the app folder).
