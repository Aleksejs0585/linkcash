const DEFAULT_PRODUCT_SITE_URL = "https://arc.network";

/**
 * Public marketing / product site URL (configure per deployment).
 */
export function getProductSiteUrl(): string {
  const raw = process.env.NEXT_PUBLIC_PRODUCT_SITE_URL?.trim();
  if (!raw) {
    return DEFAULT_PRODUCT_SITE_URL;
  }
  try {
    return new URL(raw).href;
  } catch {
    return DEFAULT_PRODUCT_SITE_URL;
  }
}
