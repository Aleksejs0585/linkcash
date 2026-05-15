export function shouldResetCircleDeviceBinding(message: string): boolean {
  return (
    /device token is invalid/i.test(message) ||
    /invalid credentials?/i.test(message)
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

  if (/popup closed|user closed|cancel/i.test(message)) {
    return "Sign-in was cancelled. Click Sign in with Google to try again.";
  }

  return message;
}
