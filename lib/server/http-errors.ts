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
  return error instanceof Error ? error.message : fallback;
}

