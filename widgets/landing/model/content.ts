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
    icon: "🎂",
    title: "Birthday gift",
    text: "Send $25 to a friend. They get a link, tap it, sign in with Google — money in their wallet in 30 seconds. No crypto knowledge needed.",
    tag: "Personal",
  },
  {
    icon: "🍕",
    title: "Split a bill",
    text: "Paid for the whole dinner? Send everyone a \"pay me back\" link. They claim USDC directly to their wallet, no Venmo account required.",
    tag: "Personal",
  },
  {
    icon: "💼",
    title: "Pay a freelancer",
    text: "Your contractor doesn't have a crypto wallet? Just send a link. They claim $500 USDC with one Google sign-in, no setup, no exchange.",
    tag: "Business",
  },
  {
    icon: "🏆",
    title: "Reward community",
    text: "Run a giveaway or reward top contributors. Distribute 100 gift links at once — each person claims independently, no spreadsheets.",
    tag: "Web3",
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
    q: "Is this safe? Where do my funds go?",
    a: "USDC is locked in a verified smart contract on Arc — not held by us. The contract code is open source. Only the recipient (who has the secret link) can claim. If unclaimed, you get it back after expiry. We never touch your funds.",
  },
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
    q: "Can someone steal my gift link?",
    a: "The claim secret lives only in the URL fragment (#) — it never reaches our servers and is not stored anywhere. Only someone with the exact full link can claim. Treat it like cash.",
  },
  {
    q: "Is this on mainnet?",
    a: "Currently running on Arc Testnet with testnet USDC (no real value). Mainnet launch is planned to coincide with Arc's mainnet launch. Get testnet USDC at faucet.circle.com.",
  },
] as const;
