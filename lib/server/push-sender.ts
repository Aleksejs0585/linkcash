import webpush from "web-push";
import { pushStore } from "./push-store";

const vapidPublic = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim();
const vapidPrivate = process.env.VAPID_PRIVATE_KEY?.trim();
const vapidSubject = process.env.VAPID_SUBJECT?.trim() ?? "mailto:noreply@linkcash.app";

let vapidConfigured = false;
if (vapidPublic && vapidPrivate) {
  try {
    webpush.setVapidDetails(vapidSubject, vapidPublic, vapidPrivate);
    vapidConfigured = true;
  } catch (err) {
    console.error("[push] Invalid VAPID keys — push notifications disabled:", err instanceof Error ? err.message : err);
  }
}

export type PushPayload = {
  title: string;
  body: string;
  url?: string;
  icon?: string;
};

export async function sendPushToWallet(
  walletAddress: string,
  payload: PushPayload
): Promise<void> {
  if (!vapidConfigured) return;

  const subs = await pushStore.getAll(walletAddress);
  if (subs.length === 0) return;

  const data = JSON.stringify({
    title: payload.title,
    body: payload.body,
    url: payload.url ?? "/wallet",
    icon: payload.icon ?? "/linkcash-icon-512.png",
  });

  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: sub.keys },
          data,
          { TTL: 86400 }
        );
      } catch (err) {
        // 410 Gone = subscription expired/unsubscribed — clean it up
        if (err instanceof Error && err.message.includes("410")) {
          await pushStore.remove(walletAddress, sub.endpoint);
        }
      }
    })
  );
}
