import { config } from "../../lib/config";

const PLACEHOLDER_CATS = ["🐱", "😺", "😸", "🙀", "😻", "🐾", "😼", "😽"];

function Tile({ src, i }) {
  if (src) {
    return (
      <div className="art-tile">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt="" loading="lazy" />
      </div>
    );
  }
  return (
    <div
      className="art-tile"
      style={{ background: ["var(--pink)", "var(--gold)", "var(--cream)"][i % 3] }}
    >
      <span className="ph">{PLACEHOLDER_CATS[i % PLACEHOLDER_CATS.length]}</span>
    </div>
  );
}

const SLOTS = 12;

function buildSlots(side) {
  const art = config.art || [];
  if (art.length === 0) return new Array(SLOTS).fill(null);
  if (art.length < SLOTS) {
    // few real images: interleave them with placeholders so the rail looks varied
    const out = [];
    for (let i = 0; i < SLOTS; i++) {
      out.push(i % 2 === 0 ? art[Math.floor(i / 2) % art.length] : null);
    }
    return out;
  }
  // plenty of images: give each rail a different window so they don't mirror
  const start = side === "right" ? Math.floor(art.length / 2) : 0;
  const out = [];
  for (let i = 0; i < SLOTS; i++) out.push(art[(start + i) % art.length]);
  return out;
}

function Rail({ side }) {
  const art = buildSlots(side);
  // duplicate the list so the vertical loop is seamless
  const tiles = [...art, ...art];
  return (
    <aside className={`art-rail ${side}`} aria-hidden="true">
      <div className="art-rail-track">
        {tiles.map((src, i) => (
          <Tile key={`${side}-${i}`} src={src} i={i} />
        ))}
      </div>
    </aside>
  );
}

export default function ArtRail() {
  return (
    <>
      <Rail side="left" />
      <Rail side="right" />
    </>
  );
}
