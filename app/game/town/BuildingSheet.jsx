"use client";

// The panel that opens when a building is tapped.
//
// A bottom sheet, not a full-screen modal, on purpose: the player keeps seeing
// their town while they decide. That is what makes an upgrade feel like it is
// happening to a place rather than inside a menu.
//
// Structured the way Kingshot structures it: what it produces NOW, what it will
// produce at the next level, the full multi-resource cost with have/need on
// every line, the build time, and whether a builder is free.

import { BUILDINGS, BUILDING_INFO } from "../../../lib/townConfig";
import { EFFECTS, itemCap, itemCost, itemSeconds } from "../../../lib/townFurniture";
import { MAX_HELPS_PER_JOB, helpReduction, helpsLeft } from "../../../lib/townAlliance";
import { HELPS_TO_CLEAR, PROBLEMS, fixCost as palisFixCost, fixReward as palisFixReward } from "../../../lib/palis";
import {
  PRODUCERS,
  REFINERS,
  RESOURCES,
  UNLOCKS,
  buildSecondsFor,
  maxLevelFor,
  catPower,
  crewPower,
  effectiveRate,
  ratePerHour,
  rushCost,
  staffing,
  cottageBeds,
  canAfford as affords,
  producedOver,
  BOOST,
  boostCost,
  MAX_BUILDERS,
  topUpCost,
  shortfall,
  upgradeCostFor,
} from "../../../lib/townEconomy";
import {
  IconBiscuit,
  IconCatnip,
  IconFish,
  IconGold,
  IconGoldFish,
  IconHouse,
  IconPaw,
  IconStone,
  IconTreat,
  IconWood,
} from "../icons";

const ICON = {
  fish: IconFish,
  wood: IconWood,
  stone: IconStone,
  catnip: IconCatnip,
  treats: IconBiscuit,
  coin: IconGold,
};

function fmt(n) {
  n = Math.floor(n || 0);
  if (n >= 1e6) return (n / 1e6).toFixed(2) + "M";
  if (n >= 1e4) return (n / 1e3).toFixed(0) + "K";
  if (n >= 1e3) return (n / 1e3).toFixed(1) + "K";
  return String(n);
}

function clock(sec) {
  if (sec <= 0) return "done";
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  if (h) return `${h}h ${m}m`;
  if (m) return `${m}m ${s}s`;
  return `${s}s`;
}

export default function BuildingSheet({
  id,
  level,
  job,
  rate = 0,
  gate = [],
  items = [],
  itemLevels = {},
  bonuses = null,
  rushHours = 4,
  problem = null,
  res,
  hallLevel,
  storehouseLevel,
  cats = 0,
  power = 0,
  blocked = [],
  starving = false,
  buildersFree,
  workingHere,
  crew = [],
  idle = [],
  slotsUsed = 0,
  slotsTotal = 0,
  slotPriceUsd = null,
  slotsHere = 1,
  boughtHere = 0,
  villagersFree = 0,
  boostUntil = 0,
  onUpgrade,
  onRush,
  onAssign,
  onUnassign,
  onBuySlot,
  onBoost,
  onBuyBuilder,
  onBuyMissing,
  onRushProduction,
  onUpgradeItem,
  onAskHelp,
  onFixProblem,
  buildersTotal = 2,
  builderPrice = 500,
  locked = false,
  plot = false,
  onMove,
  onGoTo,
  onClose,
}) {
  const b = BUILDINGS.find((x) => x.id === id);
  if (!b) return null;
  const info = BUILDING_INFO[id] || {};
  const prod = PRODUCERS[id];

  const capLevel = maxLevelFor(id, hallLevel);
  const hallCapped = level >= capLevel && id !== "hall";
  // Level 0 is an empty plot, so its first job is a BUILD, not an upgrade.
  // Same cost, same timer, same builder — only the words change, because to
  // the player raising a building and raising a field are different feelings.
  const verb = plot ? "Build" : "Upgrade to level " + (level + 1);
  const cost = upgradeCostFor(id, level);
  const missing = shortfall(cost, res);
  const canAfford = Object.keys(missing).length === 0;
  const secs = buildSecondsFor(id, level);
  const remaining = job ? Math.max(0, (job.finishesAt - Date.now()) / 1000) : 0;

  return (
    <div className="tt-sheet-wrap" onClick={onClose}>
      <section
        className="tt-sheet"
        role="dialog"
        aria-label={b.name}
        onClick={(e) => e.stopPropagation()}
      >
        <button className="tt-sheet-x" type="button" aria-label="Close" onClick={onClose}>
          ✕
        </button>
        <button className="tt-sheet-move" type="button" onClick={onMove}>
          Move
        </button>

        <header className="tt-sheet-head">
          <span
            className="tt-sheet-swatch"
            style={{ background: `#${b.roof.toString(16).padStart(6, "0")}` }}
          />
          <div>
            <h3>{b.name}</h3>
            <p className="tt-sheet-lvl">
              {locked ? `Locked · Cat Hall ${b.unlockAt}` : plot ? "Empty plot" : `Level ${level}`}
            </p>
          </div>
        </header>

        <p className="tt-sheet-desc">{info.desc}</p>

        {/* Palis's mess sits above everything: it is the only thing on this
            panel actively costing the player something right now, and clearing
            it PAYS — which is the whole reason it is a card and not a warning. */}
        {problem && !locked && (
          <div className="tt-mess">
            <div className="tt-mess-head">
              <b>{PROBLEMS[problem.kind].name}</b>
              <span className="mono">
                {(problem.helps || 0)} of {HELPS_TO_CLEAR} neighbours helped
              </span>
            </div>
            <p>{PROBLEMS[problem.kind].what}</p>
            <p className="tt-mess-effect">{PROBLEMS[problem.kind].effect}</p>
            <button className="tt-btn" type="button" onClick={onFixProblem}>
              {(() => {
                const c = palisFixCost(problem, level);
                const r = palisFixReward(problem, level);
                const costText = Object.entries(c)
                  .map(([k, v]) => `${fmt(v)} ${RESOURCES[k].short}`)
                  .join(" · ");
                return costText
                  ? `Tidy up · ${costText} → +${fmt(r.coin)} Gold`
                  : `Tidy up · free → +${fmt(r.coin)} Gold`;
              })()}
            </button>
          </div>
        )}

        {/* LOCKED — the only screen in the game with nothing to do on it, so it
            has to at least name the one thing that opens it. This is the line
            that makes a new player understand the Cat Hall. */}
        {locked && (
          <div className="tt-sheet-job">
            <p className="tt-sheet-note locked">
              Not yet. The Cat Hall opens this at level {b.unlockAt} — it is level{" "}
              {hallLevel} now.
            </p>
            <button className="tt-btn alt" type="button" onClick={() => onGoTo("hall")}>
              Go to the Cat Hall →
            </button>
          </div>
        )}

        {/* THE CHAIN — what goes in, what comes out, what it unblocks.
            Without this the player is looking at five unrelated timers. */}
        {!locked && (prod || UNLOCKS[id]) && (
          <div className="tt-chain">
            {REFINERS[id] && (
              <div className="tt-chain-step">
                <small>Uses</small>
                <div className="tt-chain-res">
                  {Object.entries(REFINERS[id]).map(([k, per]) => {
                    const Icon = ICON[k];
                    return (
                      <span key={k} style={{ color: RESOURCES[k].color }}>
                        <Icon size={16} /> {per} per
                      </span>
                    );
                  })}
                </div>
              </div>
            )}
            {prod && (
              <div className="tt-chain-step out">
                <small>Makes</small>
                <div className="tt-chain-res">
                  <span style={{ color: RESOURCES[prod.res].color }}>
                    {(() => {
                      const Icon = ICON[prod.res];
                      return <Icon size={16} />;
                    })()}{" "}
                    {fmt(rate)}/h
                  </span>
                  {/* Per DAY as well, because per-hour is too small a number to
                      feel like anything and this is now the only readout the
                      player gets about a producer. */}
                  <span className="tt-chain-day mono">{fmt(rate * 24)} a day</span>
                </div>
              </div>
            )}
            {UNLOCKS[id] && (
              <div className="tt-chain-step">
                <small>Holds back</small>
                <div className="tt-chain-res">
                  <span className="tt-chain-name">
                    {UNLOCKS[id]
                      .map((u) => BUILDINGS.find((x) => x.id === u)?.name || u)
                      .join(", ")}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* THE CREW — cats are moved by the player, one tap each. Without this
            the resources have no lever attached to them at all. */}
        {!locked && prod && (
          <div className="tt-crew">
            <div className="tt-crew-head">
              <small>Cat villagers · ×{staffing(power).toFixed(2)} output</small>
              <b className="mono">
                {villagersFree} free in town
              </b>
            </div>
            <div className="tt-crew-row">
              {Array.from({ length: slotsHere }).map((_, i) => {
                const c = crew[i];
                if (c) {
                  return (
                    <button
                      key={c.key}
                      type="button"
                      className={"tt-crew-cat r-" + c.rarity}
                      onClick={() => onUnassign(c.key)}
                      title="Take this cat off the job"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={c.art} alt="" />
                      <span>×</span>
                      <em>{catPower(c.rarity, c.level).toFixed(1)}</em>
                    </button>
                  );
                }
                const canAdd = idle.length > 0 && villagersFree > 0;
                return (
                  <button
                    key={i}
                    type="button"
                    className="tt-crew-empty"
                    onClick={() => canAdd && onAssign(idle[0]?.key)}
                    disabled={!canAdd}
                    title={
                      idle.length === 0
                        ? "Every cat already has a job"
                        : villagersFree <= 0
                          ? "The Cat Hall has no more villagers to give"
                          : "Put a cat villager to work here"
                    }
                  >
                    +
                  </button>
                );
              })}
            </div>
            {slotPriceUsd != null && (
              <button className="tt-mini gold tt-crew-buy" type="button" onClick={onBuySlot}>
                Another place here · ${slotPriceUsd.toFixed(2)}
              </button>
            )}
            <p className="tt-sheet-note tt-crew-note">
              {villagersFree <= 0
                ? "Every villager is already working. Raise a Cat Cottage to house another."
                : "Places belong to this building. Cat Cottages decide how many villagers exist at all."}
            </p>
          </div>
        )}

        {/* ================= WHAT IS INSIDE =================
            The mechanic the town was missing. A building is not one number: it
            is a set of things you fit inside it, each unlocking at its own
            building level, each upgraded on its own with Gold, each paying a
            bonus you can point at. Kingshot's Kitchen has eleven of them.

            Two consequences show up right here in this list:
              · the next BUILDING level has a named payoff — the greyed rows
                below the line are exactly what it buys
              · certain items must be maxed before the building may be raised,
                which turns one long wait into a dozen small decisions. */}
        {!locked && !plot && items.length > 0 && (
          <div className="tt-furn">
            <div className="tt-furn-head">
              <small>Inside the {b.name}</small>
              {bonuses && (
                <b className="mono">
                  {bonuses.produce > 0 && `+${bonuses.produce}% output`}
                  {bonuses.produce > 0 && bonuses.coin > 0 && " · "}
                  {bonuses.coin > 0 && `${bonuses.coin} Gold/h`}
                </b>
              )}
            </div>

            {gate.length > 0 && (
              <p className="tt-furn-gate">
                The {gate[0].it.name} must reach level {gate[0].need} before the{" "}
                {b.name} can be raised.
              </p>
            )}

            <ul className="tt-furn-list">
              {items.map((it) => {
                // Items the building is not high enough for are shown, greyed,
                // with the level that unlocks them. That row IS the argument
                // for the next building upgrade.
                if (it.at > level) {
                  return (
                    <li key={it.id} className="tt-furn-row soon">
                      <div className="tt-furn-name">
                        <b>{it.name}</b>
                        <small>
                          +{it.amount}
                          {EFFECTS[it.effect].unit} {EFFECTS[it.effect].label}
                        </small>
                      </div>
                      <span className="tt-furn-soon">at level {it.at}</span>
                    </li>
                  );
                }
                const at = itemLevels[it.id] || 0;
                const cap = itemCap(it, level);
                const maxed = at >= cap;
                const cost = itemCost(it, at);
                const can = affords(cost, res);
                const eff = EFFECTS[it.effect];
                const isGate = it.gate && at < cap;
                return (
                  <li key={it.id} className={"tt-furn-row" + (isGate ? " gate" : "")}>
                    <div className="tt-furn-name">
                      <b>{it.name}</b>
                      <small>
                        {at > 0
                          ? `+${it.amount * at}${eff.unit} ${eff.label}`
                          : `fits for +${it.amount}${eff.unit} ${eff.label}`}
                      </small>
                    </div>
                    <span className="tt-furn-lvl mono">
                      {at}<em>/{it.max}</em>
                    </span>
                    {maxed ? (
                      <span className="tt-furn-max">
                        {at >= it.max ? "max" : `level ${level + 1}`}
                      </span>
                    ) : (
                      <button
                        type="button"
                        className={"tt-furn-btn" + (can ? "" : " short")}
                        onClick={() => onUpgradeItem(it.id)}
                      >
                        {Object.entries(cost).map(([k, v]) => {
                          const Icon = ICON[k];
                          return (
                            <span key={k} className={(res[k] || 0) < v ? "short" : ""}>
                              {Icon ? <Icon size={13} /> : null}
                              {fmt(v)}
                            </span>
                          );
                        })}
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>

          </div>
        )}

        {!locked && <div className="tt-sheet-stats">
          {prod && (
            <div>
              <small>Next level makes</small>
              <b className="up">
                {fmt(effectiveRate(id, level + 1, { power, starving }))}/h
              </b>
            </div>
          )}
          {info.cottage && (
            <div>
              <small>Villagers housed</small>
              <b>
                {Math.min(4, 1 + (bonuses?.beds || 0))} of 4
              </b>
            </div>
          )}
          {info.unlocksAt && (
            <div>
              <small>At this level</small>
              <b>{info.unlocksAt(level)}</b>
            </div>
          )}
        </div>}

        {!locked && starving && prod && id !== "kitchen" && (
          <p className="tt-sheet-note warn">
            The town is out of Fish — everything runs at a quarter speed until the Kitchen
            catches up.
          </p>
        )}

        {!locked && prod && (
          boostUntil > Date.now() ? (
            <p className="tt-sheet-note boosted">
              Boosted — double output for {clock((boostUntil - Date.now()) / 1000)} more.
            </p>
          ) : (
            <button className="tt-mini boost" type="button" onClick={onBoost}>
              Boost with {boostCost(level)} Catnip · double output for 15m
            </button>
          )
        )}

        {/* Nothing to collect — production runs into the Storehouse on its own.
            What IS sold here is time: this building's next few hours, now. */}
        {!locked && prod && rate > 0 && (
          <button className="tt-mini gold tt-door" type="button" onClick={onRushProduction}>
            Take the next {rushHours}h now · +{fmt(producedOver(rate, rushHours * 3600))}{" "}
            {RESOURCES[prod.res].short} · {Math.ceil(rushHours * 3)} <IconGoldFish size={14} />
          </button>
        )}

        {locked ? null : job ? (
          <div className="tt-sheet-job">
            <div className="tt-sheet-jobrow">
              <span>{plot ? "Building" : `Upgrading to level ${level + 1}`}</span>
              <b className="mono">{clock(remaining)}</b>
            </div>
            <div className="tt-sheet-bar">
              <i style={{ width: `${Math.min(100, job.pct * 100)}%` }} />
            </div>
            {/* Help comes BEFORE the paid rush, which is Kingshot's own advice
                to its players: ask the alliance first, spend only for what is
                left. Putting the free option second would be a dark pattern,
                and it would also make the paid one feel worse. */}
            {job.asked ? (
              <div className="tt-help on">
                <b>
                  {job.helps || 0} of {MAX_HELPS_PER_JOB} helped
                </b>
                <div className="tt-help-bar">
                  <i style={{ width: `${((job.helps || 0) / MAX_HELPS_PER_JOB) * 100}%` }} />
                </div>
                <small>
                  Each neighbour takes off {Math.round(helpReduction(remaining))}s.
                  {helpsLeft(job) === 0 && " Nobody left to ask."}
                </small>
              </div>
            ) : (
              <button className="tt-mini tt-help-ask" type="button" onClick={onAskHelp}>
                Ask the clowder for help · free
              </button>
            )}

            <button className="tt-btn alt" type="button" onClick={onRush}>
              Finish now · {rushCost(remaining)} <IconGoldFish size={16} />
            </button>
            <p className="tt-sheet-note">
              A builder is busy until this finishes. The nudge gets cheaper the closer it is.
              {job.asked && " Neighbours help on their own — real clowders come with the server."}
            </p>
          </div>
        ) : blocked.length ? (
          <div className="tt-sheet-job">
            <div className="tt-sheet-jobrow">
              <span>{verb}</span>
              <b className="mono">{clock(secs)}</b>
            </div>
            <div className="tt-blocked">
              <small>Needs first</small>
              {blocked.map((r) => (
                // Tappable: a dead-end screen with no way forward is the one
                // wall in the game that has no door, so at least make the way
                // round it one tap instead of a hunt.
                <button key={r.id} type="button" onClick={() => onGoTo(r.id)}>
                  {BUILDINGS.find((b) => b.id === r.id)?.name} level {r.level} →
                </button>
              ))}
            </div>
            <p className="tt-sheet-note locked">
              Build those up and this unlocks. Nothing in the town moves alone.
            </p>
          </div>
        ) : hallCapped ? (
          <p className="tt-sheet-note locked">
            Level {level} is the most the Cat Hall allows. Upgrade the Cat Hall to go further.
          </p>
        ) : (
          <div className="tt-sheet-job">
            <div className="tt-sheet-jobrow">
              <span>{verb}</span>
              <b className="mono">{clock(secs)}</b>
            </div>

            <div className="tt-costs">
              {Object.entries(cost).map(([k, v]) => {
                const Icon = ICON[k];
                const have = res[k] || 0;
                const short = have < v;
                return (
                  <div key={k} className={"tt-cost" + (short ? " short" : "")}>
                    <span style={{ color: RESOURCES[k].color }}>
                      <Icon size={17} />
                      {RESOURCES[k].name}
                    </span>
                    <b className="mono">{fmt(v)}</b>
                    <small className="mono">
                      {short ? `${fmt(v - have)} short` : `have ${fmt(have)}`}
                    </small>
                  </div>
                );
              })}
            </div>

            <button
              className="tt-btn"
              type="button"
              disabled={!canAfford || buildersFree <= 0}
              onClick={onUpgrade}
            >
              <IconHouse size={17} />
              {!canAfford
                ? `Short on ${Object.keys(missing).map((k) => RESOURCES[k].short).join(", ")}`
                : buildersFree <= 0
                  ? "All builders are busy"
                  : plot
                    ? "Start building"
                    : "Start upgrade"}
            </button>

            {/* Every wall gets a door. A wall without one is pay-to-win by
                omission — the players who would have paid just leave. */}
            {!canAfford && (
              <button className="tt-mini gold tt-door" type="button" onClick={onBuyMissing}>
                Buy what is missing · {topUpCost(missing)} <IconGoldFish size={14} />
              </button>
            )}
            {canAfford && buildersFree <= 0 && buildersTotal < MAX_BUILDERS && (
              <button className="tt-mini gold tt-door" type="button" onClick={onBuyBuilder}>
                Hire builder #{buildersTotal + 1} · ${builderPrice?.toFixed(2)}
              </button>
            )}
            <p className="tt-sheet-note">
              {buildersFree > 0
                ? `${buildersFree} of ${buildersTotal} builders free.`
                : `All ${buildersTotal} builders are on other jobs.`}
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
