const USER = "arc_circle_user_token";
const ENC = "arc_circle_encryption_key";
const REFRESH = "arc_circle_refresh_token";

export type CircleSessionCredentials = {
  userToken: string;
  encryptionKey: string;
  refreshToken: string;
};

export function readCircleSession(): CircleSessionCredentials | null {
  if (typeof window === "undefined") return null;
  const userToken = window.localStorage.getItem(USER);
  const encryptionKey = window.localStorage.getItem(ENC);
  if (!userToken || !encryptionKey) return null;
  const refreshToken = window.localStorage.getItem(REFRESH) ?? "";
  return { userToken, encryptionKey, refreshToken };
}

export function writeCircleSession(creds: CircleSessionCredentials): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(USER, creds.userToken);
  window.localStorage.setItem(ENC, creds.encryptionKey);
  if (creds.refreshToken) {
    window.localStorage.setItem(REFRESH, creds.refreshToken);
  }
}

export function clearCircleSession(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(USER);
  window.localStorage.removeItem(ENC);
  window.localStorage.removeItem(REFRESH);
}
