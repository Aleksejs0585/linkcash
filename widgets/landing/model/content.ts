export const LANDING_STEPS = [
  {
    num: "01",
    icon: "💸",
    title: "Fund the gift",
    text: "Sign in, enter amount and expiry. USDC is locked in a gift contract on Arc.",
  },
  {
    num: "02",
    icon: "🔗",
    title: "Share the link",
    text: "A unique claim link is generated — send it via Telegram, WhatsApp, email, or any messenger.",
  },
  {
    num: "03",
    icon: "👤",
    title: "Recipient logs in",
    text: "One click with Google. A Circle embedded wallet is created automatically — no seed phrases.",
  },
  {
    num: "04",
    icon: "✅",
    title: "Funds arrive",
    text: "Relayer submits the claim gaslessly. USDC lands in wallet in under a second. Verifiable onchain.",
  },
] as const;

export const LANDING_USE_CASES = [
  {
    icon: "🎁",
    title: "Gifts & Payments",
    text: "Send money to friends and family for birthdays, travel, or splitting bills — no bank account required.",
    tag: "Personal",
  },
  {
    icon: "🚀",
    title: "Growth Campaigns",
    text: "Reward referrals, activate new users, or run social campaigns — distribute USDC at scale via links.",
    tag: "Marketing",
  },
  {
    icon: "💼",
    title: "Creator Payouts",
    text: "Pay contributors, freelancers, or community moderators globally — they claim when ready, no wallet setup.",
    tag: "Business",
  },
] as const;

export const LANDING_CLAIM_FEATURES = [
  {
    title: "No seed phrase",
    text: "Circle's embedded wallet is created silently on first login",
  },
  {
    title: "No gas to pay",
    text: "A relayer covers the transaction fee — recipient pays nothing",
  },
  {
    title: "Verifiable onchain",
    text: "Every claim is recorded on Arc — check the tx hash in explorer",
  },
  {
    title: "Expiry protection",
    text: "Unclaimed funds automatically return to sender after expiry",
  },
] as const;

export const LANDING_FAQ = [
  {
    q: "What happens if the recipient never claims?",
    a: "After the expiry time you set (in hours), the gift contract allows you to reclaim your USDC directly from the sender dashboard. Funds never get stuck.",
  },
  {
    q: "How does the recipient get a wallet without setup?",
    a: "LinkCash uses Circle User-Controlled Wallets. When a recipient signs in with Google for the first time, a non-custodial wallet is created silently in the background — no seed phrase, no browser extension required.",
  },
  {
    q: "Who pays the gas fee for the claim?",
    a: "A relayer covers the gas on behalf of the recipient. Since Arc uses USDC as gas and fees are around $0.01, this is sustainable. The recipient pays absolutely nothing.",
  },
  {
    q: "Can the recipient export their wallet?",
    a: "Yes. Circle's embedded wallets are non-custodial. Recipients can export their private key from the wallet page at any time and import it into MetaMask or any other EVM-compatible wallet.",
  },
  {
    q: "Is this on mainnet?",
    a: "Currently running on Arc Testnet with testnet USDC (no real value). Mainnet launch is planned to coincide with Arc's mainnet launch. Get testnet USDC at faucet.circle.com.",
  },
] as const;
