# Arc Gift App

Next.js app for funding, sharing, claiming, and reclaiming time-limited USDC gifts on Arc Testnet.

## Auth and wallets (Circle)

This app uses **Circle user-controlled wallets** with **Google** sign-in (Programmable Wallets Web SDK). Configure Circle Console (User Controlled → Configurator) with your Google OAuth Web client id, and add env vars below.

**Privy has been removed.** Users who signed in with Privy before must **sign in again with Google** after deploy; wallet addresses from Privy are **not** migrated.

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create local env file from template:

```bash
cp .env.example .env.local
```

3. Fill required secrets and addresses in `.env.local`.

4. Run locally:

```bash
npm run dev
```

5. Optional local Redis:

```bash
docker compose up -d redis
```

## Environment variables

### Required in most environments

- `NEXT_PUBLIC_CIRCLE_APP_ID`: Circle User Controlled **App ID** (Configurator).
- `NEXT_PUBLIC_GOOGLE_CLIENT_ID`: Google OAuth **Web** client id (authorized redirect URIs must include your app origin, e.g. `http://localhost:3000`).
- `CIRCLE_API_KEY`: Circle **Standard** API key (server only; used by `/api/circle`).
- `RPC_URL`: Arc RPC endpoint.
- `PRIVATE_KEY`: Relayer private key used by server API routes.
- `CONTRACT_ADDRESS`: Deployed gift contract address.
- `NEXT_PUBLIC_CONTRACT_ADDRESS`: **Same** gift contract address as `CONTRACT_ADDRESS`, exposed to the browser so the sender can **approve USDC** for that contract before creating a gift.
- `ADMIN_DASHBOARD_PASSWORD`: Password for admin dashboard login.

**Gift funding model:** USDC is pulled **from the sender’s Circle wallet** (`transferFrom` on the gift contract). The relayer (`PRIVATE_KEY`) **only pays gas** for `fundGift` / reclaim / claim relayed calls. You must **redeploy** the gift contract from the updated `VibeLinkGift.sol` so on-chain logic matches this model.

### Optional

- `NEXT_PUBLIC_CIRCLE_BASE_URL`: Override Circle API base (default `https://api.circle.com`).
- `NEXT_PUBLIC_FACEBOOK_APP_ID`: Enables Messenger share link.
- `USDC_CONTRACT_ADDRESS`: Defaults to Arc testnet USDC address.
- `CLAIM_RATE_LIMIT_PER_MINUTE`: Claim API rate limit (default `12`).
- `CLAIM_AUDIT_LOG_PATH`: Path for claim audit log file.
- `SENDER_GIFT_LOG_PATH`: Path for sender gifts audit log file.
- `ADMIN_AUDIT_LOG_PATH`: Path for admin auth audit log file.
- `PRODUCT_ANALYTICS_LOG_PATH`: Path for funnel analytics events log file.
- `ALERT_WEBHOOK_URL`: Optional Slack/Telegram-compatible webhook for funnel alerts.
- `ALERT_WEBHOOK_COOLDOWN_MINUTES`: Alert repeat cooldown (default `30`).
- `ADMIN_SESSION_SECRET`: Overrides admin session signing secret.
- `UPSTASH_REDIS_REST_URL`: Enables persistent claim rate-limit/idempotency storage.
- `UPSTASH_REDIS_REST_TOKEN`: Auth token for Upstash REST API.

## Scripts

- `npm run dev`: start Next.js dev server.
- `npm run build`: build production bundle.
- `npm run start`: start production server.
- `npm run lint`: run ESLint with zero warnings policy.
- `npm run test`: run integration tests for critical gift and claim flows.
- `npm run logs:rotate`: archive and rotate local audit/telemetry logs.

## Operational checks

- Health endpoint: `GET /api/health`
- Expected HTTP `200` in healthy state, `503` when RPC/env checks fail.
- If Upstash env vars are missing, app still works with in-memory fallback but health response marks redis check as degraded.

## Funnel telemetry

- Events are ingested through `POST /api/analytics`.
- Stored in JSONL format at `PRODUCT_ANALYTICS_LOG_PATH` (default `.logs/product-analytics.log`).
- Tracked events:
  - `create_open`
  - `gift_funded`
  - `status_open`
  - `claim_success`
- Enrichment fields:
  - `source` (from `utm_source`)
  - `campaign` (from `utm_campaign`)
  - `referrer` (from browser referrer)
  - `variant` (A/B experiment variant)
- Additional quality/retention events:
  - `wallet_open`
  - `claim_error`
  - `reclaim_click`

## Funnel runbook

- Open `/admin` and review:
  - `Funnel (24h / 7d)`
  - `Top sources (24h)`
  - `Cohorts by source + campaign + day (7d)`
  - `Quality signals (24h)`
  - `Alerts` section for drop-off warnings.
- Suggested thresholds:
  - Investigate if `fund rate < 25%` with at least 20 opens/day.
  - Investigate if `claim rate < 35%` with at least 15 funded/day.
- Log retention:
  - Rotate `.logs/product-analytics.log` periodically (daily/weekly) based on traffic.
  - Archive rotated logs before cleanup if long-term trend analysis is needed.
  - Use `npm run logs:rotate` for local/manual rotation.
- Optional outbound alerts:
  - Set `ALERT_WEBHOOK_URL` to send funnel drop alerts externally.
  - `ALERT_WEBHOOK_COOLDOWN_MINUTES` prevents duplicate spam.

## Deploy runbook

- Verify env values are set in target environment.
- Call `GET /api/health` before opening traffic.
- Confirm claim logs in `.logs/claim-audit.log`, admin logs in `.logs/admin-audit.log`, and funnel logs in `.logs/product-analytics.log`.
- For production scale, use Upstash Redis to persist claim idempotency and rate limit state across restarts.

