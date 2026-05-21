export function isDeviceBindingError(message: string): boolean {
  return (
    /device id is not found/i.test(message) ||
    /provided device id is not found/i.test(message) ||
    /device token is invalid/i.test(message)
  );
}

export function formatGiftTxError(message: string): string {
  if (isDeviceBindingError(message)) {
    return "Wallet session expired. Please sign out and sign in with Google again.";
  }

  if (/gift active/i.test(message)) {
    return "This gift is still active. You can reclaim USDC only after the expiry time.";
  }

  if (/gift exists/i.test(message)) {
    return "A gift with this id already exists onchain. Create a new gift to get a fresh link.";
  }

  if (/gift expired/i.test(message)) {
    return "This gift has expired and can no longer be claimed by the recipient.";
  }

  if (/gift claimed/i.test(message)) {
    return "This gift was already claimed or reclaimed.";
  }

  if (/gift missing/i.test(message)) {
    return "No gift found for this link onchain.";
  }

  return message;
}
