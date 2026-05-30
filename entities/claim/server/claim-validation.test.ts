import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { keccak256 } from "ethers";
import { parseClaimInput } from "./claim-validation.ts";

const VALID_SECRET = "0x" + "aa".repeat(32);
const VALID_HASH = keccak256(VALID_SECRET);
const VALID_ADDRESS = "0x" + "cd".repeat(20);

describe("parseClaimInput", () => {
  it("accepts a valid payload", () => {
    const result = parseClaimInput({
      secret: VALID_SECRET,
      paymentIdHash: VALID_HASH,
      receiverAddress: VALID_ADDRESS,
    });
    assert.equal(result.secret, VALID_SECRET);
    assert.equal(result.receiverAddress.toLowerCase(), VALID_ADDRESS.toLowerCase());
  });

  it("rejects mismatched paymentIdHash", () => {
    const wrongHash = "0x" + "ff".repeat(32);
    assert.throws(
      () =>
        parseClaimInput({
          secret: VALID_SECRET,
          paymentIdHash: wrongHash,
          receiverAddress: VALID_ADDRESS,
        }),
      { message: /paymentIdHash does not match/ }
    );
  });

  it("rejects invalid secret (too short)", () => {
    assert.throws(() =>
      parseClaimInput({
        secret: "0xshort",
        paymentIdHash: VALID_HASH,
        receiverAddress: VALID_ADDRESS,
      })
    );
  });

  it("rejects invalid receiverAddress", () => {
    assert.throws(() =>
      parseClaimInput({
        secret: VALID_SECRET,
        paymentIdHash: VALID_HASH,
        receiverAddress: "not-an-address",
      })
    );
  });

  it("rejects non-object input", () => {
    assert.throws(() => parseClaimInput(null));
    assert.throws(() => parseClaimInput("string"));
  });

  it("rejects missing fields", () => {
    assert.throws(() =>
      parseClaimInput({ secret: VALID_SECRET, paymentIdHash: VALID_HASH })
    );
  });
});
