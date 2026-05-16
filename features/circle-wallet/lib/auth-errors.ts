export function isAuthCancellation(message: string): boolean {
  return /popup closed|user closed|cancel/i.test(message);
}

export function shouldResetCircleDeviceBinding(message: string): boolean {
  return (
    /device token is invalid/i.test(message) ||
    /invalid credentials?/i.test(message) ||
    isStaleCircleDeviceIdError(message)
  );
}

export function isStaleCircleDeviceIdError(message: string): boolean {
  return (
    /device id is not found/i.test(message) ||
    /provided device id is not found/i.test(message)
  );
}

/** Drop stored Circle user session after API rejects user credentials. */
export function shouldClearStoredUserSession(message: string): boolean {
  return (
    /invalid credentials?/i.test(message) ||
    /user token is invalid/i.test(message) ||
    /unauthorized/i.test(message) ||
    /session expired/i.test(message) ||
    /token expired/i.test(message)
  );
}

export function formatCircleAuthError(message: string): string {
  if (/invalid credentials?/i.test(message)) {
    return (
      "Google sign-in failed (invalid credentials). " +
      "Open LinkCash in one browser tab, complete Google sign-in there, then return here. " +
      "If it persists: clear site cookies for this domain and try again. " +
      "The live site URL must match redirect URIs in Circle Console and Google Cloud."
    );
  }

  if (/device token is invalid/i.test(message)) {
    return "Wallet session expired. Click Sign in with Google again.";
  }

  if (isStaleCircleDeviceIdError(message)) {
    return (
      "Device binding was reset. Refresh this page and click Sign in with Google again. " +
      "If it repeats, clear site data for this domain (cookies + local storage)."
    );
  }

  if (isAuthCancellation(message)) {
    return "Sign-in was cancelled. Click Sign in with Google to try again.";
  }

  return message;
}
