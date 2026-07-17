"use client";

import { useState } from "react";
import { BuyButton } from "./BuyModal";

// absolute hrefs so the menu works from any route (home and /tokenomics)
const LINKS = [
  ["/#find", "Find $TUBBY"],
  ["/tokenomics", "Tokenomics"],
  ["/#nfts", "NFTs"],
  ["/#art", "Art"],
  ["/#merch", "Merch"],
  ["/#faq", "FAQ"],
];

export default function NavBar({ ticker, active }) {
  const [open, setOpen] = useState(false);
  return (
    <header className="bar">
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
          <BuyButton className="btn">Buy</BuyButton>
        </nav>
      </div>
    </header>
  );
}
