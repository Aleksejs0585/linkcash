import { appendFile, mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import { liveActivityStore } from "./live-activity-store";

export type SenderGiftEvent = {
  event: "gift_funded" | "gift_reclaimed";
  timestamp: string;
  paymentIdHash: string;
  refundAddress: string;
  amountRaw?: string;
  expiresAt?: number;
  txHash: string;
};

export function resolveSenderGiftLogPath() {
  const configured = process.env.SENDER_GIFT_LOG_PATH?.trim();
  if (configured) {
    return path.isAbsolute(configured)
      ? configured
      : path.join(/*turbopackIgnore: true*/ process.cwd(), configured);
  }

  return path.join(
    /*turbopackIgnore: true*/ process.cwd(),
    ".logs",
    "sender-gifts.log"
  );
}

class SenderGiftStore {
  private readonly logPath = resolveSenderGiftLogPath();
  private initialized = false;

  private async ensureDirectory() {
    if (this.initialized) return;
    await mkdir(path.dirname(this.logPath), { recursive: true });
    this.initialized = true;
  }

  async write(event: SenderGiftEvent) {
    const record = JSON.stringify(event) + "\n";

    void liveActivityStore.append({
      kind: event.event,
      timestamp: event.timestamp,
      txHash: event.txHash,
    });

    try {
      await this.ensureDirectory();
      await appendFile(this.logPath, record, "utf8");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "unknown sender gift store error";
      console.error(
        JSON.stringify({
          event: "sender_gift_store_error",
          message,
        })
      );
    }
  }

  async readRecent(limit = 200): Promise<SenderGiftEvent[]> {
    try {
      const content = await readFile(this.logPath, "utf8");
      if (!content.trim()) return [];

      const lines = content.trim().split("\n");
      const slice = lines.slice(Math.max(0, lines.length - limit));

      return slice
        .map((line) => {
          try {
            return JSON.parse(line) as SenderGiftEvent;
          } catch {
            return null;
          }
        })
        .filter((entry): entry is SenderGiftEvent => entry !== null);
    } catch (error) {
      const nodeError = error as NodeJS.ErrnoException;
      if (nodeError.code === "ENOENT") {
        return [];
      }
      throw error;
    }
  }
}

export const senderGiftStore = new SenderGiftStore();
