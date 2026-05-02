import { appendFile, mkdir } from "node:fs/promises";
import path from "node:path";

type AdminAuditEvent = {
  timestamp: string;
  event: "admin_login_success" | "admin_login_failure" | "admin_login_blocked" | "admin_logout";
  ip?: string;
  message?: string;
};

function resolvePath() {
  const configured = process.env.ADMIN_AUDIT_LOG_PATH?.trim();
  const cwd = /* turbopackIgnore: true */ process.cwd();
  if (configured) {
    return path.isAbsolute(configured) ? configured : path.join(cwd, configured);
  }
  return path.join(cwd, ".logs", "admin-audit.log");
}

class AdminAuditStore {
  private readonly logPath = resolvePath();
  private initialized = false;

  private async ensureDirectory() {
    if (this.initialized) return;
    await mkdir(path.dirname(this.logPath), { recursive: true });
    this.initialized = true;
  }

  async write(event: AdminAuditEvent) {
    try {
      await this.ensureDirectory();
      await appendFile(this.logPath, JSON.stringify(event) + "\n", "utf8");
    } catch {
      // Keep auth flow resilient even if logging fails.
    }
  }
}

export const adminAuditStore = new AdminAuditStore();

