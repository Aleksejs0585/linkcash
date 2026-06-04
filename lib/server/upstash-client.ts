class UpstashClient {
  private readonly url: string;
  private readonly token: string;

  constructor(url: string, token: string) {
    this.url = url;
    this.token = token;
  }

  async command<T = unknown>(args: Array<string | number>): Promise<T> {
    const controller = new AbortController();
    const tid = setTimeout(() => controller.abort(), 5_000);
    const response = await fetch(this.url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(args),
      cache: "no-store",
      signal: controller.signal,
    }).finally(() => clearTimeout(tid));

    if (!response.ok) {
      throw new Error(`Upstash command failed with status ${response.status}.`);
    }

    const payload = (await response.json()) as { result?: T; error?: string };
    if (payload.error) {
      throw new Error(payload.error);
    }
    if (payload.result === undefined) {
      throw new Error("Upstash returned empty result.");
    }
    return payload.result as T;
  }
}

// Singleton — one client per serverless instance per URL/token pair
const globalState = globalThis as typeof globalThis & {
  __upstashClient?: UpstashClient | null;
  __upstashUrl?: string;
  __upstashToken?: string;
};

export function getUpstashClient(): UpstashClient | null {
  const url = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
  if (!url || !token) return null;

  // Return cached instance if credentials haven't changed
  if (
    globalState.__upstashClient &&
    globalState.__upstashUrl === url &&
    globalState.__upstashToken === token
  ) {
    return globalState.__upstashClient;
  }

  const client = new UpstashClient(url, token);
  globalState.__upstashClient = client;
  globalState.__upstashUrl = url;
  globalState.__upstashToken = token;
  return client;
}
