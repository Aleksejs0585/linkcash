type LoginAttempt = {
  failCount: number;
  blockedUntilMs: number;
};

type LockoutStatus = {
  allowed: boolean;
  retryAfterSeconds: number;
};

const BASE_BACKOFF_SECONDS = 15;
const MAX_BACKOFF_SECONDS = 15 * 60;

const globalState = globalThis as typeof globalThis & {
  __adminLoginAttempts?: Map<string, LoginAttempt>;
};

const attemptsStore = globalState.__adminLoginAttempts ?? new Map<string, LoginAttempt>();
globalState.__adminLoginAttempts = attemptsStore;

function getIp(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0].trim();
  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp.trim();
  return "unknown";
}

export function canAttemptAdminLogin(request: Request): LockoutStatus {
  const ip = getIp(request);
  const state = attemptsStore.get(ip);
  if (!state) return { allowed: true, retryAfterSeconds: 0 };

  const now = Date.now();
  if (state.blockedUntilMs <= now) {
    return { allowed: true, retryAfterSeconds: 0 };
  }

  const retryAfterSeconds = Math.max(
    1,
    Math.ceil((state.blockedUntilMs - now) / 1000)
  );
  return { allowed: false, retryAfterSeconds };
}

export function markAdminLoginFailure(request: Request): void {
  const ip = getIp(request);
  const previous = attemptsStore.get(ip) ?? { failCount: 0, blockedUntilMs: 0 };
  const nextFailCount = previous.failCount + 1;
  const backoffSeconds = Math.min(
    MAX_BACKOFF_SECONDS,
    BASE_BACKOFF_SECONDS * 2 ** Math.max(0, nextFailCount - 1)
  );

  attemptsStore.set(ip, {
    failCount: nextFailCount,
    blockedUntilMs: Date.now() + backoffSeconds * 1000,
  });
}

export function clearAdminLoginFailures(request: Request): void {
  const ip = getIp(request);
  attemptsStore.delete(ip);
}

