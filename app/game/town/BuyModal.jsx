"use client";

// The real-payment sheet — the only way to buy permanent capacity.
//
// Golden Fish never appears here on purpose: it is a quest reward, so anything
// priced in it is something the Town Book eventually gives away. Builders and
// worker spots raise the ceiling forever, and a ceiling that can be earned is a
// ceiling nobody buys.
//
// Two rails, and the $TUBBY one is cheaper because that discount is what routes
// buying pressure through the token — the spend becomes volume, the volume
// becomes the creator fee, the fee funds the rewards.

import { TUBBY_DISCOUNT, inTubby } from "../../../lib/townEconomy";
import { config } from "../../../lib/config";

export default function BuyModal({ title, blurb, usd, rent, onRent, onPay, onClose }) {
  const tubby = inTubby(usd);

  return (
    <div className="tt-sheet-wrap" onClick={onClose}>
      <section className="tt-sheet tt-buy" role="dialog" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <button className="tt-sheet-x" type="button" aria-label="Close" onClick={onClose}>
          ✕
        </button>

        <header className="tt-sheet-head">
          <span className="tt-sheet-swatch" style={{ background: "#ffc327" }} />
          <div>
            <h3>{title}</h3>
            <p className="tt-sheet-lvl">Yours permanently</p>
          </div>
        </header>

        <p className="tt-sheet-desc">{blurb}</p>

        <div className="tt-rails">
          <button className="tt-rail best" type="button" onClick={() => onPay("tubby")}>
            <span className="tt-rail-tag">Save {Math.round(TUBBY_DISCOUNT * 100)}%</span>
            <b>${tubby.toFixed(2)}</b>
            <small>paid in {config.token.ticker}</small>
          </button>
          <button className="tt-rail" type="button" onClick={() => onPay("sol")}>
            <b>${usd.toFixed(2)}</b>
            <small>paid in SOL</small>
          </button>
        </div>

        {rent && (
          <button
            className="tt-mini tt-rent"
            type="button"
            onClick={() => {
              onRent?.();
              onClose();
            }}
          >
            Or rent one for {rent.days} days · {rent.gold} Golden Fish
          </button>
        )}

        <p className="tt-sheet-note">
          Prototype — nothing is charged. Real payments are verified on-chain before
          anything is granted.
        </p>
      </section>
    </div>
  );
}
