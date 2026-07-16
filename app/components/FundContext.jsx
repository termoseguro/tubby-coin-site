"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import { config } from "../../lib/config";

const FundContext = createContext({ fundedSol: 0, live: false, loading: true });

export function useFund() {
  return useContext(FundContext);
}

const LAMPORTS_PER_SOL = 1_000_000_000;

// Read a wallet's SOL balance straight from the browser via JSON-RPC (getBalance).
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
  const { rpcUrl, artWallet, refreshMs, demoFundedSol } = config.liveData;
  const isLiveData = Boolean(config.live && rpcUrl && artWallet);

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
        const sol = await fetchBalanceSol(rpcUrl, artWallet);
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
  }, [isLiveData, rpcUrl, artWallet, refreshMs, demoFundedSol]);

  // ease the displayed number toward the target (the "counting up" wow effect)
  useEffect(() => {
    const start = display;
    const end = target;
    if (Math.abs(end - start) < 0.0001) {
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
    return () => cancelAnimationFrame(rafRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);

  return (
    <FundContext.Provider value={{ fundedSol: display, live: isLiveData, loading }}>
      {children}
    </FundContext.Provider>
  );
}
