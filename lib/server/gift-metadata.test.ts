import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  buildGiftMetadata,
  sanitizeGiftMessage,
  sanitizeSenderDisplayName,
} from "./gift-metadata.ts";
import { HttpError } from "./http-errors.ts";

describe("gift metadata sanitization", () => {
  it("normalizes sender display name", () => {
    assert.equal(sanitizeSenderDisplayName("  Alex   K.  "), "Alex K.");
  });

  it("rejects empty sender display name", () => {
    assert.throws(
      () => sanitizeSenderDisplayName("   "),
      (error) => error instanceof HttpError && error.status === 400
    );
  });

  it("trims gift message and allows empty", () => {
    assert.equal(sanitizeGiftMessage("  hi  "), "hi");
    assert.equal(sanitizeGiftMessage(""), undefined);
    assert.equal(sanitizeGiftMessage(undefined), undefined);
  });

  it("builds metadata record", () => {
    const meta = buildGiftMetadata("Alex K.", "Happy birthday!");
    assert.equal(meta.senderDisplayName, "Alex K.");
    assert.equal(meta.giftMessage, "Happy birthday!");
    assert.ok(meta.createdAt);
  });
});
