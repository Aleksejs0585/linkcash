"use client";

import { useEffect } from "react";

function shouldUseReplaceForOAuthRedirect(resolvedHref: string): boolean {
  try {
    const next = new URL(resolvedHref, window.location.href);
    if (next.origin === window.location.origin) {
      return false;
    }
    const host = next.hostname.toLowerCase();
    if (host === "privy.io" || host.endsWith(".privy.io")) {
      return true;
    }
    if (host === "twitter.com" || host.endsWith(".twitter.com")) {
      return true;
    }
    if (host === "x.com" || host.endsWith(".x.com")) {
      return true;
    }
    if (host === "accounts.google.com") {
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * Privy redirects to OAuth with `location.assign`, which keeps the app page under the
 * provider in session history so Back can return to X/Twitter after login. For known
 * OAuth hosts we delegate to `replace` instead so the in-app entry is not stacked
 * above the provider (full removal of the provider from history still depends on the
 * return redirect chain).
 */
export function PrivyOAuthLocationPatch() {
  useEffect(() => {
    const loc = window.location;
    const assign = Location.prototype.assign;
    const replace = Location.prototype.replace;
    const restoreAssign = assign.bind(loc);

    (loc as Location & { assign: typeof assign }).assign = function patchedAssign(
      url: string | URL,
    ) {
      const href = typeof url === "string" ? url : url.href;
      if (shouldUseReplaceForOAuthRedirect(href)) {
        replace.call(loc, url);
        return;
      }
      assign.call(loc, url);
    };

    return () => {
      (loc as Location & { assign: typeof assign }).assign = restoreAssign;
    };
  }, []);

  return null;
}
