"use client";

import { useState } from "react";

export default function LinkCopyDemo() {
  const [copied, setCopied] = useState(false);
  const demoUrl = "https://linkcash.app/claim/a7f3k9x2";

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(demoUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="landing-link-demo">
      <div className="landing-link-pill">
        <div className="landing-link-text">
          <span className="base">linkcash.app/</span>
          <span className="path">claim/</span>
          <span className="secret">a7f3k9x2</span>
        </div>
        <button type="button" className="landing-link-copy" onClick={onCopy}>
          {copied ? "Copied!" : "Copy link"}
        </button>
      </div>
    </div>
  );
}
