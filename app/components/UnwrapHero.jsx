"use client";

import { useEffect, useRef, useState } from "react";

export default function UnwrapCoin() {
  const foilRef = useRef(null);
  const [imgOk, setImgOk] = useState(true);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;

    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const foil = foilRef.current;
        if (!foil) return;
        // 0 at top → 1 after ~0.55 viewport of scrolling, so the reveal finishes
        // while the coin is still pinned (sticky) and in view — not as it releases
        const p = Math.max(0, Math.min(1, window.scrollY / (window.innerHeight * 0.55)));
        // the gold foil sheet peels off the coin, sliding away to the right + curling
        const slide = p * 108; // % of its width
        const rot = p * 5; // deg — organic tilt as it lifts
        const rise = p * -6; // % — lifts slightly off the coin
        foil.style.transform = `translate(${slide}%, ${rise}%) rotate(${rot}deg)`;
        // fade the last sliver so it doesn't hard-pop at the edge
        foil.style.opacity = p > 0.82 ? String(Math.max(0, 1 - (p - 0.82) / 0.18)) : "1";
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div className="hero-art-wrap">
      <div className="coin-stage">
        {/* the actual coin — always underneath */}
        <div className="coin-gold">
          {imgOk ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src="/coin.jpg"
              alt="Gold tubby cats coin"
              onError={() => setImgOk(false)}
            />
          ) : (
            <div className="coin-fallback" aria-hidden="true">🪙</div>
          )}
        </div>

        {/* the gold foil wrapper that peels away on scroll */}
        <div className="foil" ref={foilRef} aria-hidden="true">
          <span className="foil-curl" />
        </div>
      </div>

      <div className="unwrap-hint">
        <span className="arrow">↓</span> scroll to unwrap the coin <span className="arrow">↓</span>
      </div>
    </div>
  );
}
