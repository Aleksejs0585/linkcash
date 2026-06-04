/**
 * Run once to generate VAPID keys for push notifications.
 * Usage: node scripts/generate-vapid-keys.mjs
 *
 * Then add to Vercel env vars:
 *   NEXT_PUBLIC_VAPID_PUBLIC_KEY=<publicKey>
 *   VAPID_PRIVATE_KEY=<privateKey>
 *   VAPID_SUBJECT=mailto:noreply@linkcash.app
 */

import { generateKeyPairSync } from "node:crypto";

const { publicKey, privateKey } = generateKeyPairSync("ec", { namedCurve: "P-256" });

const pubDer = publicKey.export({ type: "spki", format: "der" });
const privDer = privateKey.export({ type: "pkcs8", format: "der" });

// VAPID public key: 65-byte uncompressed EC point at offset 27 in SPKI
const vapidPublic = Buffer.from(pubDer.subarray(27)).toString("base64url");
// VAPID private key: 32-byte scalar at offset 36 in PKCS8
const vapidPrivate = Buffer.from(privDer.subarray(36, 68)).toString("base64url");

console.log("\nAdd these to your Vercel environment variables:\n");
console.log(`NEXT_PUBLIC_VAPID_PUBLIC_KEY=${vapidPublic}`);
console.log(`VAPID_PRIVATE_KEY=${vapidPrivate}`);
console.log(`VAPID_SUBJECT=mailto:noreply@linkcash.app`);
console.log("\nAlso add NEXT_PUBLIC_VAPID_PUBLIC_KEY to your local .env.local\n");
