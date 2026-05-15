const STORAGE_KEY = "linkcash:google-display-name";

export function persistGoogleDisplayName(name: string): void {
  if (typeof window === "undefined") return;
  const trimmed = name.trim().replace(/\s+/g, " ");
  if (!trimmed) return;
  window.sessionStorage.setItem(STORAGE_KEY, trimmed.slice(0, 40));
}

export function readGoogleDisplayName(): string | null {
  if (typeof window === "undefined") return null;
  const value = window.sessionStorage.getItem(STORAGE_KEY);
  return value?.trim() ? value : null;
}

export function clearGoogleDisplayName(): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(STORAGE_KEY);
}

type OAuthLoginPayload = {
  oAuthInfo?: {
    name?: string;
    email?: string;
    socialUserInfo?: { name?: string };
  };
};

export function extractGoogleDisplayName(
  result: OAuthLoginPayload | undefined
): string | null {
  if (!result?.oAuthInfo) return null;
  const fromInfo = result.oAuthInfo.name?.trim();
  const fromSocial = result.oAuthInfo.socialUserInfo?.name?.trim();
  const name = fromInfo || fromSocial || "";
  return name.length > 0 ? name.slice(0, 40) : null;
}

export function displayNameInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "🎁";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[parts.length - 1][0] ?? ""}`.toUpperCase();
}
