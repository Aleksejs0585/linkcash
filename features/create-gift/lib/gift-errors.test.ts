import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { formatGiftTxError } from "./gift-errors.ts";

describe("formatGiftTxError", () => {
  it("maps gift active reclaim revert", () => {
    const msg = formatGiftTxError('execution reverted: "gift active"');
    assert.match(msg, /still active/i);
    assert.match(msg, /after the expiry/i);
  });
});
