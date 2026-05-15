import { getUpstashClient } from "./upstash-client";

export type LiveActivityEvent = {
  kind: "gift_funded" | "gift_reclaimed" | "claim_success";
  timestamp: string;
  txHash: string;
};

const REDIS_KEY = "linkcash:live-activity";
const MAX_ENTRIES = 500;

const globalState = globalThis as typeof globalThis & {
  __liveActivityMemory?: LiveActivityEvent[];
};

const memoryStore = globalState.__liveActivityMemory ?? [];
globalState.__liveActivityMemory = memoryStore;

function isRealTxHash(txHash: string): boolean {
  return /^0x[0-9a-fA-F]{64}$/.test(txHash);
}

class LiveActivityStore {
  private readonly upstash = getUpstashClient();

  async append(event: LiveActivityEvent): Promise<void> {
    if (!isRealTxHash(event.txHash)) return;

    const record = JSON.stringify(event);

    if (this.upstash) {
      try {
        await this.upstash.command(["LPUSH", REDIS_KEY, record]);
        await this.upstash.command(["LTRIM", REDIS_KEY, 0, MAX_ENTRIES - 1]);
      } catch (error) {
        console.error(
          JSON.stringify({
            event: "live_activity_redis_error",
            message: error instanceof Error ? error.message : "unknown",
          })
        );
      }
    }

    memoryStore.unshift(event);
    if (memoryStore.length > MAX_ENTRIES) {
      memoryStore.length = MAX_ENTRIES;
    }
  }

  async readRecent(limit = 50): Promise<LiveActivityEvent[]> {
    if (this.upstash) {
      try {
        const rows = await this.upstash.command<string[]>([
          "LRANGE",
          REDIS_KEY,
          0,
          limit - 1,
        ]);
        return rows
          .map((row) => {
            try {
              return JSON.parse(row) as LiveActivityEvent;
            } catch {
              return null;
            }
          })
          .filter((row): row is LiveActivityEvent => row !== null && isRealTxHash(row.txHash));
      } catch (error) {
        console.error(
          JSON.stringify({
            event: "live_activity_redis_read_error",
            message: error instanceof Error ? error.message : "unknown",
          })
        );
      }
    }

    return memoryStore.slice(0, limit);
  }
}

export const liveActivityStore = new LiveActivityStore();

export function liveActivityToLandingRow(event: LiveActivityEvent): {
  txHash: string;
  label: string;
  timestamp: string;
} {
  switch (event.kind) {
    case "gift_funded":
      return {
        txHash: event.txHash,
        label: "Gift funded by sender",
        timestamp: event.timestamp,
      };
    case "gift_reclaimed":
      return {
        txHash: event.txHash,
        label: "Expired gift reclaimed",
        timestamp: event.timestamp,
      };
    default:
      return {
        txHash: event.txHash,
        label: "Recipient claim settled",
        timestamp: event.timestamp,
      };
  }
}
