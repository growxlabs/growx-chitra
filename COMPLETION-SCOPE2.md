# Scope 2 completion report

> Storage update: this report records the original Scope 2 implementation. Current image/file storage is private Supabase Storage; current setup instructions are in `README.md` and `OPERATIONS-SCOPE4.md`. Historical D1 columns named `*_r2_key` remain to preserve the schema, but the active Worker has no R2 binding or API.

## Result

Growx Chitra now processes product photos through a WhatsApp-only workflow: private intake, fail-closed input safety checks, constrained source-image editing, deterministic optional branding, output safety checks, and a WhatsApp image reply. Credits are held in a reservation during work and charged once only after a verified Meta delivered/read receipt. The implementation extends the existing Scope 1 foundation and preserves existing onboarding/job rows through migration 0002.

No dashboard, mobile/web UI, payment provider, public image endpoint, or production deployment was added.

## What changed

- `src/safety.ts`, `src/openai.ts`, `src/images.ts`, `src/binary.ts`, `src/config.ts`: decoded-image validation, OpenAI moderation and image edits, Workers AI person detection, normalization and deterministic logo/frame composition, runtime settings.
- `src/pipeline.ts`, `src/credits.ts`, `src/store.ts`, `src/whatsapp.ts`, `src/webhook.ts`, `src/index.ts`, `src/types.ts`: durable processing stages, private R2 artifacts, reservations and delivery receipt handling, image upload/send, receipt parsing, scheduled recovery.
- `src/prompts/product-cleanup.ts`: fixed product-only cleanup prompt; no user-authored image prompts.
- `migrations/0002_processing.sql`, `migrations/0003_final_delivery_metrics.sql`: additive state/metrics, receipt and reservation records, and database-enforced exactly-once delivery charge rules while carrying forward Scope 1 jobs.
- `wrangler.jsonc`, `.dev.vars.example`, `README.md`: AI and Images bindings, safe defaults, setup and operating instructions.
- `tests/foundation.test.ts`: safety outcomes, OpenAI edit request, reservations, send-vs-delivery accounting and failure paths added to the existing tests.

## Processing and safety behavior

1. Webhook authenticity and image type/size/signature are checked. Supported files are JPEG, PNG and WebP; decoded validation and normalization run through the Cloudflare Images binding.
2. OpenAI `omni-moderation-latest` and Workers AI `@cf/facebook/detr-resnet-50` inspect the input. A moderation flag, person detection at/above the configured confidence, malformed response, or unavailable safety service stops processing (fail-closed). A blocked input receives a neutral refusal and no image-edit request.
3. OpenAI `/v1/images/edits` receives one normalized source image and the fixed prompt. The default model is `gpt-image-2.5-flare`, low quality, one output, 1024 square; generation is limited to two persisted attempts.
4. Branding uses the business’s private R2 logo when configured and a deterministic composition; missing logo means unbranded output. Output is moderated and person-screened again. Unsafe outputs are removed.
5. A final JPEG is uploaded to Meta and sent in WhatsApp. A verified delivered/read callback atomically charges one free credit first, otherwise one paid credit. Duplicate callbacks cannot charge twice. Ambiguous sends are not retried automatically; delivery timeout releases no credit and remains reconcilable for up to seven days.

## Verification completed

- `npm test`: 53 tests passed across 2 test files.
- `npm run typecheck`: passed.
- `npm run lint`: passed.
- `npm run db:migrate:local`: migrations 0001, 0002 and 0003 applied to local D1.
- `npm run validate:worker`: dry-run bundle passed with D1, R2, Queue, Workers AI and Images bindings.
- `npm audit`: 0 known vulnerabilities reported during the dependency check.

Tests use isolated local D1/R2 and mocked Meta, OpenAI, Workers AI and Images services. They validate request flow and accounting logic, not live vendor availability, model accuracy or the quality of generated images.

## Live setup still required

The Cloudflare account must provide the configured D1 database, private R2 bucket, Queue, Workers AI access and Images binding availability. Replace the placeholder D1 UUID before remote migrations. Configure the WhatsApp callback and `messages` subscription in Meta. Set the five secrets shown in `.dev.vars.example`/README: `WHATSAPP_VERIFY_TOKEN`, `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_APP_SECRET`, and `OPENAI_API_KEY`. Run the documented manual end-to-end checklist with a test number and inspect real outputs before rollout.

No credentials were present, no production resources were created or changed, and no live API call or deployment was performed. The workspace has no Git metadata (`git rev-parse` reports that it is not a repository), so a Git diff/status could not be produced. The prior Scope 1 completion report remains at `COMPLETION.md`.

## Known limits

- Person and content classifiers can miss unsafe content or changed product details; neither guarantees semantic preservation. V1 does not provide a separate face-swap/deepfake classifier. Keep human review and conservative rollout limits.
- `retention_until` is metadata only. Automated R2 deletion, account deletion, `DELETE MY DATA`, per-business rate limits, and operational alerting are outside this scope.
- Cloudflare Images binding transformations and logo composition, Meta delivery receipts, external API behavior, billing and final image quality still need live-account verification.

## Suggested next step

Configure the external test resources and secrets, apply the remote migrations, deploy only under an explicitly authorized live test, and execute the manual checklist in `README.md`.
