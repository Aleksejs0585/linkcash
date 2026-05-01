import test from "node:test";
import assert from "node:assert/strict";
import { ClaimStateStore } from "../../lib/server/claim-state-store.ts";

test("rate limiter blocks after configured threshold", async () => {
  const store = new ClaimStateStore();
  const ip = "test-ip-1";

  const first = await store.enforceRateLimit(ip, 1);
  const second = await store.enforceRateLimit(ip, 1);

  assert.equal(first.limited, false);
  assert.equal(second.limited, true);
  assert.ok(second.retryAfter > 0);
});

test("idempotency stores processing and success states", async () => {
  const store = new ClaimStateStore();
  const key = "idem-key-1";

  await store.setProcessing(key, 10_000);
  const processing = await store.getIdempotency(key);
  assert.equal(processing?.status, "processing");

  await store.setSuccess(key, "0xtx", 10_000);
  const success = await store.getIdempotency(key);
  assert.equal(success?.status, "success");
  assert.equal((success as { txHash?: string }).txHash, "0xtx");

  await store.deleteIdempotency(key);
  const removed = await store.getIdempotency(key);
  assert.equal(removed, null);
});

