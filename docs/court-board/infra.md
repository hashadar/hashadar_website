# Court Board infrastructure

Court Board is the one public-write Lab ([ADR 0013](../adr/0013-court-board-public-lab.md)). It has its own DynamoDB table, a customer-managed IAM policy for it, and one shared Hosting secret. It adds nothing to the Job OS `a.schema`, and there are no Cognito users, API keys or guest IAM for Players or Organisers.

## What `amplify/backend.ts` creates

A custom `CourtBoard` stack (`amplify/court-board/resource.ts`):

| Resource | Notes |
|----------|-------|
| DynamoDB table | On-demand billing, TTL attribute `ttl`, point-in-time recovery, deletion protection, `RETAIN` removal policy. Key `pk` / `sk`. |
| `GSI1` | `gsi1pk` / `gsi1sk`: a Club's Sessions by date. |
| Managed policy | Only `dynamodb:GetItem`, `PutItem`, `UpdateItem`, `DeleteItem`, `Query`, `TransactWriteItems`, `ConditionCheckItem` on the table and `table/index/*`. |

Two values are exported to `amplify_outputs.json` under `custom`: `courtBoardTableName` and `courtBoardPolicyArn`.

## Table layout

| Item | `pk` | `sk` | Expires (`ttl`) |
|------|------|------|-----------------|
| Club | `CLUB#<clubId>` | `META` | never |
| Organiser token | `ORGTOKEN#<sha256>` | `META` | never (deleted on rotation) |
| Player | `CLUB#<clubId>` | `PLAYER#<phoneKey>` | never |
| Session | `SESSION#<sessionId>` | `META` (`gsi1pk` `CLUB#<clubId>`, `gsi1sk` `<localDate>#<sessionId>`) | never |
| Seat | `SESSION#<sessionId>` | `SEAT#<seatId>` | Session start + 8 weeks |
| Host lock | `SESSION#<sessionId>` | `HOST#<phoneKey>` | Session start + 8 weeks |
| Penalty | `CLUB#<clubId>` | `PENALTY#<phoneKey>#<sessionId>#<reason>` | `endsAt` |
| Throttle / counter | `RL#<key>` | `STATE` or the window id | end of the window |

The Penalty sort key includes the reason so a Player who late-cancels and then no-shows in the same Session gets two Penalties, not one overwritten.

Uniqueness is enforced by conditional writes, not by the application: the Host lock is created in the same transaction as the Host seat (one active Host seat per Player per Session), and the Host seat carries an `activeGuests` counter incremented under a condition (the Guest cap). Seats are soft-cancelled, never deleted, so the Order can be replayed for the Grace period.

DynamoDB deletes expired items within a few days of their `ttl`, not at the exact second. The rules read `endsAt` and Seat times directly, so late deletion changes nothing.

## One manual console step

The Amplify SSR Compute role lives outside Gen 2, so the policy is not attached automatically. This is the same one-time step WMW uses for SSM ([WMW snapshot storage](../wmw/snapshot-storage.md)).

1. Deploy once so `amplify_outputs.json` contains `custom.courtBoardPolicyArn` (or read it from the `CourtBoard` stack outputs in CloudFormation).
2. Amplify Console → App settings → IAM roles → Compute role → open the role in IAM.
3. Add permissions → Attach policies → attach the managed policy whose ARN is `courtBoardPolicyArn`.

Until this is done, the deployed pages cannot reach the table.

## Shared Hosting secret: `courtboard.pepper`

The pepper keys the HMAC of every phone number (`phoneKey`) and PIN. Create it once, shared across branches:

```bash
openssl rand -base64 48
```

Amplify Console → Hosting → Secrets → add `courtboard.pepper` with that value. At runtime the SSR compute role reads `/amplify/shared/{appId}/courtboard.pepper` (a branch path `/amplify/{appId}/{branch}/courtboard.pepper` is tried first). It needs 16+ characters; use 32+ random bytes.

**Losing or changing the pepper invalidates every `phoneKey` and every PIN.** Players would look new, their Penalties would stop matching, and nobody could cancel an existing Seat. Back it up somewhere safe and treat rotation as a reset of the whole Club.

## Create the Club

Run by the Site Admin with AWS credentials for this account:

```bash
npx tsx scripts/court-board-create-club.ts --name "Lunchtime Badminton" --venue "Sports hall" --start 09:00 --end 11:00
```

The table name comes from `--table`, `COURT_BOARD_TABLE`, or `amplify_outputs.json`. The script stores only the SHA-256 of the Organiser token and prints the Organiser link **once**. It cannot be shown again; if it is lost, an Organiser who still has access rotates it from the Organiser page, otherwise create a new Club. Give the link to the committee privately.

## SSR config

The Amplify build runs `npx tsx scripts/write-amplify-ssr-env.ts`, which writes `src/lib/court-board/court-board-ssr-config.ts` (app id, region and table name read from `amplify_outputs.json`; `COURT_BOARD_TABLE` overrides it). The committed file has `tableName: null`, which is what local development and CI use. The pepper is never written to build artefacts.

## Local development

With neither `COURT_BOARD_TABLE` nor `COURT_BOARD_PEPPER` set, `next dev` uses an in-memory store with a demo Club. To point local code at a real table instead, set both in `.env.local` and run with AWS credentials in your shell.

## Sandbox

```bash
npx ampx sandbox
```

creates a personal copy of the stack, including the Court Board table, and writes `amplify_outputs.json` with its name. Then:

1. Set `COURT_BOARD_PEPPER` in `.env.local`.
2. Create a Club in the sandbox table with the script above (`--origin http://localhost:3000`).
3. `npm run dev` and use the printed Organiser link.

Your shell needs credentials with access to the sandbox table; the managed policy is not attached to your own IAM user automatically.

## Status of the DynamoDB store

`src/lib/court-board/dynamo-store.ts` has unit tests against a recording fake client only: they pin down keys, conditional expressions and error mapping. It has **not** been exercised against a real DynamoDB table. Run through a full Session in `npx ampx sandbox` (sign-ups, a double tap, guests, cancel, close register, rotate link) before the first real Session.
