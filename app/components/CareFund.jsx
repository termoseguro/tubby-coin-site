"use client";

import { config, deliveredSol } from "../../lib/config";
import { useFund } from "./FundContext";

const isReal = (u) => Boolean(u) && u !== "#";

// Progress toward the next run that has not gone out yet. Runs are cumulative
// targets in config.milestones — the basket has to hold that much before we
// go shopping.
function nextRun(basketSol) {
  const list = config.milestones;
  const next = list.find((m) => basketSol < m.sol) || list[list.length - 1];
  const idx = list.indexOf(next);
  const prev = idx > 0 ? list[idx - 1].sol : 0;
  const span = next.sol - prev;
  const done = basketSol >= next.sol;
  const pct = done ? 100 : Math.max(0, Math.min(100, ((basketSol - prev) / span) * 100));
  return { next, pct, done, allDone: idx === list.length - 1 && done };
}

export default function CareFund() {
  const { basketSol, live, loading } = useFund();
  const { next, pct, allDone } = nextRun(basketSol);
  const remaining = Math.max(0, next.sol - basketSol);
  const runs = config.care.deliveries || [];
  const delivered = deliveredSol();

  return (
    <div className="fund">
      <div className={`live-dot${live ? "" : " demo"}`}>
        <span className="d" />
        {live ? "Live on-chain" : "Preview — demo data"}
      </div>

      {/* The live number is the BASKET: what the wallet holds right now, waiting
          to be spent. It is not a running total — it empties on every run. */}
      <div className="amount">
        {loading ? "—" : basketSol.toFixed(2)}
        <span className="unit">SOL</span>
      </div>
      <div className="cap">in the basket, waiting for the next run</div>

      <div className="fund-bar" role="presentation">
        <i style={{ width: `${pct}%` }} />
      </div>

      <div className="next">
        {allDone ? (
          <>Every planned run is funded — time to go shopping. 🛒</>
        ) : (
          <>
            <b>{remaining.toFixed(2)} SOL</b> to go until {next.emoji} {next.label} ·{" "}
            {next.items} · {Math.round(pct)}% there
          </>
        )}
      </div>

      {/* Delivered comes from the signed log, never from the chain balance —
          the balance is zero right after a delivery, which is the opposite of
          what actually happened. */}
      <div className="fund-done">
        {runs.length === 0 ? (
          <>
            No runs yet — the first one goes out at {config.milestones[0].sol} SOL, with
            receipts and photos of every item.
          </>
        ) : (
          <>
            <b>
              {runs.length} run{runs.length === 1 ? "" : "s"} delivered
            </b>{" "}
            · {delivered.toFixed(2)} SOL turned into goods
            {isReal(config.links.deliveryLog) && (
              <>
                {" "}
                ·{" "}
                <a href={config.links.deliveryLog} target="_blank" rel="noopener">
                  see the receipts
                </a>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
