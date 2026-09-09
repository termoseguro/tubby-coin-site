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
 *   - a few chocolate coins, slow enough to notice only on the second look
 *
 * All of it is decorative: aria-hidden, pointer-events:none, and the rails
 * disappear below 1240px, where the gutters stop existing.
 */
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
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="hero-coin c1" src="/coin-96.webp" alt="" width={56} height={56} />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="hero-coin c2" src="/coin-96.webp" alt="" width={44} height={44} />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="hero-coin c3" src="/coin-96.webp" alt="" width={64} height={64} />
    </div>
  );
}
