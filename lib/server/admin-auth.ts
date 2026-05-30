import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

const ADMIN_COOKIE_NAME = "linkcash_admin";
const SESSION_TTL_SECONDS = 60 * 60 * 12;

function getAdminPassword(): string {
  return process.env.ADMIN_DASHBOARD_PASSWORD?.trim() ?? "";
}

const DEV_SESSION_SECRET = "dev-only-admin-session-secret-not-for-production";

function getSessionSecret(): string {
  const configured = process.env.ADMIN_SESSION_SECRET?.trim();
  if (configured) return configured;
  if (process.env.NODE_ENV === "production") {
    throw new Error("ADMIN_SESSION_SECRET must be set in production.");
  }
  return DEV_SESSION_SECRET;
}

function signPayload(payload: string): string {
  return createHmac("sha256", getSessionSecret()).update(payload).digest("hex");
}

function encodeToken(timestamp: number): string {
  const payload = String(timestamp);
  const signature = signPayload(payload);
  return `${payload}.${signature}`;
}

function verifyToken(token: string): boolean {
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return false;

  const expected = signPayload(payload);
  const receivedBuffer = Buffer.from(signature, "utf8");
  const expectedBuffer = Buffer.from(expected, "utf8");
  if (receivedBuffer.length !== expectedBuffer.length) return false;
  if (!timingSafeEqual(receivedBuffer, expectedBuffer)) return false;

  const timestamp = Number(payload);
  if (!Number.isFinite(timestamp)) return false;
  const age = Date.now() - timestamp;
  return age >= 0 && age <= SESSION_TTL_SECONDS * 1000;
}

export function isAdminConfigured(): boolean {
  return getAdminPassword().length > 0;
}

export function validateAdminPassword(candidate: string): boolean {
  const password = getAdminPassword();
  if (!password) return false;
  // Hash both sides with HMAC so they're always the same length before
  // timingSafeEqual — early-exit on length difference leaks password length.
  const key = Buffer.from("pw-compare");
  const a = createHmac("sha256", key).update(candidate).digest();
  const b = createHmac("sha256", key).update(password).digest();
  return timingSafeEqual(a, b);
}

export async function createAdminSession() {
  const cookieStore = await cookies();
  cookieStore.set(ADMIN_COOKIE_NAME, encodeToken(Date.now()), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export async function clearAdminSession() {
  const cookieStore = await cookies();
  cookieStore.delete(ADMIN_COOKIE_NAME);
}

export async function isAdminAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_COOKIE_NAME)?.value;
  if (!token) return false;
  return verifyToken(token);
}
