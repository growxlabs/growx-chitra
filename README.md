# Growx Chitra — WhatsApp image processing

WhatsApp-first product photo processing on TypeScript, Hono and Cloudflare Workers. Incoming photos are privately stored, moderated by OpenAI, and screened for people using Workers AI before generation. Product-only photos are normalized with Cloudflare Images, edited from the source photograph using OpenAI, optionally branded with the real private logo, checked again, and sent through WhatsApp. Credits are reserved during processing and charged once when Meta confirms delivery or read; send acceptance alone never charges.

## Architecture

```text
Meta WhatsApp -> signed webhook -> D1 onboarding, job and credit reservation -> Queue
Queue -> private Supabase Storage original -> validation -> OpenAI moderation -> Workers AI person detection
  -> Cloudflare Images normalization -> OpenAI source-image edit -> private Supabase Storage generated image
  -> deterministic private-logo composition -> output moderation and person detection
  -> private Supabase Storage final JPEG -> Meta media upload -> WhatsApp image send
Meta delivered/read webhook -> atomic D1 credit debit and completed job
Cron -> expired stage leases, delivery timeouts and receipt cleanup
```

The consumer downloads images so webhooks stay short. Migration 0002 keeps Scope 1 rows while adding safety/generation statuses, durable checkpoints, bounded model cost metadata, receipt tracking and credit reservations; 0003 adds final-image byte metrics; 0004 adds Razorpay credit-pack payments and ledger-backed purchase grants. The database trigger only charges one image credit for a matching verified delivered/read receipt, a live reservation, and a final image that passed output safety. Reservation inserts prevent concurrent jobs overspending. New image files support JPEG, PNG and WebP after strict MIME, signature, size and decoder validation; unsupported content fails before generation.

`src/safety.ts` validates decoded images, calls `omni-moderation-latest`, then Workers AI `@cf/facebook/detr-resnet-50`. Any moderation flag, configured-threshold `person` detection, malformed result or safety service outage stops generation. It stores only a minimal reason and sends a neutral refusal for blocked input. Generated images pass those checks again; unsafe candidates are removed. These models can still miss a person or a changed product detail; inspect real outputs before increasing use.

`src/openai.ts` uses `/v1/images/edits`, the configured `OPENAI_IMAGE_MODEL` (default `gpt-image-2.5-flare`), one normalized source photo and one output. The system prompt lives in `src/prompts/product-cleanup.ts`; users cannot provide generation prompts. `src/images.ts` validates/normalizes images and composes a real logo from private Supabase Storage. Missing logos produce an unbranded image. Generated images use WebP and the final WhatsApp image uses JPEG. Source, generated, final and brand assets remain private in the configured Supabase bucket. Image generation is capped at two persisted attempts per job.

See the official [OpenAI image-edit API](https://developers.openai.com/api/reference/resources/images/methods/edit), [OpenAI moderation API](https://developers.openai.com/api/docs/guides/moderation), [Workers AI DETR model](https://developers.cloudflare.com/workers-ai/models/detr-resnet-50/), and [Cloudflare Images binding](https://developers.cloudflare.com/images/optimization/binding/).

## Idempotency and recovery

- A unique WhatsApp message ID permits only one image job. Unique sender number permits only one business. New businesses receive the Scope 1 lifetime grant of 5 free credits and 0 paid credits; repeat contact does not reset it.
- Queue delivery is idempotent. Persisted input/output safety checkpoints and image artifacts allow retry without repeating completed stages; generation is capped at two persisted attempts per job. Expired processing leases are recovered by the scheduled handler.
- Private storage keys are `originals/{business_id}/{job_id}/source.{jpg,png,webp}`, `generated/{business_id}/{job_id}/clean.webp`, and `final/{business_id}/{job_id}/final.jpg`. Logo assets must be beneath `brands/{business_id}/`; keys never contain phone numbers. The adapter uses Supabase's authenticated object route and server-side service-role credentials; no public or signed asset URLs are sent to WhatsApp.
- A credit is reserved before expensive processing. Reservations prevent concurrent jobs from overspending the available free-first/paid-second balance. A blocked, failed, or definitively rejected send releases the reservation.
- Meta image sends include the D1 job UUID in `biz_opaque_callback_data`, linking receipts even if the API response is lost. Jobs remain `sending` and hold a reservation until delivery/read or the 24-hour timeout. Timeout reservations remain available for seven-day late-receipt reconciliation; ambiguous sends are never repeated automatically.
- Only a matching Meta `delivered` or `read` receipt can charge exactly one credit. Send acceptance alone never charges; duplicate receipts cannot charge twice. Missing receipts time out without charge. Supabase Storage object keys and expiry timestamps are persisted in D1; Cron removes expired assets.

## Required Cloudflare resources

Create these only when ready to configure a live test (nothing here creates resources automatically):

| Resource | Name | Binding |
| --- | --- | --- |
| D1 database | `growx-chitra-db` | `DB` |
| Queue | `growx-chitra-jobs` | `CHITRA_JOBS` producer; same queue consumed by Worker |
| Worker | `growx-chitra` | HTTP, queue, scheduled, Workers AI and Images bindings |
| Supabase Storage | `growx-chitra-private` (private bucket) | Worker-only REST API via environment variables |

Create a **private** Supabase Storage bucket named `growx-chitra-private`, allow JPEG/PNG/WebP, and set its file size limit to match `MAX_UPLOAD_BYTES`. Keep it private; the Worker uses the service-role key only from server-side secrets and downloads files through the authenticated object endpoint. Files are separated by tenant-safe prefixes for originals, generated/final images and brand logos. The Worker never exposes object URLs. D1, Queues, Workers AI and Cloudflare Images remain on Cloudflare.

```powershell
npx wrangler login
npx wrangler d1 create growx-chitra-db
npx wrangler queues create growx-chitra-jobs
```

Replace the placeholder `database_id` in `wrangler.jsonc` with the returned D1 UUID before remote migrations or deployment. Queue producer, consumer and cron are declared in that file. Set `SUPABASE_URL` and `SUPABASE_STORAGE_BUCKET` as Worker variables and `SUPABASE_SERVICE_ROLE_KEY` as a Worker secret; never expose that key in client or WhatsApp content.

The Worker declares `AI` and `IMAGES` bindings. Confirm Workers AI model access and Cloudflare Images availability/billing in your account. Local Images transformations run in offline mode; verify logo composition once with Cloudflare's remote Images binding before release. Supabase Storage uses the private authenticated-object endpoint and server-side Storage REST API; see [private buckets](https://supabase.com/docs/guides/storage/buckets/fundamentals), [downloads](https://supabase.com/docs/guides/storage/serving/downloads), and the [Storage API reference](https://supabase.com/docs/reference/self-hosting-storage/search-for-objects-under-a-prefix).

## Plans, credits and Razorpay payments

The free tier grants 5 lifetime image credits once per WhatsApp business number. Paid plans are one-time INR credit packs, not subscriptions:

| Stable plan ID | Credits | Price |
| --- | ---: | ---: |
| `free` | 5 lifetime | ₹0 |
| `starter` | 50 | ₹999 |
| `business` | 150 | ₹2,499 |
| `pro` | 350 | ₹4,999 |

The canonical plan configuration lives in `src/plans.ts`; amounts are stored in paise (`99900`, `249900`, `499900`). Custom pricing is not automated. The bot replies: “Contact GrowxLabs for a custom Growx Chitra plan.”

Customers can send `credits`, `plan`, `plans`, `buy`, `payment`, or `payment status`. After credits are exhausted, an image is not queued or downloaded; the bot offers numbered choices. Reply `1`, `2`, `3`, `starter`, `business`, or `pro` to create a hosted payment link. The server looks up amount and credits by plan ID; WhatsApp input never supplies either value. A pending link is reused for the same plan until Razorpay reports a terminal state.

`src/razorpay.ts` isolates Razorpay REST calls and HMAC verification. A payment row is recorded before link creation. Razorpay hosts collection; Growx Chitra stores only transaction IDs, plan/amount/status, a payment URL and minimal metadata. No card, CVV, UPI PIN or bank credentials are collected. `POST /webhooks/razorpay` verifies `X-Razorpay-Signature` against the exact raw request body before parsing. Subscribe to `payment_link.paid`, `payment_link.expired`, `payment_link.cancelled`, `payment.failed`, `refund.created`, and `refund.processed`. Only a correctly signed `payment_link.paid` event whose link, INR amount, amount paid and payment ID match the internal record grants credits. The purchase ledger insert is unique per Razorpay payment ID, and its database trigger increases `paid_remaining` atomically. Refund events are recorded and marked for manual review; no credits are automatically removed.

Required secrets now include `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`, and `SUPABASE_SERVICE_ROLE_KEY`, in addition to the WhatsApp/OpenAI values above. Set `SUPABASE_URL` and `SUPABASE_STORAGE_BUCKET` as Worker variables. Keep the Supabase service-role key in Worker secrets only. `RAZORPAY_MODE` defaults to `test`, and Payment Link creation rejects a key whose prefix does not match the configured mode. Start with Razorpay **Test Mode** keys (the key ID begins `rzp_test_`). Live mode requires a deliberate configuration change after the readiness checklist; the application never switches modes automatically. `TERMS_URL`, `PRIVACY_URL`, `REFUND_POLICY_URL`, and `PAYMENT_SUPPORT_CONTACT` are optional development variables; configure real public links/contact before live purchases. Unset links are omitted gracefully, and fake/localhost URLs are never inserted.

### Razorpay Test Mode procedure

1. In the Razorpay Dashboard, enable Test Mode and create a test API key pair. Put those values only in ignored `.dev.vars` or `wrangler secret put`; set `RAZORPAY_WEBHOOK_SECRET` to a webhook secret you choose in the Razorpay Dashboard. Never pass secrets as command arguments or commit them.
2. Start the local Worker (`npm run dev`) with D1 migrations applied. Expose the local callback through an HTTPS tunnel you control, or deploy a dedicated test Worker after configuring test resources and secrets.
3. In Razorpay Webhooks, register `https://<test-worker-host>/webhooks/razorpay`, enter the exact webhook secret, and subscribe to the six events listed above. Keep the test webhook URL separate from production.
4. Send `starter` to the test WhatsApp number. The bot should create a ₹999 hosted link for 50 credits. Complete the link with Razorpay's test payment method.
5. Confirm the signed `payment_link.paid` webhook returns HTTP 200, the payment row is `paid`, the purchase ledger has one `+50` entry with that payment ID, and `paid_remaining` increased by 50. Confirm the user receives the WhatsApp confirmation.
6. Replay the same signed webhook (or use the provider retry/test mechanism). Verify the ledger still has one purchase row, balance remains unchanged, and a second confirmation is not sent.
7. Test an expired link, a failed attempt, and a failed payment-link API response. None should grant credits. A refund event should create a refund record and set `refund_review_required`; it must not create a negative balance.

Local tests mock both Razorpay and Meta and do not charge a real payment. OpenAI image generation remains mocked in automated tests. A safe full-flow local test still requires real test keys, an HTTPS callback and the configured WhatsApp test recipient.

### Live-mode readiness checklist

Before changing to Razorpay live keys, confirm business/account activation, HTTPS production webhook registration and signature verification, tested idempotency, exact INR/paise amounts, production D1 migration, production secrets, successful and failed test flows, and a workable reconciliation procedure. Configure real Terms, Privacy, Refund Policy and payment-support contact URLs. Confirm no test key is configured in production. Do not switch keys or deploy automatically.

Troubleshooting: HTTP 401 from this endpoint means the webhook signature/secret pair did not match the raw body; verify the exact Dashboard secret. A signed webhook with a wrong amount or unknown payment is acknowledged but logged for reconciliation and grants no credits. If Razorpay reports paid but credits are absent, check `payment_provider_events`, the payment-link ID and exact paise amount before any manual ledger correction. A missing WhatsApp confirmation can be retried by Razorpay; duplicate webhook delivery cannot duplicate the credit grant.

## Required Meta credentials and setup

1. Create a Meta developer business app; enable the WhatsApp product and obtain a WhatsApp Business Account (WABA).
2. Initially use Meta's test WhatsApp number. Add and verify your recipient phone in the app's API setup screen, then send an inbound message from that recipient to open the customer service window.
3. Obtain a token with `whatsapp_business_messaging` permission and access to the configured WABA/phone. Temporary developer tokens expire; use an appropriate system user token for ongoing use. Management operations may require `whatsapp_business_management` permission.
4. Record the **phone number ID** (not the WABA ID, app ID or display phone number). The app secret is in the developer app's settings. Generate your own long random webhook verification token; it is separate from the access token.
5. Use a supported Graph version. `WHATSAPP_API_VERSION` defaults to `v23.0` in Wrangler; verify support for your Meta app before live testing.
6. Configure the WhatsApp webhook callback `https://<your-worker-host>/webhooks/whatsapp`; enter the matching verification token. Subscribe to the `messages` webhook field and ensure your app is subscribed to the WABA. Both HTTP verification and the subsequent POST signature checks must work.

| Secret | Purpose |
| --- | --- |
| `WHATSAPP_VERIFY_TOKEN` | Compare GET verification token |
| `WHATSAPP_ACCESS_TOKEN` | Authenticate media retrieval and message sending |
| `WHATSAPP_PHONE_NUMBER_ID` | Select incoming number and outgoing messages endpoint |
| `WHATSAPP_APP_SECRET` | Mandatory HMAC-SHA256 POST validation, `X-Hub-Signature-256` |
| `OPENAI_API_KEY` | OpenAI image moderation and edits |
| `RAZORPAY_KEY_ID` | Server-side Payment Link API authentication; use a `rzp_test_` key for testing |
| `RAZORPAY_KEY_SECRET` | Server-side Payment Link API authentication |
| `RAZORPAY_WEBHOOK_SECRET` | HMAC verification for `/webhooks/razorpay` |
| `SUPABASE_SERVICE_ROLE_KEY` | Worker-only authentication for private Storage operations; never ship it to a client |

Non-secret Wrangler settings include `SUPABASE_URL`, `SUPABASE_STORAGE_BUCKET`, `OPENAI_IMAGE_MODEL=gpt-image-2.5-flare`, `OPENAI_IMAGE_QUALITY=low`, `PERSON_DETECTION_THRESHOLD=0.5`, `MAX_GENERATION_ATTEMPTS=2`, `WORKING_IMAGE_MAX_DIMENSION=1024`, `ORIGINAL_IMAGE_RETENTION_DAYS=30`, `GENERATED_IMAGE_RETENTION_DAYS=30`, `BLOCKED_IMAGE_RETENTION_HOURS=24`, and `DELIVERY_TIMEOUT_HOURS=24`. The person threshold accepts values from 0.01 to 1; generation attempts cannot exceed 2.

```powershell
npx wrangler secret put WHATSAPP_VERIFY_TOKEN
npx wrangler secret put WHATSAPP_ACCESS_TOKEN
npx wrangler secret put WHATSAPP_PHONE_NUMBER_ID
npx wrangler secret put WHATSAPP_APP_SECRET
npx wrangler secret put OPENAI_API_KEY
npx wrangler secret put RAZORPAY_KEY_ID
npx wrangler secret put RAZORPAY_KEY_SECRET
npx wrangler secret put RAZORPAY_WEBHOOK_SECRET
npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY
```

Paste secrets only into the prompted terminal inputs. Do not put tokens in command arguments, tracked files, logs or chat. The Worker requires the app secret and never falls back to unauthenticated webhooks.

## Local development and migrations

Node.js 22 or newer is recommended. From this directory:

```powershell
npm ci
Copy-Item .dev.vars.example .dev.vars
# Edit .dev.vars locally with test Meta/OpenAI values and Supabase URL, private bucket and service-role key for live API calls.
npm run db:migrate:local
npm run typecheck
npm test
npm run lint
npm run validate:worker
npm run dev
```

Wrangler uses local D1/Queues by default and persists local state under ignored `.wrangler/`. Supabase Storage calls are isolated behind `src/storage.ts`; automated tests use an in-memory private-storage fake and mocked REST calls, so they require no Supabase credentials and consume no API credits. Safe synthetic image fixtures are used, with no prohibited media in the repository.

To test verification locally:

```powershell
Invoke-WebRequest 'http://localhost:8787/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=YOUR_LOCAL_VERIFY_TOKEN&hub.challenge=1234'
```

Meta requires a publicly reachable HTTPS callback. A local Worker alone cannot receive Meta webhooks; use an approved HTTPS tunnel or deploy a test Worker once authorized. Do not use `--remote` accidentally during local development. Scheduled recovery can be exercised locally at `http://127.0.0.1:8787/cdn-cgi/local/scheduled` while Wrangler dev runs.

## Deployment (only when explicitly authorized)

After resource creation, database ID replacement and secret configuration:

```powershell
npm run db:migrate:remote
npm run deploy
```

Configure Meta's callback with the deployed HTTPS URL, verify the challenge and subscribe to `messages`. Use `npx wrangler tail` for sanitized application logs. Do not enable request body logging in upstream gateways. Deploy dry-run is validation only and publishes nothing.

## Manual end-to-end test

1. Configure all secrets, Cloudflare AI/Images access and Meta webhook subscriptions; apply the remote migration and deploy an authorized test Worker.
2. Send one ordinary product image, then one with a cluttered background. Confirm each returned image still shows the same product, labels, shape and color. Inspect final JPEGs before broader use.
3. Send an image containing a person. Verify a neutral product-only refusal, `blocked_input`, a minimal abuse event, unchanged credits, and no OpenAI image-edit request.
4. In a safe test harness, mock `omni-moderation-latest` as sexual/explicit and confirm the input is blocked before image generation. If separately authorized to run an end-to-end prohibited-content check, use only a privately held, approved test fixture in an isolated account; do not attach or put the media in this repository.
5. For a clean product image, confirm moderation and person detection ran both before and after editing, the generated/final files exist in the private Supabase bucket, and WhatsApp returned the JPEG image.
6. Inspect D1: first successful delivery moves free credits from 5 to 4; later images use remaining free credits before paid credits. A job remains `sending` before its delivered/read receipt. Replaying that receipt must not double-charge.
7. Test zero-credit, generation/API outage and unsafe-output cases in a test account; confirm none deduct. Check account-specific AI/Images billing before real generation.
8. If a business has a logo key under `brands/{business_id}/`, verify that exact asset is overlaid; remove/omit it and verify successful unbranded output.
9. Check retention timestamps and private Supabase Storage access. Actual Meta, OpenAI, Workers AI and production Images behavior requires live-account verification; mocked tests do not establish live availability or output quality.

One successful image-processing run uses about **9 external service requests**, excluding webhook delivery callbacks or any separate Razorpay checkout: two Meta media-download requests, two OpenAI moderation calls, one OpenAI image edit, two Workers AI person detections, one Meta media upload, and one Meta image send. Cloudflare Images validation and normalization/branding run through its binding; original, generated and final files remain in private Supabase Storage. Retries add bounded requests. This is a call-count estimate, not a price estimate; verify availability, billing and API results with live accounts.

Example read-only queries (outputs contain private sender numbers; do not share them publicly):

```powershell
npx wrangler d1 execute growx-chitra-db --remote --command "SELECT id,status,failure_reason,attempts,attempt_count,input_bytes,output_bytes,final_bytes,generation_duration_ms,openai_request_id,usage_data FROM image_jobs ORDER BY created_at DESC LIMIT 10"
npx wrangler d1 execute growx-chitra-db --remote --command "SELECT business_id,free_remaining,paid_remaining FROM credits"
```

## Security and scope limits

Growx Chitra blocks sexual/explicit flagged content and any person detection above the configured confidence threshold. V1 processes product-only images; face swaps, deepfakes and identity manipulation are not separately classified. Models can miss unsafe content. Keep human review and rollout limits in place. See Scope 4 below for current deletion, retention and rate-limit behavior.

Webhooks are authenticated before parsing; bodies are capped at 1 MiB. Media is capped at 5 MiB and verified against Meta's SHA-256, strict image signatures and Cloudflare Images decoding/dimensions. Download URLs are restricted to HTTPS Meta domains and redirects are refused. Logs contain internal IDs and sanitized error codes, never API keys, phone numbers or image bytes.

Before public rollout, settle the retention/deletion policy, add per-business rate limits and operational alerting, and verify WhatsApp customer-service-window behavior. The normal path makes 3 OpenAI requests (input moderation, edit, output moderation) and 2 Workers AI inferences. Missing/expired credentials or Cloudflare resources prevent live verification.

Official references: [Razorpay Create a Standard Payment Link](https://razorpay.com/docs/api/payments/payment-links/create-standard/?preferred-country=IN) (API fields and INR minor-unit amounts), [Razorpay webhook security](https://security.razorpay.com/security/checklist/) (HMAC validation), [Cloudflare Wrangler configuration](https://developers.cloudflare.com/workers/wrangler/configuration/), [D1 transactional batches](https://developers.cloudflare.com/d1/worker-api/d1-database/), [Queues local development](https://developers.cloudflare.com/queues/configuration/local-development/), [Meta media API](https://developers.facebook.com/docs/whatsapp/cloud-api/reference/media/), [Meta webhook signatures](https://developers.facebook.com/docs/graph-api/webhooks/getting-started/).

## Marketing site

The public-facing site is a static Astro + TypeScript + Tailwind site; it has no backend. Run `npm run site:dev` locally, build it with `npm run site:build`, or preview the built output with `npm run site:preview`. Set `PUBLIC_WHATSAPP_URL` at build time to the public Growx Chitra WhatsApp chat link so the site's try/support buttons open the right conversation. The static pages are `/`, `/pricing`, `/privacy`, `/terms`, `/refund`, `/acceptable-use`, `/help`, and `/support`. The home-page product demo is a rendered 9-second video. Its separate Remotion source and render commands are in `demo-video/`; only the WebM, MP4 and poster in `public/video/` are served to site visitors.

## Scope 4 onboarding, privacy and operations

Scope 4 adds deterministic WhatsApp onboarding and brand commands, optional queued logo setup, privacy/terms/support commands, confirmed account deletion, HMAC deletion markers, configurable image and safety-event retention, scheduled private Supabase Storage cleanup, per-business rate limits, image dimensions and upload limits, suspension checks and production webhook configuration validation. The current stack keeps Workers, D1, Queues, Workers AI and Images on Cloudflare, and stores every product/brand image in the private Supabase Storage bucket. Scope 4 operational behavior and the launch checklist are documented in [OPERATIONS-SCOPE4.md](./OPERATIONS-SCOPE4.md). Apply migrations `0005_scope4.sql` and `0006_brand_logo_prompt.sql` to each intended environment before deploying this version. Historical D1 column names ending in `_r2_key` are retained unchanged per the no-D1-schema-change requirement; application types expose them as generic storage keys.
