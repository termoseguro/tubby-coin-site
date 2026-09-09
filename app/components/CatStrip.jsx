import { CATS, pick } from "../../lib/siteArt";

/**
 * An endless band of real cats from the collection.
 *
 * The site used to represent 20,000 hand-drawn cats with an 18-thumbnail grid,
 * which undersells the single biggest asset the project has. A moving wall of
 * faces says "there is a real collection behind this" before anyone reads a
 * word — and it doubles as the texture the flat pink was missing.
 *
 * Paths come from lib/siteArt.js, which only lists art that is tracked by git.
 * /public/cats/ is gitignored, so anything picked straight out of catPool.json
 * would 404 on Vercel while looking perfect in dev.
 */
export default function CatStrip({ count = 26, seed = 0, reverse = false }) {
  const cats = pick(CATS, count, seed);
  if (!cats.length) return null;

  // rendered twice: the CSS marquee translates -50%, so the second copy is what
  // makes the loop seamless
  const loop = [...cats, ...cats];

  return (
    <div className={`cat-strip${reverse ? " rev" : ""}`} aria-hidden="true">
      <div className="cat-track">
        {loop.map((src, i) => (
          <div className="cat-face" key={i}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt="" loading="lazy" decoding="async" width={104} height={104} />
          </div>
        ))}
      </div>
    </div>
  );
}
