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
  // Suppress raw ethers/RPC noise — rate limit, coalesce errors, etc.
  if (
    msg.includes("could not coalesce") ||
    msg.includes("request limit reached") ||
    msg.includes("rate limit") ||
    msg.includes("-32007") ||
    msg.includes("UNKNOWN_ERROR")
  ) {
    return fallback;
  }
  return msg;
}

