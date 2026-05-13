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
  const userToken = window.sessionStorage.getItem(USER);
  const encryptionKey = window.sessionStorage.getItem(ENC);
  if (!userToken || !encryptionKey) return null;
  const refreshToken = window.sessionStorage.getItem(REFRESH) ?? "";
  return { userToken, encryptionKey, refreshToken };
}

export function writeCircleSession(creds: CircleSessionCredentials): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(USER, creds.userToken);
  window.sessionStorage.setItem(ENC, creds.encryptionKey);
  if (creds.refreshToken) {
    window.sessionStorage.setItem(REFRESH, creds.refreshToken);
  }
}

export function clearCircleSession(): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(USER);
  window.sessionStorage.removeItem(ENC);
  window.sessionStorage.removeItem(REFRESH);
}
