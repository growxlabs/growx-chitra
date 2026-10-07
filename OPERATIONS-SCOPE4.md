# Scope 4 operations and launch notes

## WhatsApp flows

New numbers get five lifetime free credits. A first ordinary text receives the welcome and configured Terms/Privacy links; a first image can proceed without a brand profile and gets the same notice. `help`, `credits`, `plans`, `buy`, `payment status`, `brand`, `brand status`, `setup brand`, `change logo`, `change colour`, `change style`, `remove logo`, `privacy`, `terms`, `support`, `delete my data`, `confirm delete`, and `cancel` are deterministic commands. Brand setup is conversational; a business can skip its logo. Logo media goes to a dedicated queue and passes file validation, moderation and person detection before it is stored privately.

## Privacy, deletion and retention

Deletion requires `DELETE MY DATA` followed by `CONFIRM DELETE` within 15 minutes; `CANCEL` withdraws an unconfirmed request. Cron processes confirmed deletion in bounded business batches, enumerates only that business's `originals/`, `generated/`, `final/`, and `brands/` prefixes in Supabase Storage, then anonymizes account/job content while preserving financial ledger and payment reconciliation fields. It HMACs the normalized WhatsApp number with `BUSINESS_IDENTITY_SECRET` into a minimal marker so deletion does not renew the lifetime trial. Configure a durable high-entropy secret before production; without it, tombstones cannot stop trial re-enrollment after deletion. Failed Supabase Storage/D1 cleanup remains `deletion_pending` and retries on the next five-minute Cron run.

Original and generated/final image retention default to 30 days; blocked inputs default to 24 hours; minimal safety event rows default to 30 days. The scheduled handler deletes Supabase Storage objects before clearing their D1 keys/expiry state. Missing objects are harmless; a failed deletion leaves the expiry record for retry. Active brand logos are excluded from image retention and remain until replaced/removed or the account is deleted. Rate event rows are cleared after 24 hours. Blocked image bytes are not persisted by the safety pipeline unless they were already uploaded as the job source; those expire on the blocked-image schedule.

## Limits and suspension

Development defaults: 12 images/business/hour, 20 commands/business/minute, 3 plan/payment-link requests/business/hour, 10 brand-setup attempts/business/hour, 5 MiB upload, 8000 pixels per dimension. Tune via `MAX_IMAGES_PER_HOUR`, `MAX_COMMANDS_PER_MINUTE`, `MAX_PAYMENT_LINKS_PER_HOUR`, `MAX_BRAND_SETUP_ATTEMPTS_PER_HOUR`, `MAX_UPLOAD_BYTES`, `MAX_IMAGE_WIDTH`, and `MAX_IMAGE_HEIGHT`. Duplicate webhook message IDs do not consume a second rate slot. Manually suspend with `UPDATE businesses SET account_state='suspended',status='blocked' WHERE id='…'`; restore with `UPDATE businesses SET account_state='active',status='active' WHERE id='…'`. Suspended and deletion-pending accounts are checked again by the queued pipeline, and can still request data deletion.

## Environments and required configuration

Use independent local, staging and production D1 databases and Cloudflare Queues, plus isolated Supabase projects/private Storage buckets, Meta phone numbers/tokens, and Razorpay test/live credentials. Local Wrangler bindings are separate from remote resources; never use `--remote` in routine local work. Staging should use Meta test numbers where available and Razorpay test credentials. Configure a separately scoped Cloudflare environment and Worker secret set for staging/production before deployment; this repository contains resource placeholders only.

Production webhook handling returns 503 until the following are set: `WHATSAPP_VERIFY_TOKEN`, `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_APP_SECRET`, `OPENAI_API_KEY`, `OPENAI_IMAGE_MODEL`, Razorpay settings, legal/support URLs, `BUSINESS_IDENTITY_SECRET`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_STORAGE_BUCKET`, retention values, and rate/image limits. Missing configuration logs one generic event and never names a secret. The service-role key is only used by Worker-side `src/storage.ts`; no client, user message or signed URL receives it. `GET /health` returns only `{ "status": "ok" }`.

Create the Supabase bucket in the Supabase Dashboard because this repository has no project credentials. Set it to **Private**, use `growx-chitra-private` (or keep `SUPABASE_STORAGE_BUCKET` in sync), and allow only JPEG, PNG and WebP with a file limit at least `MAX_UPLOAD_BYTES`. A single private bucket uses separate tenant-prefixed `originals/`, `generated/`, `final/`, and `brands/` paths. The project does not make public URLs or create signed URLs; the Worker reads the private objects and uploads final bytes to Meta itself. No Supabase browser/client key is included in Worker code.

## Idempotency, isolation and observability

Unique WhatsApp message IDs protect image jobs and rate events. Durable safety checkpoints and Supabase Storage object keys avoid repeat model work on recoverable jobs; generation attempts are bounded. Credit reservation plus ledger uniqueness and verified Meta delivered/read receipts prevent duplicate charges. Razorpay provider event IDs and purchase references prevent duplicate grants. Brand jobs use a unique inbound message ID, deterministic business-prefixed object keys, and a completion state. Deletion is repeatable and preserves payment/credit reconciliation.

Business IDs come from the WhatsApp sender lookup; user input never selects a tenant. Every object key has a business prefix, and branding verifies that prefix before reading. The Supabase bucket must remain private; Meta receives media uploads by temporary media ID, never permanent storage URLs. Logs contain structured stage/status/business/job identifiers and error categories; tokens, message content, phone numbers, and image bytes must not be logged. Check Cloudflare invocation, queue retry and Cron failures, `production_configuration_missing`, `retention_cleanup`, `account_deletion`, and payment result events. Alerting thresholds are an operator responsibility and should be configured before launch.

The existing D1 tables retain their historical `*_r2_key` column names because this migration is storage-only and must not alter the D1 schema. Runtime TypeScript exposes these values through generic `*_storage_key` fields; no R2 binding or R2 API remains. Cloudflare D1 continues to own those paths and all account/job/credit/payment data.

## Manual test matrix

| Scenario | Expected result |
| --- | --- |
| New number sends text | Welcome and legal links once; five free credits exist |
| New number sends product image before brand setup | Clean default style; normal safety and delivery flow |
| Brand setup with logo | Logo safely validated, saved under its business prefix; setup proceeds to name, colour, style and logo choice |
| Invalid logo / invalid colour / invalid style | Safe retry prompt; no cross-tenant asset access |
| Brand status / remove logo | Shows settings only; removal affects future renderings |
| Privacy, terms and support | Configured links/contact, no internal data |
| Delete request without confirmation / cancellation | No deletion; state returns to active after cancel/expiry |
| Confirm deletion | Supabase Storage prefixes cleared, profile removed, account tombstoned, payment/ledger reconciliation retained |
| Repeat confirmed deletion/Cron | No duplicate financial effects; safe idempotent cleanup |
| Image original/generated expiry | Expired object removed and D1 key cleared; active logo remains |
| Rate burst | Requests over configured window are politely deferred; no duplicate slots |
| Manually suspended account | No queued/new image processing; support reply only |
| Different businesses' logo keys | Prefix check rejects attempted cross-tenant branding |
| Local/staging/production configs | Distinct credentials/resources; `/health` stays generic; production webhook missing config returns 503 |
| Product-only safety checks | Person/unsafe inputs blocked before generation and without credit deduction |

## Launch checklist

1. Create independent Cloudflare D1/Queue resources and a separate Supabase Storage private bucket for the target environment; update the D1 UUID and Supabase URL/bucket.
2. Configure environment-specific Wrangler vars and secrets, especially the Supabase service-role key and a random `BUSINESS_IDENTITY_SECRET`, legal/support URLs, retention and rate limits.
3. Apply migration 0005 in the chosen environment, then verify table/column presence with read-only D1 queries.
4. Configure Meta webhook challenge and message/status subscriptions; configure Razorpay webhook and confirm test/live mode aligns with the environment.
5. Run automated checks (`npm test`, `npm run typecheck`, `npm run lint`, `npm run validate:worker`) and review their outputs.
6. Deploy only after authorized release approval; verify `/health`, a welcome, one safe test product image, receipt-based credit debit, brand flow, retention cleanup and confirmed deletion.
7. Confirm Cloudflare logs, queue retries, Cron execution, billing and support escalation coverage before expanding access.

Scope 4 does not add dashboard/admin UI, inventory/ERP, subscriptions, social publishing, analytics, or additional image models. A live Meta/OpenAI/Cloudflare/Razorpay E2E was not performed by repository tests and must be verified in isolated accounts.
