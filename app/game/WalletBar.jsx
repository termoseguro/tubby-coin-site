"use client";

// The sign-in control, and the one honest sentence about what it changes.
//
// A player who has not signed in is playing a save that lives in their own
// browser and that they could edit with devtools in ten seconds. That is not a
// secret to keep — telling them plainly is what makes the signed-in state worth
// anything, and a game that pretends its localStorage save is secure is a game
// whose first cheater is also its first scandal.

import { useState } from "react";
import { INSTALL_URL, hasWallet, signIn, signOut } from "../../lib/wallet.js";

export default function WalletBar({ online, onChanged }) {
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState(null);

  async function connect() {
    setBusy(true);
    setProblem(null);
    try {
      if (!hasWallet()) {
        setProblem("No Solana wallet in this browser.");
        return;
      }
      await signIn();
      onChanged?.();
    } catch (e) {
      // A user closing the wallet popup is not an error worth shouting about.
      const rejected = /reject|denied|cancell?ed|user/i.test(e?.message || "");
      setProblem(rejected ? null : e.message || "Sign-in failed.");
    } finally {
      setBusy(false);
    }
  }

  async function disconnect() {
    setBusy(true);
    await signOut();
    setBusy(false);
    onChanged?.();
  }

  if (online === null) return null;

  if (online) {
    return (
      <div className="tt-wallet on">
        <span className="tt-wallet-dot" aria-hidden="true" />
        <span className="tt-wallet-txt">
          <b>Saved on the server</b>
          <small>Your town is safe on any device.</small>
        </span>
        <button type="button" className="tt-mini" disabled={busy} onClick={disconnect}>
          Sign out
        </button>
      </div>
    );
  }

  return (
    <div className="tt-wallet">
      <span className="tt-wallet-dot off" aria-hidden="true" />
      <span className="tt-wallet-txt">
        <b>Playing as a guest</b>
        <small>
          {problem || "This town is stored in this browser only. Connect a wallet to keep it."}
        </small>
      </span>
      {hasWallet() ? (
        <button type="button" className="tt-mini gold" disabled={busy} onClick={connect}>
          {busy ? "Waiting…" : "Connect"}
        </button>
      ) : (
        <a className="tt-mini gold" href={INSTALL_URL} target="_blank" rel="noreferrer noopener">
          Get a wallet
        </a>
      )}
    </div>
  );
}
