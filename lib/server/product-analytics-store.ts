import { appendFile, mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import { getUpstashClient } from "./upstash-client";

export type ProductAnalyticsEvent = {
  event:
    | "create_open"
    | "gift_funded"
    | "status_open"
    | "claim_success"
    | "wallet_open"
    | "claim_error"
    | "reclaim_click";
  timestamp: string;
  path?: string;
  paymentIdHash?: string;
  status?: string;
  txHash?: string;
  source?: string;
  campaign?: string;
  referrer?: string;
  variant?: string;
  detail?: string;
};

const REDIS_KEY = "linkcash:analytics";
const MAX_EVENTS = 10_000;

function resolveProductAnalyticsLogPath() {
  const configured = process.env.PRODUCT_ANALYTICS_LOG_PATH?.trim();
  const cwd = /* turbopackIgnore: true */ process.cwd();
  if (configured) {
    return path.isAbsolute(configured) ? configured : path.join(cwd, configured);
  }
  return path.join(cwd, ".logs", "product-analytics.log");
}

class ProductAnalyticsStore {
  private readonly logPath = resolveProductAnalyticsLogPath();
  private readonly upstash = getUpstashClient();
  private initialized = false;

  private async ensureDirectory() {
    if (this.initialized) return;
    await mkdir(path.dirname(this.logPath), { recursive: true });
    this.initialized = true;
  }

  async write(event: ProductAnalyticsEvent) {
    if (this.upstash) {
      try {
        const payload = JSON.stringify(event);
        await this.upstash.command(["RPUSH", REDIS_KEY, payload]);
        await this.upstash.command(["LTRIM", REDIS_KEY, -MAX_EVENTS, -1]);
      } catch {
        // Analytics should never break product flows.
      }
      return;
    }

    try {
      await this.ensureDirectory();
      await appendFile(this.logPath, JSON.stringify(event) + "\n", "utf8");
    } catch {
      // Analytics should never break product flows.
    }
  }

  async readRecent(limit = 1000): Promise<ProductAnalyticsEvent[]> {
    if (this.upstash) {
      try {
        const raw = await this.upstash.command<string[]>([
          "LRANGE",
          REDIS_KEY,
          -Math.max(1, limit),
          -1,
        ]);
        if (!raw?.length) return [];
        return raw
          .map((line) => {
            try {
              return JSON.parse(line) as ProductAnalyticsEvent;
            } catch {
              return null;
            }
          })
          .filter((e): e is ProductAnalyticsEvent => e !== null);
      } catch {
        return [];
      }
    }

    try {
      const content = await readFile(this.logPath, "utf8");
      if (!content.trim()) return [];

      const lines = content.trim().split("\n");
      const recent = lines.slice(Math.max(0, lines.length - Math.max(1, limit)));

      return recent
        .map((line) => {
          try {
            return JSON.parse(line) as ProductAnalyticsEvent;
          } catch {
            return null;
          }
        })
        .filter((entry): entry is ProductAnalyticsEvent => entry !== null);
    } catch (error) {
      const nodeError = error as NodeJS.ErrnoException;
      if (nodeError.code !== "ENOENT") {
        console.error(
          JSON.stringify({ event: "product_analytics_read_error", message: nodeError.message })
        );
      }
      return [];
    }
  }
}

export const productAnalyticsStore = new ProductAnalyticsStore();
