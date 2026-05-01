# Arc Gift App

Next.js app for funding, sharing, claiming, and reclaiming time-limited USDC gifts on Arc Testnet.

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

- `NEXT_PUBLIC_PRIVY_APP_ID`: Privy application id for wallet auth.
- `RPC_URL`: Arc RPC endpoint.
- `PRIVATE_KEY`: Relayer private key used by server API routes.
- `CONTRACT_ADDRESS`: Deployed gift contract address.
- `ADMIN_DASHBOARD_PASSWORD`: Password for admin dashboard login.

### Optional

- `NEXT_PUBLIC_FACEBOOK_APP_ID`: Enables Messenger share link.
- `USDC_CONTRACT_ADDRESS`: Defaults to Arc testnet USDC address.
- `CLAIM_RATE_LIMIT_PER_MINUTE`: Claim API rate limit (default `12`).
- `CLAIM_AUDIT_LOG_PATH`: Path for claim audit log file.
- `SENDER_GIFT_LOG_PATH`: Path for sender gifts audit log file.
- `ADMIN_AUDIT_LOG_PATH`: Path for admin auth audit log file.
- `ADMIN_SESSION_SECRET`: Overrides admin session signing secret.
- `UPSTASH_REDIS_REST_URL`: Enables persistent claim rate-limit/idempotency storage.
- `UPSTASH_REDIS_REST_TOKEN`: Auth token for Upstash REST API.

## Scripts

- `npm run dev`: start Next.js dev server.
- `npm run build`: build production bundle.
- `npm run start`: start production server.
- `npm run lint`: run ESLint with zero warnings policy.
- `npm run test`: run integration tests for critical gift and claim flows.

## Operational checks

- Health endpoint: `GET /api/health`
- Expected HTTP `200` in healthy state, `503` when RPC/env checks fail.
- If Upstash env vars are missing, app still works with in-memory fallback but health response marks redis check as degraded.

## Deploy runbook

- Verify env values are set in target environment.
- Call `GET /api/health` before opening traffic.
- Confirm claim logs in `.logs/claim-audit.log` and admin logs in `.logs/admin-audit.log`.
- For production scale, use Upstash Redis to persist claim idempotency and rate limit state across restarts.

