class UpstashClient {
  private readonly url: string;
  private readonly token: string;

  constructor(url: string, token: string) {
    this.url = url;
    this.token = token;
  }

  async command<T = unknown>(args: Array<string | number>): Promise<T> {
    const response = await fetch(this.url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(args),
      cache: "no-store",
    });

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

export function getUpstashClient(): UpstashClient | null {
  const url = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
  if (!url || !token) return null;
  return new UpstashClient(url, token);
}
