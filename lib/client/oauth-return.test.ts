import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import {
  AUTO_CLAIM_AFTER_AUTH_KEY,
  OAUTH_RETURN_KEY,
  consumeAutoClaimAfterAuth,
  getCurrentAppPath,
  markAutoClaimAfterAuth,
  resumeOAuthReturnTarget,
  saveOAuthReturnTarget,
} from "./oauth-return.ts";

describe("oauth return", () => {
  const storage = new Map<string, string>();

  beforeEach(() => {
    storage.clear();
    globalThis.sessionStorage = {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => {
        storage.set(key, value);
      },
      removeItem: (key: string) => {
        storage.delete(key);
      },
      clear: () => storage.clear(),
      key: () => null,
      length: 0,
    } as Storage;

    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: {
        location: {
          pathname: "/",
          search: "",
          hash: "",
          assign: () => undefined,
        },
      },
    });
  });

  afterEach(() => {
    Reflect.deleteProperty(globalThis, "window");
  });

  it("saves gift path with hash fragment", () => {
    window.location.pathname = "/gift/0xabc";
    window.location.hash = "#0xsecret";
    saveOAuthReturnTarget();
    assert.equal(storage.get(OAUTH_RETURN_KEY), "/gift/0xabc#0xsecret");
  });

  it("resumes when current path differs from saved", () => {
    let assigned = "";
    window.location.assign = (url: string) => {
      assigned = url;
    };
    storage.set(OAUTH_RETURN_KEY, "/gift/0xabc#0xsecret");
    window.location.pathname = "/";
    window.location.hash = "";

    const redirected = resumeOAuthReturnTarget();
    assert.equal(redirected, true);
    assert.equal(assigned, "/gift/0xabc#0xsecret");
    assert.equal(storage.has(OAUTH_RETURN_KEY), false);
  });

  it("tracks auto-claim flag", () => {
    markAutoClaimAfterAuth();
    assert.equal(consumeAutoClaimAfterAuth(), true);
    assert.equal(consumeAutoClaimAfterAuth(), false);
  });

  it("getCurrentAppPath includes search and hash", () => {
    window.location.pathname = "/gift/0x1";
    window.location.search = "?x=1";
    window.location.hash = "#0xs";
    assert.equal(getCurrentAppPath(), "/gift/0x1?x=1#0xs");
  });
});
