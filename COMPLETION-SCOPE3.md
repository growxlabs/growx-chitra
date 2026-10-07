# Scope 3 completion report — Payments and credit packs

> Storage update: this report records the original Scope 3 implementation. Current image/file storage is private Supabase Storage; current setup instructions are in `README.md` and `OPERATIONS-SCOPE4.md`. Historical D1 columns named `*_r2_key` remain to preserve the schema, but the active Worker has no R2 binding or API.

## 1. Summary

Scope 3 adds one-time Razorpay credit-pack purchases to the existing WhatsApp workflow. Businesses can check credits, view plans, select a pack, receive a Razorpay-hosted payment link, and receive credits plus a WhatsApp confirmation after a verified payment webhook. Zero-credit image messages are not queued or downloaded; the user receives plan choices. Existing Scope 1 and Scope 2 flows remain in place.

No recurring subscriptions, dashboard, web/mobile customer UI, inventory, or new image-generation capability was added. No live Razorpay payment or production deployment was performed.

## 2. Files changed

- Added `src/plans.ts` for stable plan IDs and centralized INR/paise prices and credit quantities.
- Added `src/razorpay.ts` for hosted-link API calls, raw-body webhook HMAC verification, and safe event parsing.
- Added `src/payments.ts` for WhatsApp purchase commands, payment status, verified payment processing, credit grants, refund review, and customer messages.
- Updated `src/index.ts`, `src/webhook.ts`, `src/store.ts`, `src/pipeline.ts`, and `src/types.ts` to connect commands, zero-credit handling, and the Razorpay webhook.
- Updated `migrations/0004_payments.sql`, `.dev.vars.example`, `wrangler.jsonc`, `README.md`, and `tests/foundation.test.ts`.
- No new npm dependency or Razorpay SDK was added; the isolated provider module uses Razorpay’s HTTPS API with Basic authentication.

## 3. Migration added

`migrations/0004_payments.sql` adds `payments`, `payment_provider_events`, and `payment_refunds`; adds a ledger `reference_id` with a unique purchase reference; and installs database triggers that validate purchase ledger entries and atomically increment paid credits. Payment rows store paise and INR. Provider payment-link and payment IDs are unique. WhatsApp command message IDs are unique to make Meta webhook retries idempotent.

## 4. Plan configuration

`src/plans.ts` is the central configuration:

| Stable ID | Type | Credits | Amount |
| --- | --- | ---: | ---: |
| `free` | Lifetime free | 5 | ₹0 |
| `starter` | One-time credit pack | 50 | ₹999 / 99,900 paise |
| `business` | One-time credit pack | 150 | ₹2,499 / 249,900 paise |
| `pro` | One-time credit pack | 350 | ₹4,999 / 499,900 paise |

`custom` pricing is not automated. The bot directs those requests to GrowxLabs.

## 5. Payment architecture

A plan reply creates a D1 payment record before calling Razorpay. The backend selects the fixed amount, INR currency, and credits from the plan ID. Razorpay sends back a hosted `short_url`, which is stored and returned in WhatsApp. A still-pending link for the same plan is reused; a new WhatsApp selection after a terminal payment state can create a new payment. The user cannot pass a price, currency, or credit quantity.

The purchase link includes only the customer phone number, an internal reference, plan/credit notes and a concise description. `RAZORPAY_MODE` defaults to `test`; key-prefix validation refuses live keys in Test Mode. Live mode requires deliberate configuration after the readiness checklist. Razorpay handles collection. Growx Chitra does not handle or store card details, CVV, UPI PINs, or bank credentials.

## 6. Razorpay webhook architecture

`POST /webhooks/razorpay` reads and size-limits the exact raw body, validates `X-Razorpay-Signature` using HMAC-SHA256 and the configured webhook secret, then parses the JSON. Invalid signatures receive HTTP 401. Oversized payloads receive 413. Provider processing failures receive 503 so Razorpay can retry; internal details are not returned.

Supported events are `payment_link.paid`, `payment_link.expired`, `payment_link.cancelled`, `payment.failed`, `refund.created`, and `refund.processed`. A paid event must identify the internal link record and payment ID and match the stored plan amount, full amount paid, and INR currency. Redirects and screenshots never grant credits. Unknown/mismatched records or amounts grant none and are logged for reconciliation.

## 7. Credit grants and idempotency

The paid webhook updates the payment row and inserts a purchase ledger entry in one D1 batch. A unique ledger reference per provider payment prevents repeat grants. The database trigger checks the matching paid transaction before adding the ledger amount to `paid_remaining`. Different successful payment IDs each receive their own ledger entry, so packs accumulate and free credits are not reset.

Receipt/event IDs are recorded, provider payment IDs are unique, and confirmation sending is claimed once in D1. Replayed webhook events cannot increase the balance twice. Image credits continue to be deducted only after the existing verified WhatsApp delivered/read callback.

Refund webhooks create a refund record and set `refund_review_required`; `refund.processed` marks the payment refunded. No automatic credit reversal occurs, so used credits cannot create a negative balance.

## 8. WhatsApp purchase flow and commands

- With zero credits, an incoming image is declined before job creation, queueing, media download, or OpenAI processing. The bot sends the three plan choices and a custom-plan contact message.
- `starter`, `business`, `pro`, and numeric `1`, `2`, `3` create or reuse the fixed Razorpay link. `4` or `custom` gives the GrowxLabs contact response.
- `credits` reports available credits without exposing database fields.
- `plan`, `plans`, and `buy` return the plan choices.
- `payment` and `payment status` report the latest payment state in customer-facing wording.

Payment-link messages include any configured Terms, Privacy, Refund Policy and payment-support URLs. Empty development values are omitted.

## AUTOMATED VERIFIED

The automated/local checks listed below pass. The suite uses mocked provider and Meta requests and local D1; it does not establish live payment or delivery behavior.

## LIVE TEST REQUIRED

Razorpay Test Mode credentials, a reachable HTTPS webhook, a Meta test number, and a test Cloudflare database are still required to verify the full purchase flow. No live-mode payment should be attempted before the checklist below.

## 9. Verification results

- `npm test`: **71 tests passed** across 2 test files. This includes existing Scope 1/2 coverage and Scope 3 tests for all fixed pack prices, lifetime free grants, zero-credit no-job behavior, invalid plan/amount input, Test Mode enforcement, link reuse and creation failures, raw-body signature rejection, valid grant, duplicate/concurrent callbacks, two purchases, accumulation, failed/expired states, refund review, WhatsApp messages and status commands.
- Tests mock Razorpay HTTP, Meta HTTP, OpenAI image generation, Workers AI and Cloudflare Images. No real payment is created and no OpenAI generation request is sent by the automated suite.
- `npm run typecheck`: passed.
- `npm run lint`: passed.
- `npm run db:migrate:local`: passed; applied `0004_payments.sql` locally (10 SQL commands).
- `npm run validate:worker`: passed; Wrangler dry-run bundled Worker and listed configured D1/R2/Queue/AI/Images bindings and policy variables.
- `npm audit --omit=dev`: could not complete because the npm advisory endpoint was unavailable in this environment. `npm ci` installed the lockfile as-is; no package or SDK was added.

The repository folder has no Git metadata, so `git diff` / `git status` are unavailable. The changed file list above is based on the edits in this task; unrelated changes could not be assessed through Git.

## 10. Required environment variables

Secrets:

- `RAZORPAY_KEY_ID` — Test Mode key ID for testing (Razorpay test keys begin `rzp_test_`).
- `RAZORPAY_KEY_SECRET` — matching API secret.
- `RAZORPAY_WEBHOOK_SECRET` — the exact secret configured for the webhook endpoint.
- Existing `WHATSAPP_VERIFY_TOKEN`, `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_APP_SECRET`, and `OPENAI_API_KEY` remain required for the end-to-end WhatsApp product flow.

Non-secret setting: `RAZORPAY_MODE` defaults to `test`; it must be explicitly changed to `live` before matching live keys are accepted. Optional non-secret settings: `TERMS_URL`, `PRIVACY_URL`, `REFUND_POLICY_URL`, and `PAYMENT_SUPPORT_CONTACT`. `.dev.vars.example` contains placeholders only.

## 11. Razorpay Test Mode setup

1. In Razorpay Dashboard, switch to Test Mode and create a test key pair. Do not use live keys.
2. Put `rzp_test_...`, its matching API secret, and a newly selected webhook secret into ignored local `.dev.vars` or Wrangler secret prompts. Never put secret values in source control or command-line arguments.
3. Start local D1 migrations and `npm run dev`. A webhook needs a publicly reachable HTTPS callback; configure an HTTPS tunnel you control or a dedicated test Worker.
4. In Razorpay Test Mode, register `https://<test-host>/webhooks/razorpay`, enter the same webhook secret, and subscribe to the six events in Section 6.
5. Send `starter` from the test WhatsApp recipient. Complete the ₹999 hosted link with a Razorpay test payment method.
6. Confirm the payment row is `paid`, one ledger row grants `+50`, paid balance increases by 50, and a WhatsApp confirmation arrives.
7. Replay the same signed event and confirm the ledger count and balance do not change and no second confirmation is sent.
8. Exercise an expired link, failed payment, failed link API call and a refund event. None should grant or automatically remove credits; the refund should be flagged for manual review.

## 12. Cloudflare changes required

No new Cloudflare binding/resource is required. Apply `0004_payments.sql` with `npm run db:migrate:remote` only after setting the real D1 database ID and when an authorized test/live environment is ready. Configure the three Razorpay secrets for the intended Worker environment. No deployment was performed.

## 13. Meta changes required

No additional Meta product or permission is introduced. Keep the existing WhatsApp `messages` webhook subscription; it carries text commands, incoming images, and delivery statuses. The Worker must have the existing messaging token and phone-number ID to send payment links and confirmations.

## 14. Privacy and legal configuration

Before accepting live payments, configure real public Terms, Privacy Policy, Refund Policy and payment-support contact values. These are optional in development and appear in the first purchase message only when configured. No fake production URL is embedded.

## 15. Known limitations

- No recurring billing, custom pricing automation, automated refund credit reversal, customer web account, dashboard, or manual adjustment interface exists.
- Refunds require manual review. No payment reconciliation dashboard or scheduled reconciliation job is included.
- A Razorpay-paid amount mismatch is acknowledged for reconciliation and does not grant credits; an operator must inspect provider records and internal rows before correcting it.
- Real Test Mode keys, an HTTPS webhook, a configured Meta test number, production D1 resources, and real policy/contact URLs are not available in this workspace. Live provider delivery and customer message delivery have not been verified.
- No Git metadata is present in the workspace, preventing a baseline diff review.

## 16. Live test procedure

Use only Razorpay Test Mode and a Meta test number first. Configure the test secrets and HTTPS webhook, send `starter`, complete payment, then verify payment row, purchase ledger, `paid_remaining`, and WhatsApp confirmation. Replay the exact signed webhook to prove the balance stays at +50. Test failure, expiry and refund paths before any live-mode setup. Follow the README’s live-mode checklist before changing credentials; this code does not automatically switch to live mode.

## 17. Exact next step

Configure Razorpay Test Mode keys, the test webhook secret, real Meta test credentials, and the public test callback URL; apply migration 0004 on the test D1, then follow the README’s Test Mode procedure. Do not deploy or switch to live keys until those checks pass.
