export function isCircleWalletConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_CIRCLE_APP_ID?.trim() &&
      process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID?.trim()
  );
}
