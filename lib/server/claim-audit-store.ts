import { mkdir, appendFile, readFile } from "node:fs/promises";
import path from "node:path";

export type ClaimAuditEvent = {
  requestId: string;
  timestamp: string;
  event:
    | "claim_received"
    | "claim_rate_limited"
    | "claim_in_progress"
    | "claim_cached"
    | "claim_success"
    | "claim_error";
  ip: string;
  idempotencyKey?: string;
  receiverAddress?: string;
  txHash?: string;
  errorCode?: string;
  message?: string;
};

export function resolveClaimAuditLogPath() {
  const configured = process.env.CLAIM_AUDIT_LOG_PATH?.trim();
  if (configured) {
    return path.isAbsolute(configured)
      ? configured
      : path.join(/*turbopackIgnore: true*/ process.cwd(), configured);
  }

  return path.join(
    /*turbopackIgnore: true*/ process.cwd(),
    ".logs",
    "claim-audit.log"
  );
}

class ClaimAuditStore {
  private readonly logPath = resolveClaimAuditLogPath();
  private initialized = false;

  private async ensureDirectory() {
    if (this.initialized) return;
    await mkdir(path.dirname(this.logPath), { recursive: true });
    this.initialized = true;
  }

  async write(event: ClaimAuditEvent) {
    const record = JSON.stringify(event) + "\n";

    try {
      await this.ensureDirectory();
      await appendFile(this.logPath, record, "utf8");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "unknown audit storage error";

      // Never break claim flow because of audit logging issues.
      console.error(
        JSON.stringify({
          event: "claim_audit_store_error",
          message,
        })
      );
    }
  }

  async readRecent(limit = 200): Promise<ClaimAuditEvent[]> {
    try {
      const content = await readFile(this.logPath, "utf8");
      if (!content.trim()) return [];

      const lines = content.trim().split("\n");
      const slice = lines.slice(Math.max(0, lines.length - limit));

      return slice
        .map((line) => {
          try {
            return JSON.parse(line) as ClaimAuditEvent;
          } catch {
            return null;
          }
        })
        .filter((entry): entry is ClaimAuditEvent => entry !== null);
    } catch (error) {
      const nodeError = error as NodeJS.ErrnoException;
      if (nodeError.code === "ENOENT") {
        return [];
      }
      throw error;
    }
  }
}

export const claimAuditStore = new ClaimAuditStore();
