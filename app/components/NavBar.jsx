"use client";

import { useState } from "react";
import { BuyButton } from "./BuyModal";

/**
 * The old bar was eight same-weight links in a row with no CTA separation —
 * a list of words rather than a menu. Five links now, ordered by what actually
 * sells the project (the cause first), with the buy action visually separated.
 *
 * Absolute hrefs so the menu works from /tokenomics and /game too.
 */
const LINKS = [
  ["/#cares", "Tubby Cares"],
  ["/#tokenomics", "Tokenomics"],
  ["/game", "The Game"],
  ["/#collection", "Collection"],
  ["/#faq", "FAQ"],
];

export default function NavBar({ ticker, active }) {
  const [open, setOpen] = useState(false);
  return (
    <header className="bar">
      <div className="wrap" style={{ padding: 0 }}>
        <div className="bar-in">
          <a className="logo" href="/">
            <span className="dot">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/coin-96.webp" alt="" width={34} height={34} />
            </span>{" "}
            {ticker}
          </a>
          <button
            className="nav-toggle"
            type="button"
            aria-label="Menu"
            aria-expanded={open}
            onClick={() => setOpen((o) => !o)}
          >
            {open ? "✕" : "☰"}
          </button>
          <nav className={open ? "open" : ""}>
            {LINKS.map(([href, label]) => (
              <a
                key={href}
                href={href}
                className={active === href ? "active" : undefined}
                onClick={() => setOpen(false)}
              >
                {label}
              </a>
            ))}
            <BuyButton className="btn sm nav-cta">Buy {ticker}</BuyButton>
          </nav>
        </div>
      </div>
    </header>
  );
}
