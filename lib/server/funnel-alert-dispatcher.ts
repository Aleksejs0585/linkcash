import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { FunnelSummary } from "./funnel-metrics";

type AlertState = Record<string, string>;

function resolveStatePath() {
  return path.join(
    /* turbopackIgnore: true */ process.cwd(),
    ".logs",
    "funnel-alert-state.json"
  );
}

async function readState(filePath: string): Promise<AlertState> {
  try {
    const content = await readFile(filePath, "utf8");
    if (!content.trim()) return {};
    return JSON.parse(content) as AlertState;
  } catch (error) {
    const nodeError = error as NodeJS.ErrnoException;
    if (nodeError.code === "ENOENT") return {};
    return {};
  }
}

async function writeState(filePath: string, state: AlertState) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, JSON.stringify(state, null, 2), "utf8");
}

function alertKey(text: string) {
  return text.toLowerCase().replace(/\s+/g, "_");
}

export async function dispatchFunnelAlerts(summary: FunnelSummary) {
  const webhookUrl = process.env.ALERT_WEBHOOK_URL?.trim();
  if (!webhookUrl || summary.alerts.length === 0) return;

  const cooldownMinutesRaw = Number(
    process.env.ALERT_WEBHOOK_COOLDOWN_MINUTES?.trim() || "30"
  );
  const cooldownMinutes =
    Number.isFinite(cooldownMinutesRaw) && cooldownMinutesRaw > 0
      ? Math.floor(cooldownMinutesRaw)
      : 30;
  const cooldownMs = cooldownMinutes * 60_000;

  const statePath = resolveStatePath();
  const state = await readState(statePath);
  const now = Date.now();
  const nextState: AlertState = { ...state };
  const dueAlerts: string[] = [];

  for (const alert of summary.alerts) {
    const key = alertKey(alert);
    const lastSentTs = Date.parse(state[key] || "");
    if (!Number.isFinite(lastSentTs) || now - lastSentTs >= cooldownMs) {
      dueAlerts.push(alert);
      nextState[key] = new Date(now).toISOString();
    }
  }

  if (dueAlerts.length === 0) return;

  const text =
    "LinkCash funnel alert:\n" +
    dueAlerts.map((item) => `- ${item}`).join("\n") +
    `\n24h open=${summary.last24h.createOpen}, funded=${summary.last24h.giftFunded}, claimed=${summary.last24h.claimSuccess}`;

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text,
        alerts: dueAlerts,
        summary: summary.last24h,
        timestamp: new Date(now).toISOString(),
      }),
    });

    if (!response.ok) {
      return;
    }

    await writeState(statePath, nextState);
  } catch {
    // Fail silent: telemetry alerts must not break product flows.
  }
}

