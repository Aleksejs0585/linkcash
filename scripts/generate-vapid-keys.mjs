/**
 * Run once to generate VAPID keys for push notifications.
 * Usage: node scripts/generate-vapid-keys.mjs
 */

import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const webpush = require("web-push");

const keys = webpush.generateVAPIDKeys();

console.log("\nAdd these to your Vercel environment variables:\n");
console.log(`NEXT_PUBLIC_VAPID_PUBLIC_KEY=${keys.publicKey}`);
console.log(`VAPID_PRIVATE_KEY=${keys.privateKey}`);
console.log(`VAPID_SUBJECT=mailto:noreply@linkcash.app`);
