"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { config, pumpUrl, jupiterUrl, isLive } from "../../lib/config";

const BuyCtx = createContext({ open: () => {} });
export const useBuy = () => useContext(BuyCtx);

export function BuyButton({ className = "btn", children }) {
  const { open } = useBuy();
  return (
    <button type="button" className={className} onClick={open}>
      {children}
    </button>
  );
}

export function BuyProvider({ children }) {
  const [isOpen, setOpen] = useState(false);
  const open = useCallback(() => setOpen(true), []);
  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e) => e.key === "Escape" && close();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [isOpen, close]);

  const live = isLive();
  const jup = jupiterUrl();

  return (
    <BuyCtx.Provider value={{ open }}>
      {children}
      {isOpen && (
        <div className="modal-overlay" onClick={close} role="dialog" aria-modal="true" aria-label="Buy $TUBBY">
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <button className="close" onClick={close} aria-label="Close">×</button>
            <h3>Buy {config.token.ticker}</h3>
            {live ? (
              <p>Pick a route. Always confirm the contract address matches the one on this page.</p>
            ) : (
              <p>Not live yet. The moment the token is created, these buttons light up — and the CA is posted here and on both X accounts at the same time.</p>
            )}

            <a
              className={`opt${live ? "" : " disabled"}`}
              href={live ? pumpUrl() : undefined}
              target="_blank"
              rel="noopener noreferrer"
              aria-disabled={!live}
            >
              <span className="ic">🚀</span>
              <span>
                pump.fun
                <small>{live ? "Buy on the bonding curve / PumpSwap" : "Opens at launch"}</small>
              </span>
            </a>

            <a
              className={`opt${live && jup ? "" : " disabled"}`}
              href={live && jup ? jup : undefined}
              target="_blank"
              rel="noopener noreferrer"
              aria-disabled={!(live && jup)}
            >
              <span className="ic">🪐</span>
              <span>
                Jupiter
                <small>{live && jup ? "Best-price aggregated swap SOL → $TUBBY" : "Available once liquidity migrates"}</small>
              </span>
            </a>

            <p className="modal-warn">⚠️ We never DM and never post a CA anywhere before posting it here first. Any other address is fake.</p>
          </div>
        </div>
      )}
    </BuyCtx.Provider>
  );
}
