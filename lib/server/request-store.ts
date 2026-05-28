import { appendFile, mkdir, readFile } from "node:fs/promises";
import path from "node:path";

export type PaymentRequest = {
  requestId: string;
  displayName: string;
  amountUsdc: string;
  message?: string;
  createdAt: string;
};

function resolveLogPath() {
  const configured = process.env.REQUEST_LOG_PATH?.trim();
  if (configured) {
    return path.isAbsolute(configured)
      ? configured
      : path.join(/*turbopackIgnore: true*/ process.cwd(), configured);
  }
  return path.join(
    /*turbopackIgnore: true*/ process.cwd(),
    ".logs",
    "payment-requests.log"
  );
}

class RequestStore {
  private readonly logPath = resolveLogPath();
  private initialized = false;

  private async ensureDirectory() {
    if (this.initialized) return;
    await mkdir(path.dirname(this.logPath), { recursive: true });
    this.initialized = true;
  }

  async write(req: PaymentRequest): Promise<void> {
    try {
      await this.ensureDirectory();
      await appendFile(this.logPath, JSON.stringify(req) + "\n", "utf8");
    } catch (error) {
      console.error(
        JSON.stringify({
          event: "request_store_write_error",
          message: error instanceof Error ? error.message : "unknown",
        })
      );
    }
  }

  async read(requestId: string): Promise<PaymentRequest | null> {
    try {
      const content = await readFile(this.logPath, "utf8");
      const lines = content.trim().split("\n");
      for (let i = lines.length - 1; i >= 0; i--) {
        try {
          const parsed = JSON.parse(lines[i]) as PaymentRequest;
          if (parsed.requestId === requestId) return parsed;
        } catch {
          // skip malformed line
        }
      }
      return null;
    } catch (error) {
      const nodeError = error as NodeJS.ErrnoException;
      if (nodeError.code === "ENOENT") return null;
      console.error(
        JSON.stringify({
          event: "request_store_read_error",
          message: nodeError.message,
        })
      );
      return null;
    }
  }
}

export const requestStore = new RequestStore();
