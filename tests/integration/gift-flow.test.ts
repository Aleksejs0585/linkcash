import test from "node:test";
import assert from "node:assert/strict";
import { GiftLifecycle } from "../../entities/gift/server/gift-lifecycle.ts";

test("create -> claim critical flow succeeds", () => {
  const flow = new GiftLifecycle();
  flow.create({
    hash: "0xabc",
    amountUsdc: "10",
    refundAddress: "0xrefund",
    expiresAt: 1_000,
  });

  flow.claim({
    hash: "0xabc",
    receiverAddress: "0xreceiver",
    nowSec: 900,
  });

  assert.equal(flow.status("0xabc"), "claimed");
});

test("create -> reclaim critical flow succeeds after expiry", () => {
  const flow = new GiftLifecycle();
  flow.create({
    hash: "0xdef",
    amountUsdc: "5",
    refundAddress: "0xrefund",
    expiresAt: 1_000,
  });

  flow.reclaim({
    hash: "0xdef",
    nowSec: 1_001,
  });

  assert.equal(flow.status("0xdef"), "reclaimed");
});

