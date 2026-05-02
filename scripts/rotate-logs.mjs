import { access, mkdir, rename, stat, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const logsDir = path.join(root, ".logs");
const archiveDir = path.join(logsDir, "archive");
const stamp = new Date().toISOString().replace(/[:.]/g, "-");

const targets = [
  process.env.CLAIM_AUDIT_LOG_PATH || ".logs/claim-audit.log",
  process.env.SENDER_GIFT_LOG_PATH || ".logs/sender-gifts.log",
  process.env.ADMIN_AUDIT_LOG_PATH || ".logs/admin-audit.log",
  process.env.PRODUCT_ANALYTICS_LOG_PATH || ".logs/product-analytics.log",
];

function resolveFile(target) {
  return path.isAbsolute(target) ? target : path.join(root, target);
}

async function rotateFile(filePath) {
  try {
    await access(filePath);
    const info = await stat(filePath);
    if (info.size === 0) {
      return { filePath, rotated: false, reason: "empty" };
    }

    await mkdir(archiveDir, { recursive: true });
    const base = path.basename(filePath, path.extname(filePath));
    const archivedPath = path.join(archiveDir, `${base}.${stamp}.log`);
    await rename(filePath, archivedPath);
    await writeFile(filePath, "", "utf8");
    return { filePath, rotated: true, archivedPath };
  } catch {
    return { filePath, rotated: false, reason: "missing" };
  }
}

async function run() {
  await mkdir(logsDir, { recursive: true });

  const uniqueTargets = [...new Set(targets.map(resolveFile))];
  const results = await Promise.all(uniqueTargets.map(rotateFile));

  for (const item of results) {
    if (item.rotated) {
      console.log(`rotated: ${item.filePath} -> ${item.archivedPath}`);
    } else {
      console.log(`skipped: ${item.filePath} (${item.reason})`);
    }
  }
}

run().catch((error) => {
  console.error("log rotation failed", error);
  process.exitCode = 1;
});

