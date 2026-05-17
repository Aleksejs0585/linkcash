"use client";

import { useState } from "react";

export default function LinkCopyDemo() {
  const [copied, setCopied] = useState(false);
  const onCopy = async () => {
    try {
      const url = `${window.location.origin}/gift/a7f3k9x2#s3cr3t`;
      await navigator.clipboard.writeText(url);
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
          <span className="path">gift/a7f3k9x2</span>
          <span className="secret">#s3cr3t</span>
        </div>
        <button type="button" className="landing-link-copy" onClick={onCopy}>
          {copied ? "Copied!" : "Copy link"}
        </button>
      </div>
    </div>
  );
}
