import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  formatCircleAuthError,
  shouldClearStoredUserSession,
  shouldResetCircleDeviceBinding,
} from "./auth-errors.ts";

describe("formatCircleAuthError", () => {
  it("maps invalid credentials to a helpful message", () => {
    const msg = formatCircleAuthError("Invalid credentials.");
    assert.match(msg, /Google sign-in failed/i);
    assert.match(msg, /redirect URIs/i);
  });

  it("maps device token errors", () => {
    const msg = formatCircleAuthError("Device token is invalid");
    assert.match(msg, /expired/i);
  });
});

describe("shouldResetCircleDeviceBinding", () => {
  it("returns true for invalid credentials", () => {
    assert.equal(shouldResetCircleDeviceBinding("Invalid credentials."), true);
  });

  it("returns true for invalid device token", () => {
    assert.equal(
      shouldResetCircleDeviceBinding("Device token is invalid"),
      true
    );
  });

  it("returns true when Circle does not recognize device id", () => {
    assert.equal(
      shouldResetCircleDeviceBinding(
        "Provided device ID is not found in the system."
      ),
      true
    );
  });
});

describe("shouldClearStoredUserSession", () => {
  it("returns false for challenge cancellation", () => {
    assert.equal(
      shouldClearStoredUserSession("Wallet setup was cancelled."),
      false
    );
  });

  it("returns true for invalid user token", () => {
    assert.equal(shouldClearStoredUserSession("Invalid credentials."), true);
  });
});
