"use client";

// PALIS RAIDS — the panel.
//
// Written to answer three questions in the order a player actually asks them,
// because a fight screen that buries any of them gets tapped blind:
//
//    1. Can I win?          the odds, as a WORD first and a number second
//    2. What do I get?      the purse, and the permanent raise behind it
//    3. What does it cost?  cats at half speed until the Clinic sees them
//
// The second one carries the design. Kingshot's Rebel Suppression is not a
// side mode — the stage you have reached permanently raises your idle Gold, so
// this panel leads with "every stage is +7% Gold forever" rather than with the
// loot. That line is why a player who does not care about fighting still cares
// about this ladder.

import {
  RAID_BANK,
  RAID_EVERY_HOURS,
  nextRaidIn,
  oddsLabel,
  palisPower,
  raidGoldMultiplier,
  raidLoot,
  raidsReady,
  townPower,
  winChance,
} from "../../../lib/townRaids";
import { RESOURCES } from "../../../lib/townEconomy";
import { IconGold, IconFish, IconStone, IconWood, IconPaw } from "../icons";

const ICON = { coin: IconGold, wood: IconWood, fish: IconFish, stone: IconStone };

function fmt(n) {
  n = Math.floor(n || 0);
  if (n >= 1e6) return (n / 1e6).toFixed(2) + "M";
  if (n >= 1e3) return (n / 1e3).toFixed(1) + "K";
  return String(n);
}

function clock(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h) return `${h}h ${m}m`;
  return `${m}m ${s % 60}s`;
}

export default function RaidPanel({
  save,
  levels,
  hurtCount,
  clinicLevel,
  healPrice,
  onRaid,
  onHeal,
  onClose,
}) {
  const stage = (save.raidStage || 0) + 1;
  const mine = townPower(save, levels);
  const theirs = palisPower(stage);
  const chance = winChance(mine, theirs);
  const ready = raidsReady(save.lastRaidAt);
  const wait = nextRaidIn(save.lastRaidAt);
  const loot = raidLoot(stage);
  const goldNow = raidGoldMultiplier(save.raidStage || 0);
  const goldNext = raidGoldMultiplier(stage);

  return (
    <div className="tt-sheet-wrap" onClick={onClose}>
      <section className="tt-sheet tt-raid" role="dialog" aria-label="Palis raids" onClick={(e) => e.stopPropagation()}>
        <button className="tt-sheet-x" type="button" aria-label="Close" onClick={onClose}>
          ✕
        </button>

        <header className="tt-sheet-head">
          <span className="tt-sheet-swatch" style={{ background: "#8a5cc4" }} />
          <div>
            <h3>Palis is at the gate</h3>
            <p className="tt-sheet-lvl">Stage {stage}</p>
          </div>
        </header>

        <p className="tt-sheet-desc">
          Palis comes back every {RAID_EVERY_HOURS} hours and the town remembers up to{" "}
          {RAID_BANK} visits, so nothing is lost by having a life. Every cat on shift
          defends — there is no separate army to raise.
        </p>

        {/* THE REASON TO CARE, first. Not the loot — the permanent raise. */}
        <div className="tt-raid-why">
          <IconGold size={22} />
          <div>
            <b>Every stage cleared is +7% Gold, forever</b>
            <small>
              now ×{goldNow.toFixed(2)} → ×{goldNext.toFixed(2)} if you win this one
            </small>
          </div>
        </div>

        {/* THE ODDS. A word, then the numbers behind it. */}
        <div className={"tt-raid-odds o-" + oddsLabel(chance).toLowerCase()}>
          <div className="tt-raid-word">
            <b>{oddsLabel(chance)}</b>
            <small>{Math.round(chance * 100)}% to win</small>
          </div>
          <div className="tt-raid-bars">
            <div className="tt-raid-side">
              <small>Your town</small>
              <b className="mono">{fmt(mine)}</b>
            </div>
            <div className="tt-raid-bar">
              <i style={{ width: `${Math.min(100, (mine / (mine + theirs)) * 100)}%` }} />
            </div>
            <div className="tt-raid-side right">
              <small>Palis</small>
              <b className="mono">{fmt(theirs)}</b>
            </div>
          </div>
        </div>

        <div className="tt-raid-loot">
          <small>Wins</small>
          <div>
            {Object.entries(loot).map(([k, v]) => {
              const Icon = ICON[k];
              return (
                <span key={k} style={{ color: RESOURCES[k]?.color }}>
                  <Icon size={16} /> {fmt(v)}
                </span>
              );
            })}
          </div>
        </div>

        {/* WHAT IT COSTS. Stated before the button, never after. */}
        <p className="tt-sheet-note">
          Cats come back hurt and work at half speed until the Cat Clinic sees them.
          Nothing is destroyed and the stage never falls — a loss costs time, never
          progress.
        </p>

        {ready > 0 ? (
          <button className="tt-btn" type="button" onClick={onRaid}>
            <IconPaw size={17} />
            Defend the town · {ready} of {RAID_BANK} ready
          </button>
        ) : (
          <p className="tt-sheet-note locked">Palis returns in {clock(wait)}.</p>
        )}

        {hurtCount > 0 && (
          <div className="tt-raid-hurt">
            <p>
              <b>{hurtCount}</b> hurt cat{hurtCount === 1 ? "" : "s"} working at half speed.
            </p>
            {clinicLevel >= 1 ? (
              <button className="tt-mini" type="button" onClick={onHeal}>
                Patch them up · {healPrice} <IconGold size={14} />
              </button>
            ) : (
              <small>Build the Cat Clinic to patch them up.</small>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
