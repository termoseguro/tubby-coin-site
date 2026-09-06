"use client";

// The top resource bar, in the shape Kingshot and every 4X city builder uses:
// every resource always on screen, each with its cap, and a "+" that leads to
// the shop. It is glanced at constantly and studied never — so the numbers are
// big, the caps are small, and a resource at its cap turns red because that is
// the moment the player is meant to act.

import { useState } from "react";
import { RESOURCES, RESOURCE_ORDER, RESOURCE_USES, storeCap } from "../../../lib/townEconomy";
import { IconBiscuit, IconCatnip, IconGoldFish, IconStone, IconTreat, IconWood } from "../icons";

const ICON = {
  fish: IconTreat,
  wood: IconWood,
  stone: IconStone,
  catnip: IconCatnip,
  treats: IconBiscuit,
};

function fmt(n) {
  n = Math.floor(n || 0);
  if (n >= 1e9) return (n / 1e9).toFixed(1) + "B";
  if (n >= 1e6) return (n / 1e6).toFixed(1) + "M";
  if (n >= 1e4) return (n / 1e3).toFixed(0) + "K";
  if (n >= 1e3) return (n / 1e3).toFixed(1) + "K";
  return String(n);
}

export default function ResourceBar({ res, storehouseLevel, unlocked, onBuy }) {
  // Tap a resource to find out what it is FOR. A number with no stated purpose
  // is a number the player ignores.
  const [open, setOpen] = useState(null);

  return (
    <div className="tt-resbar">
      {RESOURCE_ORDER.filter((id) => unlocked.includes(id)).map((id) => {
        const Icon = ICON[id];
        const have = res[id] || 0;
        const cap = storeCap(storehouseLevel, id);
        const full = have >= cap;
        return (
          <button
            key={id}
            type="button"
            className={"tt-resbar-item" + (full ? " full" : "") + (open === id ? " open" : "")}
            onClick={() => setOpen(open === id ? null : id)}
          >
            <span className="tt-resbar-i" style={{ color: RESOURCES[id].color }}>
              <Icon size={19} />
            </span>
            <span className="tt-resbar-n">
              <b className="mono">{fmt(have)}</b>
              <small className="mono">/{fmt(cap)}</small>
            </span>
            {open === id && (
              <span className="tt-resbar-pop" onClick={(e) => e.stopPropagation()}>
                <b style={{ color: RESOURCES[id].color }}>{RESOURCES[id].name}</b>
                <ul>
                  {RESOURCE_USES[id].map((u) => (
                    <li key={u}>{u}</li>
                  ))}
                </ul>
                {full && <em>Storehouse full — production is being wasted.</em>}
              </span>
            )}
          </button>
        );
      })}

      <button className="tt-resbar-item gold" type="button" onClick={onBuy}>
        <span className="tt-resbar-i">
          <IconGoldFish size={20} />
        </span>
        <span className="tt-resbar-n">
          <b className="mono">{fmt(res.gold)}</b>
        </span>
        <span className="tt-resbar-plus">+</span>
      </button>
    </div>
  );
}
