"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import { config } from "../../lib/config";

const FundContext = createContext({ basketSol: 0, live: false, loading: true });

export function useFund() {
  return useContext(FundContext);
}

const LAMPORTS_PER_SOL = 1_000_000_000;

// Read the Tubby Cares wallet balance straight from the browser (getBalance).
// NOTE: this is the BASKET, not the total ever raised. The balance drops to
// zero every time we go shopping, so "delivered so far" comes from the signed
// delivery log in config.care.deliveries, never from here.
// Public RPCs (Helius/QuickNode/Triton) allow CORS reads — no backend required.
async function fetchBalanceSol(rpcUrl, wallet) {
  const res = await fetch(rpcUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "getBalance",
      params: [wallet, { commitment: "confirmed" }],
    }),
  });
  if (!res.ok) throw new Error(`RPC ${res.status}`);
  const json = await res.json();
  if (json.error) throw new Error(json.error.message || "RPC error");
  return (json.result?.value ?? 0) / LAMPORTS_PER_SOL;
}

export function FundProvider({ children }) {
  const { rpcUrl, careWallet, refreshMs, demoFundedSol } = config.liveData;
  const isLiveData = Boolean(config.live && rpcUrl && careWallet);

  // target = the real (or demo) number we ease toward
  const [target, setTarget] = useState(isLiveData ? 0 : demoFundedSol);
  const [display, setDisplay] = useState(0);
  const [loading, setLoading] = useState(isLiveData);
  const rafRef = useRef();

  // pull live balance on an interval (or stay on the demo number)
  useEffect(() => {
    if (!isLiveData) {
      setTarget(demoFundedSol);
      setLoading(false);
      return;
    }
    let cancelled = false;
    async function tick() {
      try {
        const sol = await fetchBalanceSol(rpcUrl, careWallet);
        if (!cancelled) {
          setTarget(sol);
          setLoading(false);
        }
      } catch (e) {
        // keep last known value on error; stop the spinner
        if (!cancelled) setLoading(false);
      }
    }
    tick();
    const id = setInterval(tick, refreshMs || 30000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [isLiveData, rpcUrl, careWallet, refreshMs, demoFundedSol]);

  // Re-run the easing when the tab becomes visible. Without this the effect
  // below only ever fires on a target change, and a tab that was hidden when
  // the value arrived never gets a second chance.
  const [awake, setAwake] = useState(0);
  useEffect(() => {
    const onVisible = () => {
      if (!document.hidden) setAwake((n) => n + 1);
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, []);

  // Ease the displayed number toward the target — the "counting up" effect.
  //
  // THE ANIMATION IS AN ENHANCEMENT, NEVER THE SOURCE OF THE VALUE. It used to
  // be the only thing that ever wrote `display`, and it runs on
  // requestAnimationFrame, which does not fire in a background tab. So opening
  // the site in a new tab — middle click, "open in new tab", clicking through
  // from a thread while reading something else — left the headline number of
  // the whole project reading 0.00 SOL, under a badge saying DEMO DATA, for
  // the entire session. It never recovered, because the effect depended only
  // on `target` and `target` had already arrived.
  //
  // Now: a hidden tab snaps straight to the value, and anything that stops the
  // frames mid-flight is caught by a timer that snaps to the end.
  useEffect(() => {
    const start = display;
    const end = target;
    if (Math.abs(end - start) < 0.0001) {
      setDisplay(end);
      return;
    }
    // Nobody is watching a hidden tab, and no frame will come. Be correct
    // rather than animated.
    if (typeof document !== "undefined" && document.hidden) {
      setDisplay(end);
      return;
    }

    const dur = 1400;
    const t0 = performance.now();
    const step = (now) => {
      const p = Math.min(1, (now - t0) / dur);
      const eased = 1 - Math.pow(1 - p, 3); // easeOutCubic
      setDisplay(start + (end - start) * eased);
      if (p < 1) rafRef.current = requestAnimationFrame(step);
    };
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(step);

    // The backstop: if the frames stop for any reason — throttling, the tab
    // hiding mid-animation, a browser that pauses rAF we have not met yet —
    // land on the real number anyway.
    const failsafe = setTimeout(() => setDisplay(end), dur + 400);

    return () => {
      cancelAnimationFrame(rafRef.current);
      clearTimeout(failsafe);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, awake]);

  return (
    <FundContext.Provider value={{ basketSol: display, live: isLiveData, loading }}>
      {children}
    </FundContext.Provider>
  );
}
