# LinkCash — Send USDC like a message

**Live demo:** [linkcash.app](https://linkcash.app) · **Testnet:** Arc L1 · **Stack:** Next.js, Circle Wallets, Solidity

---

## The Problem

Sending crypto to someone who doesn't have a wallet is broken.

You have to tell them: *"Install MetaMask, write down your seed phrase, add the Arc network, get some gas..."* — by that point they've given up.

## The Solution

LinkCash turns a crypto transfer into a link.

1. **Sender** creates a gift link in 30 seconds (Google or email sign-in, no seed phrase)
2. **Link** is shared via WhatsApp, Telegram, or any messenger
3. **Recipient** clicks the link, signs in with Google or email, gets a wallet instantly, and claims USDC — all in under 60 seconds

Or flip it: **Recipient** creates a payment request link, shares it with the sender, who pays in one click.

No seed phrases. No gas fees for the recipient. No crypto knowledge required.

---

## Architecture

```
Send flow:
Sender (Circle EOA wallet)
  │
  ├─ approve USDC + fundGift() ──► VibeLinkGift.sol (Arc Testnet)
  │                                       │
  └─ shares claim link (secret in #hash)  │
                                          │
Recipient opens link                      │
  │                                       │
  ├─ Google or email → Circle EOA wallet  │
  └─ claim(hash, recipientAddress) ───────┘
        (relayer pays gas)

Request flow:
Requester → /request → shareable pay link
Payer opens /pay/[id] → funds gift via Send flow → shares claim link with requester
Requester claims normally
```

**Key insight:** The gift secret is in the URL fragment (`#secret`) — it never hits the server. Only the `keccak256(secret)` is stored on-chain. The link IS the key.

---

## Smart Contract

`VibeLinkGift.sol` — deployed at `0x93fEF97173Af2Da909Fe83961421199B9dB17111` on Arc Testnet

```solidity
fundGift(bytes32 paymentIdHash, uint256 amount, address refundAddress, uint64 expiresAt)
claim(bytes32 paymentIdHash, address recipient)
reclaimExpiredGift(bytes32 paymentIdHash)
```

- **Gasless for recipient** — relayer calls `claim()` on behalf of recipient
- **Self-custodial** — USDC pulled directly from sender's Circle EOA wallet
- **Time-limited** — sender can reclaim if unclaimed after expiry
- **CEI pattern** — re-entrancy safe

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 15, Tailwind CSS, Framer Motion |
| Wallets | Circle Programmable Wallets (User-Controlled, EOA) |
| Auth | Google OAuth + email OTP via Circle SDK |
| Blockchain | Arc L1 Testnet (EVM-compatible) |
| Token | USDC (native on Arc) |
| Smart Contract | Solidity 0.8.x, no external dependencies |
| Relayer | Server-side ethers.js wallet pays gas |
| Storage | JSONL logs + optional Upstash Redis |

---

## Running Locally

```bash
npm install
cp .env.example .env.local
# fill in .env.local
npm run dev
```

### Required env vars

```env
NEXT_PUBLIC_CIRCLE_APP_ID=        # Circle App ID (Configurator)
NEXT_PUBLIC_GOOGLE_CLIENT_ID=     # Google OAuth Web client ID
CIRCLE_API_KEY=                   # Circle Standard API key
RPC_URL=https://rpc.testnet.arc.network
PRIVATE_KEY=                      # Relayer wallet private key
CONTRACT_ADDRESS=0x93fEF97173Af2Da909Fe83961421199B9dB17111
NEXT_PUBLIC_CONTRACT_ADDRESS=0x93fEF97173Af2Da909Fe83961421199B9dB17111
ADMIN_DASHBOARD_PASSWORD=         # Admin dashboard access
```

---

## Key Features

- **One-click onboarding** — recipient goes from zero to funded wallet in &lt;60s
- **Google or email sign-in** — no seed phrases, no extensions
- **No gas for recipient** — relayer covers all transaction fees
- **Link-based security** — secret in URL fragment, hash on-chain
- **Expiry + reclaim** — sender gets USDC back if unclaimed
- **Request / pull flow** — create a pay-me link, share it, payer funds in one click
- **Trust signals** — claim page shows funds locked in contract + auto-return timer before login
- **Viral loop** — after claiming, primary CTA nudges recipient to send a gift too
- **PWA** — installable on mobile, works offline
- **OG images** — dynamic per-gift previews for social sharing
- **Admin dashboard** — funnel analytics, claim audit log

---

## API Endpoints

| Endpoint | Description |
|----------|-------------|
| `POST /api/create-gift` | Fund gift + persist metadata |
| `POST /api/claim-gift` | Relay claim transaction |
| `POST /api/reclaim-gift` | Relay reclaim for expired gift |
| `GET /api/gift/[hash]` | Get gift details |
| `GET /api/sender-gifts` | Sender dashboard data |
| `GET /api/received-gifts` | Received gifts history |
| `POST /api/create-request` | Create a payment request link |
| `GET /api/request/[id]` | Fetch payment request details |
| `GET /api/health` | RPC + env health check |

---

## Scripts

```bash
npm run dev          # dev server
npm run build        # production build
npm run test         # integration tests
npm run logs:rotate  # rotate audit logs
node scripts/deploy-vibelink-gift.mjs  # deploy contract
```
