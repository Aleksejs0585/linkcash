import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { parseCreateGiftInput, parseReclaimGiftInput } from "./gift-validation.ts";

const VALID_HASH = "0x" + "ab".repeat(32);
const VALID_ADDRESS = "0x" + "cd".repeat(20);

describe("parseCreateGiftInput", () => {
  const base = {
    paymentIdHash: VALID_HASH,
    amountUsdc: "10",
    refundAddress: VALID_ADDRESS,
    expiresInHours: 24,
    senderDisplayName: "Alice",
  };

  it("accepts a valid payload", () => {
    const result = parseCreateGiftInput(base);
    assert.equal(result.amountUsdc, "10");
    assert.equal(result.senderDisplayName, "Alice");
  });

  it("accepts optional fields", () => {
    const result = parseCreateGiftInput({
      ...base,
      giftMessage: "Happy birthday",
      senderEmail: "alice@example.com",
    });
    assert.equal(result.giftMessage, "Happy birthday");
    assert.equal(result.senderEmail, "alice@example.com");
  });

  it("rejects invalid paymentIdHash", () => {
    assert.throws(() => parseCreateGiftInput({ ...base, paymentIdHash: "0xshort" }), {
      message: /paymentIdHash/,
    });
  });

  it("rejects amount below 0.01", () => {
    assert.throws(() => parseCreateGiftInput({ ...base, amountUsdc: "0.001" }), {
      message: /0\.01/,
    });
  });

  it("rejects amount above 10000", () => {
    assert.throws(() => parseCreateGiftInput({ ...base, amountUsdc: "10001" }), {
      message: /10000/,
    });
  });

  it("rejects zero amount", () => {
    assert.throws(() => parseCreateGiftInput({ ...base, amountUsdc: "0" }));
  });

  it("rejects invalid refundAddress", () => {
    assert.throws(() => parseCreateGiftInput({ ...base, refundAddress: "not-an-address" }), {
      message: /refundAddress/,
    });
  });

  it("rejects expiresInHours above 720", () => {
    assert.throws(() => parseCreateGiftInput({ ...base, expiresInHours: 721 }), {
      message: /expiresInHours/,
    });
  });

  it("rejects expiresInHours of 0", () => {
    assert.throws(() => parseCreateGiftInput({ ...base, expiresInHours: 0 }));
  });

  it("rejects invalid senderEmail", () => {
    assert.throws(() =>
      parseCreateGiftInput({ ...base, senderEmail: "not-an-email" })
    );
  });

  it("rejects unknown fields (strict schema)", () => {
    assert.throws(() => parseCreateGiftInput({ ...base, unknownField: "x" }));
  });

  it("rejects non-object input", () => {
    assert.throws(() => parseCreateGiftInput("string"));
    assert.throws(() => parseCreateGiftInput(null));
    assert.throws(() => parseCreateGiftInput(42));
  });
});

describe("parseReclaimGiftInput", () => {
  it("accepts valid payload", () => {
    const result = parseReclaimGiftInput({
      paymentIdHash: VALID_HASH,
      callerAddress: VALID_ADDRESS,
    });
    assert.equal(result.paymentIdHash, VALID_HASH);
  });

  it("rejects invalid callerAddress", () => {
    assert.throws(() =>
      parseReclaimGiftInput({ paymentIdHash: VALID_HASH, callerAddress: "bad" })
    );
  });

  it("rejects invalid paymentIdHash", () => {
    assert.throws(() =>
      parseReclaimGiftInput({ paymentIdHash: "0xshort", callerAddress: VALID_ADDRESS })
    );
  });
});
