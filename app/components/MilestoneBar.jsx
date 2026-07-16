"use client";

import { config } from "../../lib/config";
import { useFund } from "./FundContext";

export function nextMilestone(fundedSol) {
  const list = config.milestones;
  const next = list.find((m) => fundedSol < m.sol) || list[list.length - 1];
  const idx = list.indexOf(next);
  const prev = idx > 0 ? list[idx - 1].sol : 0;
  const span = next.sol - prev;
  const done = fundedSol >= next.sol;
  const pct = done ? 100 : Math.max(0, Math.min(100, ((fundedSol - prev) / span) * 100));
  return { next, prev, pct, done, allDone: idx === list.length - 1 && done };
}

export default function MilestoneBar() {
  const { fundedSol } = useFund();
  const { next, pct, allDone } = nextMilestone(fundedSol);

  return (
    <div className="milestone-bar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(pct)}>
      <div className="mb-in">
        <span className="mb-label">
          {next.emoji} {allDone ? "All milestones cleared" : next.label}
        </span>
        <div className="mb-track">
          <div className="mb-fill" style={{ width: `${pct}%` }} />
        </div>
        <span className="mb-val">
          <b>{fundedSol.toFixed(2)}</b> / {next.sol} SOL
        </span>
      </div>
    </div>
  );
}
