/**
 * Seed on-chain statistics for LinkCash demo.
 *
 * Env vars required:
 *   PRIVATE_KEY          - relayer/sender wallet private key (has USDC + ETH for gas)
 *   CONTRACT_ADDRESS     - gift contract address
 *   SEED_RECEIVER        - wallet address that receives claimed gifts (can equal sender)
 *
 * Optional:
 *   SEED_FUNDED    (default 40) - active funded gifts
 *   SEED_CLAIMED   (default 40) - immediately claimed gifts
 *   SEED_RECLAIMED (default 20) - funded then reclaimed (short expiry)
 *   SEED_AMOUNT    (default 0.01) - USDC per gift
 *   APP_URL        (default http://localhost:3000) - to persist metadata via API
 */

import { ethers } from "ethers";
import crypto from "crypto";

// ─── Config ──────────────────────────────────────────────────────────────────

const RPC_URL = "https://rpc.testnet.arc.network";
const USDC_ADDRESS = "0x3600000000000000000000000000000000000000";
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS;
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const RECEIVER = process.env.SEED_RECEIVER ?? null;
const APP_URL = (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");

const N_FUNDED = Number(process.env.SEED_FUNDED ?? 40);
const N_CLAIMED = Number(process.env.SEED_CLAIMED ?? 40);
const N_RECLAIMED = Number(process.env.SEED_RECLAIMED ?? 20);
const AMOUNT_USDC = process.env.SEED_AMOUNT ?? "0.01";

if (!CONTRACT_ADDRESS || !PRIVATE_KEY) {
  console.error("Missing CONTRACT_ADDRESS or PRIVATE_KEY");
  process.exit(1);
}

// ─── ABIs ─────────────────────────────────────────────────────────────────────

const GIFT_ABI = [
  "function fundGift(bytes32 paymentIdHash,uint256 amount,address refundAddress,uint64 expiresAt)",
  "function reclaimExpiredGift(bytes32 paymentIdHash)",
  "function gifts(bytes32 paymentIdHash) view returns (uint256 amount,address refundAddress,uint64 expiresAt,bool claimed)",
];

const CLAIM_ABI = [
  "function claim(bytes32 paymentIdHash,address receiver)",
];

const ERC20_ABI = [
  "function approve(address spender,uint256 amount) returns (bool)",
  "function balanceOf(address account) view returns (uint256)",
  "function allowance(address owner,address spender) view returns (uint256)",
  "function decimals() view returns (uint8)",
];

// ─── Fake names / messages for variety ───────────────────────────────────────

const SENDER_NAMES = [
  "Alex K.", "Maria S.", "John D.", "Emma W.", "Liam B.",
  "Sophie R.", "Noah M.", "Olivia T.", "James P.", "Ava L.",
  "Lucas H.", "Isabella C.", "Ethan N.", "Mia F.", "Aiden G.",
  "Charlotte V.", "Mason Z.", "Harper J.", "Logan E.", "Amelia O.",
];

const MESSAGES = [
  "Happy birthday! 🎉", "Thanks for everything!", "Enjoy your coffee ☕",
  "Just because 😊", "Congratulations! 🎊", "You deserve it!",
  "Happy holidays! 🎄", "For the pizza 🍕", "Miss you!", "Good luck! 🍀",
  null, null, null, // some gifts without messages
];

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateSecret() {
  return "0x" + crypto.randomBytes(32).toString("hex");
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// ─── Persist metadata via API (for landing feed + status page) ────────────────

async function persistMetadata({ paymentIdHash, amountUsdc, refundAddress, expiresInHours, senderDisplayName, giftMessage }) {
  try {
    const res = await fetch(`${APP_URL}/api/create-gift`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        paymentIdHash,
        amountUsdc,
        refundAddress,
        expiresInHours,
        senderDisplayName,
        giftMessage: giftMessage ?? undefined,
        syncClientFunding: false,
      }),
    });
    if (!res.ok) {
      const txt = await res.text();
      console.warn(`  metadata API non-ok: ${res.status} ${txt.slice(0, 100)}`);
    }
  } catch (e) {
    console.warn(`  metadata API error: ${e.message}`);
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const signer = new ethers.Wallet(PRIVATE_KEY, provider);
  const receiverAddress = RECEIVER ?? signer.address;

  const usdc = new ethers.Contract(USDC_ADDRESS, ERC20_ABI, signer);
  const gift = new ethers.Contract(CONTRACT_ADDRESS, GIFT_ABI, signer);
  const claimContract = new ethers.Contract(CONTRACT_ADDRESS, CLAIM_ABI, signer);

  const decimals = Number(await usdc.decimals());
  const amountRaw = ethers.parseUnits(AMOUNT_USDC, decimals);
  const total = N_FUNDED + N_CLAIMED + N_RECLAIMED;

  console.log(`Sender:   ${signer.address}`);
  console.log(`Receiver: ${receiverAddress}`);
  console.log(`Contract: ${CONTRACT_ADDRESS}`);
  console.log(`Gifts:    ${N_FUNDED} funded | ${N_CLAIMED} claimed | ${N_RECLAIMED} reclaimed`);
  console.log(`Amount:   ${AMOUNT_USDC} USDC each — total ${(total * Number(AMOUNT_USDC)).toFixed(4)} USDC\n`);

  // Check balance
  const balance = await usdc.balanceOf(signer.address);
  const needed = amountRaw * BigInt(total);
  if (balance < needed) {
    console.error(`Insufficient USDC. Have: ${ethers.formatUnits(balance, decimals)}, need: ${ethers.formatUnits(needed, decimals)}`);
    process.exit(1);
  }

  // Approve total in one tx
  const allowance = await usdc.allowance(signer.address, CONTRACT_ADDRESS);
  if (allowance < needed) {
    console.log("Approving USDC...");
    const approveTx = await usdc.approve(CONTRACT_ADDRESS, needed * 2n);
    await approveTx.wait();
    console.log("Approved.\n");
  }

  let funded = 0, claimed = 0, reclaimed = 0, failed = 0;

  // ── 1. FUNDED (active, 24h expiry) ──────────────────────────────────────────
  console.log(`--- Funding ${N_FUNDED} active gifts ---`);
  for (let i = 0; i < N_FUNDED; i++) {
    const secret = generateSecret();
    const hash = ethers.keccak256(secret);
    const expiresAt = Math.floor(Date.now() / 1000) + 24 * 3600;
    const name = pick(SENDER_NAMES);
    const msg = pick(MESSAGES);
    try {
      const tx = await gift.fundGift(hash, amountRaw, signer.address, expiresAt);
      await tx.wait();
      await persistMetadata({ paymentIdHash: hash, amountUsdc: AMOUNT_USDC, refundAddress: signer.address, expiresInHours: 24, senderDisplayName: name, giftMessage: msg });
      funded++;
      process.stdout.write(`  [${i + 1}/${N_FUNDED}] funded ✓\r`);
    } catch (e) {
      failed++;
      console.warn(`\n  funded #${i + 1} failed: ${e.message.slice(0, 80)}`);
    }
    await sleep(500);
  }
  console.log(`\nFunded: ${funded} ✓  ${failed > 0 ? `${failed} failed` : ""}`);

  // ── 2. CLAIMED ───────────────────────────────────────────────────────────────
  console.log(`\n--- Funding + claiming ${N_CLAIMED} gifts ---`);
  failed = 0;
  for (let i = 0; i < N_CLAIMED; i++) {
    const secret = generateSecret();
    const hash = ethers.keccak256(secret);
    const expiresAt = Math.floor(Date.now() / 1000) + 24 * 3600;
    const name = pick(SENDER_NAMES);
    const msg = pick(MESSAGES);
    try {
      const fundTx = await gift.fundGift(hash, amountRaw, signer.address, expiresAt);
      await fundTx.wait();
      await persistMetadata({ paymentIdHash: hash, amountUsdc: AMOUNT_USDC, refundAddress: signer.address, expiresInHours: 24, senderDisplayName: name, giftMessage: msg });
      const claimTx = await claimContract.claim(hash, receiverAddress);
      await claimTx.wait();
      claimed++;
      process.stdout.write(`  [${i + 1}/${N_CLAIMED}] claimed ✓\r`);
    } catch (e) {
      failed++;
      console.warn(`\n  claim #${i + 1} failed: ${e.message.slice(0, 80)}`);
    }
    await sleep(600);
  }
  console.log(`\nClaimed: ${claimed} ✓  ${failed > 0 ? `${failed} failed` : ""}`);

  // ── 3. RECLAIMED (short expiry → reclaim) ────────────────────────────────────
  console.log(`\n--- Funding ${N_RECLAIMED} gifts with short expiry then reclaiming ---`);
  failed = 0;
  const SHORT_EXPIRY_SEC = 8; // 8 seconds
  for (let i = 0; i < N_RECLAIMED; i++) {
    const secret = generateSecret();
    const hash = ethers.keccak256(secret);
    const expiresAt = Math.floor(Date.now() / 1000) + SHORT_EXPIRY_SEC;
    const name = pick(SENDER_NAMES);
    try {
      const fundTx = await gift.fundGift(hash, amountRaw, signer.address, expiresAt);
      await fundTx.wait();
      await persistMetadata({ paymentIdHash: hash, amountUsdc: AMOUNT_USDC, refundAddress: signer.address, expiresInHours: SHORT_EXPIRY_SEC / 3600, senderDisplayName: name, giftMessage: null });

      // Wait for expiry
      const waitMs = (SHORT_EXPIRY_SEC + 3) * 1000;
      await sleep(waitMs);

      const reclaimTx = await gift.reclaimExpiredGift(hash);
      await reclaimTx.wait();
      reclaimed++;
      process.stdout.write(`  [${i + 1}/${N_RECLAIMED}] reclaimed ✓\r`);
    } catch (e) {
      failed++;
      console.warn(`\n  reclaim #${i + 1} failed: ${e.message.slice(0, 80)}`);
    }
    await sleep(500);
  }
  console.log(`\nReclaimed: ${reclaimed} ✓  ${failed > 0 ? `${failed} failed` : ""}`);

  console.log(`\n✅ Done — funded: ${funded}, claimed: ${claimed}, reclaimed: ${reclaimed}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
