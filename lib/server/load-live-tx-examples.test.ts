import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { LANDING_LIVE_TX_LIMIT, mergeTxExamples } from "./live-tx-merge.ts";

describe("mergeTxExamples", () => {
  it("returns up to 10 newest unique tx hashes", () => {
    const items = Array.from({ length: 15 }, (_, i) => ({
      txHash: `0x${i.toString(16).padStart(64, "0")}`,
      label: "Gift funded by sender",
      timestamp: new Date(Date.UTC(2026, 0, 1, 0, i)).toISOString(),
    }));

    const merged = mergeTxExamples(items);
    const newest = items.reduce((latest, item) =>
      new Date(item.timestamp) > new Date(latest.timestamp) ? item : latest
    );
    assert.equal(merged.length, LANDING_LIVE_TX_LIMIT);
    assert.equal(merged[0]?.timestamp, newest.timestamp);
  });

  it("dedupes the same tx hash across sources", () => {
    const merged = mergeTxExamples([
      {
        txHash: "0xabc",
        label: "Gift funded by sender",
        timestamp: "2026-01-01T00:00:00.000Z",
      },
      {
        txHash: "0xABC",
        label: "Recipient claim settled",
        timestamp: "2026-01-02T00:00:00.000Z",
      },
    ]);
    assert.equal(merged.length, 1);
    assert.equal(merged[0]?.label, "Recipient claim settled");
  });
});
