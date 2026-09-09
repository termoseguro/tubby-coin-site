// THE THINGS IN THE ALLEY.
//
// The enemies were two dots on a purple blob. Six different creatures, one
// silhouette between them — you could not tell a Magpie from a Stray Dog, so
// the formation advice ("Guards belong in front") had nothing to attach to and
// the fight looked like a placeholder, because it was one.
//
// Drawn rather than photographed, on purpose: the collection artwork is the
// TOWN's — heroes and villagers are tubby cats, and the things they fight
// should not be. Flat shapes, thick dark outline, the same chunky read as the
// buildings.

const INK = "#2a1c2e";

/** Each mob is a small function of its own so the shapes stay readable.
 *  All of them draw inside a 100x100 box and fill it. */
const FACES = {
  rat: (c) => (
    <>
      <ellipse cx="50" cy="62" rx="34" ry="30" fill={c.fur} />
      <circle cx="22" cy="34" r="13" fill={c.fur} />
      <circle cx="78" cy="34" r="13" fill={c.fur} />
      <circle cx="22" cy="34" r="6.5" fill={c.inner} />
      <circle cx="78" cy="34" r="6.5" fill={c.inner} />
      <ellipse cx="38" cy="56" rx="6" ry="7" fill={INK} />
      <ellipse cx="62" cy="56" rx="6" ry="7" fill={INK} />
      <circle cx="40" cy="53" r="2" fill="#fff" />
      <circle cx="64" cy="53" r="2" fill="#fff" />
      <ellipse cx="50" cy="76" rx="8" ry="6" fill={c.inner} />
      <ellipse cx="50" cy="72" rx="4" ry="3" fill="#e08a9d" />
      <path d="M28 82 L14 88 M72 82 L86 88" stroke={INK} strokeWidth="2" strokeLinecap="round" />
    </>
  ),
  raccoon: (c) => (
    <>
      <ellipse cx="50" cy="58" rx="36" ry="32" fill={c.fur} />
      <path d="M18 30 L26 8 L42 24 Z" fill={c.fur} />
      <path d="M82 30 L74 8 L58 24 Z" fill={c.fur} />
      {/* the mask, which is the whole point of a raccoon */}
      <path d="M14 48 q36 -14 72 0 q-6 18 -36 18 q-30 0 -36 -18 Z" fill={INK} opacity="0.82" />
      <ellipse cx="35" cy="52" rx="7" ry="8" fill="#fff" />
      <ellipse cx="65" cy="52" rx="7" ry="8" fill="#fff" />
      <circle cx="35" cy="53" r="4" fill={INK} />
      <circle cx="65" cy="53" r="4" fill={INK} />
      <ellipse cx="50" cy="72" rx="9" ry="7" fill={c.inner} />
      <ellipse cx="50" cy="69" rx="4" ry="3" fill={INK} />
    </>
  ),
  crow: (c) => (
    <>
      <ellipse cx="50" cy="60" rx="32" ry="34" fill={c.fur} />
      <path d="M12 58 q-8 14 6 26 q10 -10 12 -20 Z" fill={c.inner} />
      <path d="M88 58 q8 14 -6 26 q-10 -10 -12 -20 Z" fill={c.inner} />
      <circle cx="38" cy="50" r="8" fill="#fff" />
      <circle cx="62" cy="50" r="8" fill="#fff" />
      <circle cx="39" cy="51" r="4.5" fill={INK} />
      <circle cx="63" cy="51" r="4.5" fill={INK} />
      <path d="M50 60 L38 70 L50 82 L62 70 Z" fill="#f0a92a" />
      <path d="M38 70 L62 70" stroke={INK} strokeWidth="1.6" />
    </>
  ),
  dog: (c) => (
    <>
      <ellipse cx="50" cy="56" rx="35" ry="31" fill={c.fur} />
      <ellipse cx="16" cy="52" rx="11" ry="20" fill={c.inner} />
      <ellipse cx="84" cy="52" rx="11" ry="20" fill={c.inner} />
      <ellipse cx="36" cy="48" rx="6.5" ry="7.5" fill={INK} />
      <ellipse cx="64" cy="48" rx="6.5" ry="7.5" fill={INK} />
      <circle cx="38" cy="45" r="2.2" fill="#fff" />
      <circle cx="66" cy="45" r="2.2" fill="#fff" />
      <ellipse cx="50" cy="70" rx="15" ry="12" fill={c.inner} />
      <ellipse cx="50" cy="64" rx="6" ry="4.5" fill={INK} />
      {/* teeth: this one is meant to look like it bites */}
      <path d="M42 76 L46 84 L50 76 L54 84 L58 76 Z" fill="#fff" />
    </>
  ),
  magpie: (c) => (
    <>
      <ellipse cx="50" cy="60" rx="31" ry="33" fill={c.fur} />
      <path d="M50 27 q26 6 30 34 q-16 6 -30 -4 Z" fill="#fdfdfd" />
      <circle cx="38" cy="50" r="7.5" fill="#fff" />
      <circle cx="62" cy="50" r="7.5" fill="#fff" />
      <circle cx="38" cy="51" r="4" fill={INK} />
      <circle cx="62" cy="51" r="4" fill={INK} />
      <path d="M50 58 L40 68 L50 78 L60 68 Z" fill="#e8c14a" />
      <path d="M18 76 q-10 12 -2 20" stroke={c.inner} strokeWidth="7" fill="none" strokeLinecap="round" />
    </>
  ),
  boss: (c) => (
    <>
      <ellipse cx="50" cy="58" rx="38" ry="34" fill={c.fur} />
      <path d="M14 30 L22 4 L42 22 Z" fill={c.fur} />
      <path d="M86 30 L78 4 L58 22 Z" fill={c.fur} />
      <path d="M20 27 L25 12 L37 22 Z" fill="#8c3a52" />
      <path d="M80 27 L75 12 L63 22 Z" fill="#8c3a52" />
      {/* a scar, and eyes that are not friendly */}
      <path d="M30 34 L44 46" stroke="#8c3a52" strokeWidth="3" strokeLinecap="round" />
      <path d="M24 50 q12 -8 24 0 q-12 12 -24 0 Z" fill="#ffd23f" />
      <path d="M52 50 q12 -8 24 0 q-12 12 -24 0 Z" fill="#ffd23f" />
      <ellipse cx="36" cy="51" rx="3" ry="7" fill={INK} />
      <ellipse cx="64" cy="51" rx="3" ry="7" fill={INK} />
      <path d="M34 72 q16 12 32 0 q-8 16 -16 16 q-8 0 -16 -16 Z" fill="#3d2038" />
      <path d="M38 74 L42 82 L46 74 L50 82 L54 74 L58 82 L62 74" fill="none" stroke="#fff" strokeWidth="2.4" />
    </>
  ),
};

/** Which drawing and which colours each named enemy uses. Keyed by the names in
 *  conquest.js MOBS, so adding a mob there without a face here is visible
 *  immediately rather than silently falling back forever. */
const LOOK = {
  "Alley Rat": { face: "rat", fur: "#8b7f92", inner: "#c9a8b8" },
  "Gutter Rat": { face: "rat", fur: "#6f6478", inner: "#b294a4" },
  "Bin Raccoon": { face: "raccoon", fur: "#9aa3b0", inner: "#cfd6e0" },
  "Rooftop Crow": { face: "crow", fur: "#3b3346", inner: "#241f2c" },
  "Stray Dog": { face: "dog", fur: "#b98a5e", inner: "#e0c19a" },
  Magpie: { face: "magpie", fur: "#2f2a3a", inner: "#4a4257" },
};

const BOSS_LOOK = { face: "boss", fur: "#7c4a63", inner: "#5a3049" };

export default function MobFace({ name, boss = false, size = 56 }) {
  const look = boss ? BOSS_LOOK : LOOK[name] || LOOK["Alley Rat"];
  const draw = FACES[look.face];
  return (
    <svg
      className="tt-mobface"
      width={size}
      height={size}
      viewBox="0 0 100 100"
      role="img"
      aria-label={name}
    >
      <g stroke={INK} strokeWidth="2.4" strokeLinejoin="round">
        {draw(look)}
      </g>
    </svg>
  );
}
