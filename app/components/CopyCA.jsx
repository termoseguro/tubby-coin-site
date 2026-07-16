"use client";

import { useState } from "react";
import { config, isLive } from "../../lib/config";

export default function CopyCA() {
  const [label, setLabel] = useState("Copy");
  const ca = config.token.contractAddress;
  const live = isLive();

  const display = live
    ? ca
    : "TBA — posted simultaneously here and on both X accounts at launch";

  function onCopy() {
    if (!live) {
      setLabel("Not live yet");
      setTimeout(() => setLabel("Copy"), 1600);
      return;
    }
    navigator.clipboard.writeText(ca).then(() => {
      setLabel("Copied!");
      setTimeout(() => setLabel("Copy"), 1600);
    });
  }

  return (
    <div className="ca-box">
      <div className="label">Contract address (Solana)</div>
      <div className="ca-row">
        <code>{display}</code>
        <button className="copy-btn" type="button" onClick={onCopy}>
          {label}
        </button>
      </div>
      <p className="ca-warn">
        ⚠️ Any address posted anywhere else before then is fake. We never DM. We never reply with a CA.
      </p>
    </div>
  );
}
