"use client";

import { useFund } from "./FundContext";
import { nextMilestone } from "./MilestoneBar";

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
