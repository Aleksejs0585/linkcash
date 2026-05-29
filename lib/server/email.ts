const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = process.env.EMAIL_FROM ?? "LinkCash <noreply@linkcash.app>";

if (!RESEND_API_KEY) {
  console.warn("[email] RESEND_API_KEY is not set — claim notifications will be skipped.");
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function sendGiftClaimedEmail({
  to,
  senderDisplayName,
  amountUsdc,
}: {
  to: string;
  senderDisplayName: string;
  amountUsdc?: string;
}): Promise<void> {
  if (!RESEND_API_KEY) return;
  if (!EMAIL_RE.test(to)) return;

  const amount = amountUsdc ? `${amountUsdc} USDC` : "Your gift";
  const subject = `${amount} was claimed ✓`;
  const text = [
    `Hi ${senderDisplayName},`,
    "",
    `${amount} was just claimed — the recipient's wallet has been credited.`,
    "",
    "Thanks for using LinkCash.",
  ].join("\n");

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8_000);
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from: FROM_EMAIL, to, subject, text }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    if (!res.ok) {
      const body = (await res.text()).slice(0, 200);
      console.error(
        JSON.stringify({ event: "email_send_failed", status: res.status, body })
      );
    }
  } catch (err) {
    console.error(
      JSON.stringify({
        event: "email_send_error",
        message: err instanceof Error ? err.message : "unknown",
      })
    );
  }
}
