type ClaimRuntimeConfig = {
  rateLimitEnabled: boolean;
  rateLimitPerMinute: number;
};

const parsedLimit = Number(process.env.CLAIM_RATE_LIMIT_PER_MINUTE ?? "12");
const defaultConfig: ClaimRuntimeConfig = {
  rateLimitEnabled: true,
  rateLimitPerMinute:
    Number.isFinite(parsedLimit) && parsedLimit > 0 ? parsedLimit : 12,
};

const globalState = globalThis as typeof globalThis & {
  __claimRuntimeConfig?: ClaimRuntimeConfig;
};

if (!globalState.__claimRuntimeConfig) {
  globalState.__claimRuntimeConfig = { ...defaultConfig };
}

export function getClaimRuntimeConfig(): ClaimRuntimeConfig {
  return { ...globalState.__claimRuntimeConfig! };
}

export function updateClaimRuntimeConfig(
  patch: Partial<ClaimRuntimeConfig>
): ClaimRuntimeConfig {
  const current = globalState.__claimRuntimeConfig!;
  const next: ClaimRuntimeConfig = {
    rateLimitEnabled:
      typeof patch.rateLimitEnabled === "boolean"
        ? patch.rateLimitEnabled
        : current.rateLimitEnabled,
    rateLimitPerMinute:
      typeof patch.rateLimitPerMinute === "number" &&
      Number.isFinite(patch.rateLimitPerMinute) &&
      patch.rateLimitPerMinute > 0
        ? Math.floor(patch.rateLimitPerMinute)
        : current.rateLimitPerMinute,
  };

  globalState.__claimRuntimeConfig = next;
  return { ...next };
}
