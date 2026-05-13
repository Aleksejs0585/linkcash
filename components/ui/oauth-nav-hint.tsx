type OAuthNavHintProps = {
  className?: string;
};

/**
 * Explains browser history on the OAuth provider domain (e.g. Google).
 * The app cannot intercept the system Back button while the user is on accounts.google.com.
 */
export default function OAuthNavHint({ className }: OAuthNavHintProps) {
  return (
    <p
      className={
        className ??
        "text-center text-xs leading-relaxed text-white/55"
      }
    >
      If Google opens for sign-in, the browser Back button moves within Google,
      not LinkCash. Use{" "}
      <span className="font-medium text-white/75">Cancel</span> there, switch
      back to this tab, or finish sign-in. In the app, use{" "}
      <span className="font-medium text-white/75">Menu</span> for Home or the
      product site.
    </p>
  );
}
