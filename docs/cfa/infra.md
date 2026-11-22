# CFA Lab infrastructure and deploy

Everything is Amplify Gen 2 in code. No SSR compute-role change, no Hosting secret, and no required env var. See [ADR 0014](../adr/0014-cfa-question-content-private-storage.md) for why content stays in private storage.

## Resources

| Resource | Where | Notes |
|----------|-------|-------|
| Data models `CfaQuestion`, `CfaAttempt`, `CfaReviewState`, `CfaFlag` | `amplify/data/resource.ts` | `allow.authenticated()` only. `CfaReviewState` is keyed by `questionId`. |
| Mutation `startCfaAssist` | `amplify/data/resource.ts` | Async (Event) handler → `cfa-assist`. Returns `{ success }` immediately. |
| Storage bucket `cfaScreenshots` | `amplify/storage/resource.ts` | Authenticated read/write/delete on `screenshots/*`; read/delete on `assist/*`. The function reads `screenshots/*` and writes `assist/*`. |
| Function `cfa-assist` | `amplify/functions/cfa-assist/` | Node Lambda, 300 s timeout, 1 GB. Bedrock `InvokeModel` with Anthropic's Messages body and base64 image blocks. |
| Bedrock IAM | `amplify/backend.ts` | Same `bedrock:InvokeModel` grant as Job OS Fit Insight (foundation models + inference profiles). |

### Object keys (`cfaScreenshots`)

| Key | Purpose |
|-----|---------|
| `screenshots/{captureId}/{n}.png\|jpg` | Capture screenshots, kept on the Question (`screenshotKeys`). Phone screenshots over 2400 px or 3.5 MB are scaled and re-encoded as JPEG in the browser first. |
| `assist/{jobId}.json` | `{ status: 'done', output }` or `{ status: 'error', message }` from `cfa-assist`. The Lab polls every 2 s for up to 3 minutes, then deletes it. |

The function gets the bucket name from the `CFA_SCREENSHOTS_BUCKET_NAME` env var that Amplify sets for the storage grant.

## Model

Default: Claude Haiku 5.5, model id `anthropic.claude-haiku-5-5`, region `us-east-1`. Claude Haiku 5.5 is served on `bedrock-runtime` through `InvokeModel` (not the Converse API), so the function sends Anthropic's Messages body (`anthropic_version: bedrock-2023-05-31`) with the screenshots as base64 image blocks. It sends no `temperature` (current Claude models reject sampling parameters), reads the reply's `text` blocks by type (the model thinks by default, so a reply can start with `thinking` blocks), and turns a `refusal` or `max_tokens` stop into an error message. `max_tokens` is 16,000 because thinking counts towards it and multi-part questions repeat the shared scenario in every part.

Until November 2026 the default was Meta Llama 4 Maverick (`us.meta.llama4-maverick-17b-instruct-v1:0`) through Converse. Bedrock then marked it Legacy and refused calls from accounts that had not used it in 30 days.

Override at deploy time with Amplify env vars read while the backend synthesises:

| Variable | Default | Notes |
|----------|---------|-------|
| `CFA_BEDROCK_MODEL_ID` | `anthropic.claude-haiku-5-5` | A Claude model on Bedrock that accepts images: a base id (`anthropic.…`) or an inference profile (`us.anthropic.…`, `global.anthropic.…`). Any other model is refused with an error, because the function speaks the Messages body only. |
| `CFA_BEDROCK_REGION` | `us-east-1` | Region of the Bedrock runtime client. |

Changing only these env vars does **not** redeploy the backend: `scripts/amplify-backend-changed.ts` redeploys only when `amplify/` or backend packages change. Push any change under `amplify/` (or run `pipeline-deploy` by hand) after setting them.

## Deploy checklist

1. **Bedrock model access (once per account).** In the Bedrock console in `us-east-1`, open the model catalogue, find *Claude Haiku 5.5* and run one prompt with an image in the playground, signed in as an administrator. If Bedrock asks for Anthropic use-case details or shows a *Model access* page, complete it there. The function's role only has `bedrock:InvokeModel`, so it cannot accept those terms itself. The IAM grant already covers `arn:aws:bedrock:*::foundation-model/*` and inference profiles.
2. **Sandbox (optional, to test before production).**
   1. `npm ci`
   2. With AWS credentials for the account: `npx ampx sandbox` (creates a personal backend and writes `amplify_outputs.json`).
   3. The sandbox has its own Cognito user pool with self-sign-up disabled. Create your user in the Cognito console (*Create user*, email as username) or with `aws cognito-idp admin-create-user`, then set a permanent password.
   4. `npm run dev`, sign in at `/login`, open `/labs/cfa`.
   5. On a phone on the same network: set `DEV_ALLOWED_ORIGINS=<laptop LAN IP>` in `.env.local`, restart `npm run dev`, and open `http://<laptop LAN IP>:3000/labs/cfa`.
3. **Production.** Merge `develop` → `main`. Amplify’s backend phase sees `amplify/` changed and runs `pipeline-deploy`, which creates the bucket, function, tables and mutation. Nothing to attach by hand.
4. **Smoke test.** Capture one screenshot, check the extracted fields, confirm the answer, save; open the Question and its screenshot; answer it wrong in Practice and check it shows as due tomorrow.

## Without Amplify outputs

A build with no `amplify_outputs.json` (CI, or `npm run dev` before a sandbox) cannot sign in, so the Lab stays behind the sign-in gate; if it is reached anyway it shows a “not configured” message. Component tests use an in-memory store (`createMemoryCfaStore`) with placeholder questions.
