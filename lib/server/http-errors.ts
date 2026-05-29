export class HttpError extends Error {
  readonly status: number;
  readonly code?: string;
  readonly retryable: boolean;

  constructor(
    status: number,
    message: string,
    options?: { code?: string; retryable?: boolean }
  ) {
    super(message);
    this.status = status;
    this.code = options?.code;
    this.retryable = options?.retryable ?? false;
  }
}

export function errorMessage(error: unknown, fallback: string): string {
  const msg = error instanceof Error ? error.message : fallback;
  // Suppress raw ethers/RPC/blockchain noise to avoid leaking internals.
  const blocklist = [
    "could not coalesce",
    "request limit reached",
    "rate limit",
    "-32007",
    "UNKNOWN_ERROR",
    "CALL_EXCEPTION",
    "INSUFFICIENT_FUNDS",
    "REPLACEMENT_UNDERPRICED",
    "NONCE_EXPIRED",
    "eth_",
    "transaction",
    "provider",
    "network changed",
    "missing revert",
    "execution reverted",
  ];
  if (blocklist.some((p) => msg.toLowerCase().includes(p.toLowerCase()))) {
    return fallback;
  }
  return msg;
}

