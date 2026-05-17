const STORAGE_KEY = "linkcash:google-display-name";
const EMAIL_STORAGE_KEY = "linkcash:google-email";

export function persistGoogleDisplayName(name: string): void {
  if (typeof window === "undefined") return;
  const trimmed = name.trim().replace(/\s+/g, " ");
  if (!trimmed) return;
  window.localStorage.setItem(STORAGE_KEY, trimmed.slice(0, 40));
}

export function readGoogleDisplayName(): string | null {
  if (typeof window === "undefined") return null;
  const value = window.localStorage.getItem(STORAGE_KEY);
  return value?.trim() ? value : null;
}

export function clearGoogleDisplayName(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
  window.localStorage.removeItem(EMAIL_STORAGE_KEY);
}

export function persistGoogleEmail(email: string): void {
  if (typeof window === "undefined") return;
  const trimmed = email.trim().toLowerCase();
  if (!trimmed || !trimmed.includes("@")) return;
  window.localStorage.setItem(EMAIL_STORAGE_KEY, trimmed.slice(0, 40));
}

export function readGoogleEmail(): string | null {
  if (typeof window === "undefined") return null;
  const value = window.localStorage.getItem(EMAIL_STORAGE_KEY);
  return value?.trim() ? value : null;
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

export function extractGoogleEmail(
  result: OAuthLoginPayload | undefined
): string | null {
  const email = result?.oAuthInfo?.email?.trim().toLowerCase();
  if (!email || !email.includes("@")) return null;
  return email.slice(0, 40);
}

/** Default sender label on create: Google email, then display name. */
export function resolveDefaultSenderLabel(
  email: string | null | undefined,
  displayName: string | null | undefined
): string | null {
  const normalizedEmail = email?.trim().toLowerCase();
  if (normalizedEmail && normalizedEmail.includes("@")) {
    return normalizedEmail.slice(0, 40);
  }
  const normalizedName = displayName?.trim().replace(/\s+/g, " ");
  return normalizedName ? normalizedName.slice(0, 40) : null;
}

export function displayNameInitials(name: string): string {
  const label = name.trim();
  if (!label) return "🎁";
  if (label.includes("@")) {
    const local = (label.split("@")[0] ?? "").replace(/[^a-zA-Z0-9]/g, "");
    if (local.length >= 2) return local.slice(0, 2).toUpperCase();
    if (local.length === 1) return local.toUpperCase();
  }
  const parts = label.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[parts.length - 1][0] ?? ""}`.toUpperCase();
}
