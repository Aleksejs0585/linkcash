import { appendFile, mkdir } from "node:fs/promises";
import path from "node:path";

export type ProductAnalyticsEvent = {
  event:
    | "create_open"
    | "gift_funded"
    | "status_open"
    | "claim_success";
  timestamp: string;
  path?: string;
  paymentIdHash?: string;
  status?: string;
  txHash?: string;
};

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
  private initialized = false;

  private async ensureDirectory() {
    if (this.initialized) return;
    await mkdir(path.dirname(this.logPath), { recursive: true });
    this.initialized = true;
  }

  async write(event: ProductAnalyticsEvent) {
    try {
      await this.ensureDirectory();
      await appendFile(this.logPath, JSON.stringify(event) + "\n", "utf8");
    } catch {
      // Analytics should never break product flows.
    }
  }
}

export const productAnalyticsStore = new ProductAnalyticsStore();

