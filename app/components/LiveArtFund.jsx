"use client";

import { config } from "../../lib/config";
import { useFund } from "./FundContext";

// progress toward the next unmet milestone from config.milestones
function nextMilestone(fundedSol) {
  const list = config.milestones;
  const next = list.find((m) => fundedSol < m.sol) || list[list.length - 1];
  const idx = list.indexOf(next);
  const prev = idx > 0 ? list[idx - 1].sol : 0;
  const span = next.sol - prev;
  const done = fundedSol >= next.sol;
  const pct = done ? 100 : Math.max(0, Math.min(100, ((fundedSol - prev) / span) * 100));
  return { next, prev, pct, done, allDone: idx === list.length - 1 && done };
}

export default function LiveArtFund() {
  const { fundedSol, live, loading } = useFund();
  const { next, pct, allDone } = nextMilestone(fundedSol);
  const remaining = Math.max(0, next.sol - fundedSol);

  return (
    <div className="fund">
      <div className={`live-dot${live ? "" : " demo"}`}>
        <span className="d" />
        {live ? "Live on-chain" : "Preview — demo data"}
      </div>
      <div className="amount">
        {loading ? "—" : fundedSol.toFixed(2)}
        <span className="unit">SOL</span>
      </div>
      <div className="cap">Total funded back to the project</div>
      <div className="next">
        {allDone ? (
          <>Every milestone cleared — the cats are eating well. 🐱</>
        ) : (
          <>
            <b>{remaining.toFixed(2)} SOL</b> to go until {next.emoji} {next.label} ·{" "}
            {Math.round(pct)}% there
          </>
        )}
      </div>
    </div>
  );
}
