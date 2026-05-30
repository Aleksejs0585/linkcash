export const OAUTH_RETURN_KEY = "linkcash:oauthReturn";
export const AUTO_CLAIM_AFTER_AUTH_KEY = "linkcash:autoClaimAfterAuth";

export function getCurrentAppPath(): string {
  if (typeof window === "undefined") return "/";
  return `${window.location.pathname}${window.location.search}${window.location.hash}`;
}

/** Save where to return after Google OAuth (path + hash for gift secrets). */
export function saveOAuthReturnTarget(): void {
  if (typeof window === "undefined") return;
  const target = getCurrentAppPath();
  if (!target || target === "/") return;
  sessionStorage.setItem(OAUTH_RETURN_KEY, target);
}

export function clearOAuthReturnTarget(): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(OAUTH_RETURN_KEY);
}

export function getOAuthReturnTarget(): string | null {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem(OAUTH_RETURN_KEY);
}

const ALLOWED_RETURN_PREFIXES = ["/gift/", "/status/", "/create", "/wallet", "/pay/"];

function isSafeReturnPath(path: string): boolean {
  if (!path.startsWith("/")) return false;
  if (path.includes("..")) return false;
  return ALLOWED_RETURN_PREFIXES.some((prefix) => path.startsWith(prefix));
}

/**
 * Navigate back to the saved gift/app URL after OAuth lands on site origin (/).
 * Returns true if a redirect was started.
 */
export function resumeOAuthReturnTarget(): boolean {
  if (typeof window === "undefined") return false;

  const saved = getOAuthReturnTarget();
  clearOAuthReturnTarget();
  if (!saved || !isSafeReturnPath(saved)) return false;

  const current = getCurrentAppPath();
  if (current === saved) return false;

  window.location.assign(saved);
  return true;
}

export function markAutoClaimAfterAuth(): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(AUTO_CLAIM_AFTER_AUTH_KEY, "1");
}

export function consumeAutoClaimAfterAuth(): boolean {
  if (typeof window === "undefined") return false;
  if (sessionStorage.getItem(AUTO_CLAIM_AFTER_AUTH_KEY) !== "1") return false;
  sessionStorage.removeItem(AUTO_CLAIM_AFTER_AUTH_KEY);
  return true;
}

export function clearAutoClaimAfterAuth(): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(AUTO_CLAIM_AFTER_AUTH_KEY);
}

export function clearOAuthFlowState(): void {
  clearOAuthReturnTarget();
  clearAutoClaimAfterAuth();
}
