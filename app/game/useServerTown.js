"use client";

// THE BRIDGE — the game, talking to the authority.
//
// TWO MODES, ON PURPOSE.
//
//   GUEST      no wallet. The town lives in localStorage exactly as it always
//              has, the browser computes everything, and it is completely
//              cheatable — which is fine, because nothing of value is attached
//              to it. A guest cheating cheats only themselves.
//
//   SIGNED IN  a wallet signed the server's challenge. The server owns the
//              state, the clock and the rules; this hook sends INTENTS and
//              renders whatever comes back.
//
// Forcing a wallet before the first screen would cost most of the funnel, and
// most players never sign in at all. So the game stays playable without one and
// the moment anything is worth money — a season payout, a purchase, a hold tier
// — it is only available to an account the server can vouch for.
//
// OPTIMISTIC, BUT NOT AUTHORITATIVE. A tap applies locally so the UI answers
// instantly, and the server's reply REPLACES that guess rather than merging
// with it. If the two disagree, the server is right and the screen corrects
// itself — which is what "the client is a renderer" means in practice.

import { useCallback, useEffect, useRef, useState } from "react";

/** What the server will accept. Kept in step with INTENTS in
 *  lib/server/town.js — an intent the server does not know is a 400, and it is
 *  better to find that out here than in a player's face. */
export const SERVER_INTENTS = ["sync", "start_upgrade", "assign", "unassign", "collect_alley"];

const SYNC_EVERY_MS = 60_000;

export function useServerTown() {
  // null = still finding out. false = guest. true = the server has us.
  const [online, setOnline] = useState(null);
  const [state, setState] = useState(null);
  const [error, setError] = useState(null);
  const version = useRef(0);
  const inflight = useRef(false);

  /** Ask the server who we are. A 401 is not an error — it is a guest. */
  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/town", { credentials: "same-origin", cache: "no-store" });
      if (res.status === 401) {
        setOnline(false);
        return null;
      }
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "Could not reach the town.");
      version.current = json.version;
      setState(json.state);
      setOnline(true);
      setError(null);
      return json.state;
    } catch (e) {
      // A network failure is not a logout. Staying in whatever mode we were in
      // means a flaky connection does not throw the player back to guest and
      // lose the screen they were on.
      setError(e.message);
      if (online === null) setOnline(false);
      return null;
    }
  }, [online]);

  useEffect(() => {
    load();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // A slow heartbeat, so a build that finished while the tab sat idle appears
  // without a reload. The server computes it; this only asks.
  useEffect(() => {
    if (online !== true) return;
    const id = setInterval(() => {
      if (document.visibilityState === "visible") act("sync");
    }, SYNC_EVERY_MS);
    return () => clearInterval(id);
  }, [online]); // eslint-disable-line react-hooks/exhaustive-deps

  /**
   * Do one thing.
   *
   * The idempotency key is generated HERE and reused across retries, so a
   * dropped response never becomes a second purchase. A fresh key per attempt
   * would make the whole mechanism decorative.
   */
  const act = useCallback(
    async (intent, args = {}, { key = crypto.randomUUID() } = {}) => {
      if (online !== true) return { ok: false, guest: true };
      if (inflight.current && intent !== "sync") {
        // One intent at a time. Two in flight against the same town means one
        // of them loses the version check and the player sees a conflict they
        // did not cause.
        return { ok: false, busy: true };
      }
      inflight.current = true;
      try {
        const res = await fetch("/api/town/act", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify({ intent, args, key }),
        });
        const json = await res.json().catch(() => ({}));

        if (res.status === 401) {
          setOnline(false);
          return { ok: false, guest: true };
        }
        if (res.status === 409) {
          // Somebody else moved the town — another tab, or a retry that landed.
          // Re-read rather than guessing which of the two is current.
          await load();
          return { ok: false, error: json.error };
        }
        if (!res.ok || !json.ok) {
          setError(json.error || "That did not work.");
          return { ok: false, error: json.error };
        }

        version.current = json.version;
        setState(json.state);
        setError(null);
        return { ok: true, state: json.state, result: json.result };
      } catch (e) {
        setError(e.message);
        return { ok: false, error: e.message };
      } finally {
        inflight.current = false;
      }
    },
    [online, load]
  );

  return { online, state, error, act, reload: load, clearError: () => setError(null) };
}
