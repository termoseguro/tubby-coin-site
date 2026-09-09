import { CATS, pick } from "../../lib/siteArt";

/**
 * What sits behind the hero.
 *
 * The hero was a narrow centred column — mascot, headline, lead, buttons —
 * floating in about 340px of flat pink on each side. A centred column is the
 * right structure; the problem was that nothing else was happening, so the
 * empty gutters read as unfinished rather than as breathing room.
 *
 * Three layers fix it without touching the content:
 *   - a pool of light, so the mascot sits somewhere instead of hovering
 *   - the collection itself drifting up the gutters, which is the one asset
 *     this project has more of than anything else
 *   - chocolate coins rising through the whole section, like a waterfall
 *     running backwards
 *
 * All of it is decorative: aria-hidden, pointer-events:none, and every layer
 * drops out at the width where it stops earning its place.
 */

// Hand-spread rather than random: a random walk clumps, and a clump reads as a
// bug. Every coin carries its own lane, size, speed, sway and spin.
//
// `delay` is NEGATIVE on purpose — it starts each coin mid-flight, so the
// cascade is already running when the page paints instead of taking twenty
// seconds to fill up from an empty screen.
const COINS = [
  { x: "4%", s: 34, d: 19, delay: -2, sway: 18, rot: 200, o: 0.42 },
  { x: "11%", s: 52, d: 24, delay: -11, sway: 26, rot: -260, o: 0.5 },
  { x: "18%", s: 26, d: 16, delay: -7, sway: 14, rot: 320, o: 0.34 },
  { x: "26%", s: 44, d: 21, delay: -16, sway: 22, rot: -180, o: 0.46 },
  { x: "35%", s: 30, d: 26, delay: -4, sway: 30, rot: 240, o: 0.3 },
  { x: "44%", s: 58, d: 23, delay: -19, sway: 20, rot: -300, o: 0.4 },
  { x: "53%", s: 28, d: 17, delay: -9, sway: 16, rot: 280, o: 0.32 },
  { x: "62%", s: 46, d: 25, delay: -14, sway: 28, rot: -220, o: 0.48 },
  { x: "70%", s: 32, d: 18, delay: -1, sway: 15, rot: 200, o: 0.36 },
  { x: "78%", s: 56, d: 22, delay: -12, sway: 24, rot: -340, o: 0.5 },
  { x: "87%", s: 30, d: 20, delay: -6, sway: 19, rot: 260, o: 0.34 },
  { x: "94%", s: 42, d: 27, delay: -17, sway: 25, rot: -200, o: 0.44 },
];

export default function HeroBackdrop() {
  const left = pick(CATS, 7, 63);
  const right = pick(CATS, 7, 131);

  const rail = (cats, side) => (
    <div className={`hero-rail ${side}`}>
      {/* doubled so the -50% marquee wraps seamlessly */}
      <div className="hero-rail-track">
        {[...cats, ...cats].map((src, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt="" key={i} width={120} height={120} decoding="async" />
        ))}
      </div>
    </div>
  );

  return (
    <div className="hero-fx" aria-hidden="true">
      <span className="hero-glow" />
      {rail(left, "l")}
      {rail(right, "r")}

      <div className="coin-fall">
        {COINS.map((c, i) => (
          <span
            className="coin"
            key={i}
            style={{
              "--x": c.x,
              "--s": `${c.s}px`,
              "--d": `${c.d}s`,
              "--delay": `${c.delay}s`,
              "--sway": `${c.sway}px`,
              "--rot": `${c.rot}deg`,
              "--o": c.o,
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/coin-96.webp" alt="" width={c.s} height={c.s} decoding="async" />
          </span>
        ))}
      </div>
    </div>
  );
}
