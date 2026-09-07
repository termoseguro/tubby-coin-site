// Hand-rolled SVG icon set for Tubby Town.
// Emoji icons are the single loudest "a template made this" tell in a game UI —
// these replace them. Everything inherits currentColor so one icon works on any
// panel. Keep them chunky: thick strokes, rounded joins, no hairlines.

const S = { fill: "none", stroke: "currentColor", strokeWidth: 2.2, strokeLinecap: "round", strokeLinejoin: "round" };

function Svg({ children, size = 22, ...rest }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true" focusable="false" {...rest}>
      {children}
    </svg>
  );
}

/** the soft currency — a treat/fish snack */
export function IconTreat(p) {
  return (
    <Svg {...p}>
      <path
        d="M3 12c3.6-4.4 8-6.6 13.2-6.6.9 2.1 1.3 4.3 1.3 6.6s-.4 4.5-1.3 6.6C11 18.6 6.6 16.4 3 12Z"
        fill="currentColor"
        stroke="none"
        opacity=".22"
      />
      <path d="M3 12c3.6-4.4 8-6.6 13.2-6.6.9 2.1 1.3 4.3 1.3 6.6s-.4 4.5-1.3 6.6C11 18.6 6.6 16.4 3 12Z" {...S} />
      <path d="M17.5 8.8 21 6v12l-3.5-2.8" {...S} />
      <circle cx="8" cy="11.2" r="1.15" fill="currentColor" stroke="none" />
    </Svg>
  );
}

/** production rate — a paw in motion */
export function IconPaw(p) {
  return (
    <Svg {...p}>
      <path
        d="M12 13.4c2.7 0 4.7 1.7 4.7 3.7 0 1.6-1.2 2.6-2.8 2.6-.8 0-1.3-.3-1.9-.3s-1.1.3-1.9.3c-1.6 0-2.8-1-2.8-2.6 0-2 2-3.7 4.7-3.7Z"
        fill="currentColor"
        stroke="none"
      />
      <ellipse cx="6.6" cy="12" rx="1.9" ry="2.4" fill="currentColor" stroke="none" />
      <ellipse cx="17.4" cy="12" rx="1.9" ry="2.4" fill="currentColor" stroke="none" />
      <ellipse cx="9.7" cy="7.6" rx="1.8" ry="2.3" fill="currentColor" stroke="none" />
      <ellipse cx="14.3" cy="7.6" rx="1.8" ry="2.3" fill="currentColor" stroke="none" />
    </Svg>
  );
}

/** town slots — a little house */
export function IconHouse(p) {
  return (
    <Svg {...p}>
      <path d="M3.5 10.6 12 4l8.5 6.6" {...S} />
      <path d="M5.4 10v9.2h13.2V10" {...S} />
      <path d="M9.6 19.2v-4.8h4.8v4.8" {...S} />
    </Svg>
  );
}

/** the bowl — offline earnings cap */
export function IconBowl(p) {
  return (
    <Svg {...p}>
      <path d="M3.2 11h17.6c0 4.4-3.9 7.6-8.8 7.6S3.2 15.4 3.2 11Z" fill="currentColor" stroke="none" opacity=".22" />
      <path d="M3.2 11h17.6c0 4.4-3.9 7.6-8.8 7.6S3.2 15.4 3.2 11Z" {...S} />
      <path d="M8.4 8.2c0-1.5 1.6-2.7 3.6-2.7s3.6 1.2 3.6 2.7" {...S} />
    </Svg>
  );
}

/** litter box tab — a wrapped surprise */
export function IconBox(p) {
  return (
    <Svg {...p}>
      <path d="M3.4 9.4h17.2v10.2H3.4z" {...S} />
      <path d="M2.4 5.6h19.2v3.8H2.4z" {...S} />
      <path d="M12 5.6v14M12 5.6c-1.4-2.6-5.6-2.9-5.6-.6 0 .4.3.6.8.6H12Zm0 0c1.4-2.6 5.6-2.9 5.6-.6 0 .4-.3.6-.8.6H12Z" {...S} />
    </Svg>
  );
}

/** board tab — a trophy */
export function IconTrophy(p) {
  return (
    <Svg {...p}>
      <path d="M7.4 4h9.2v5.2a4.6 4.6 0 0 1-9.2 0V4Z" {...S} />
      <path d="M7.4 5.6H4.6v1.8a3 3 0 0 0 3 3M16.6 5.6h2.8v1.8a3 3 0 0 1-3 3" {...S} />
      <path d="M12 13.8V17M8.8 20h6.4M9.8 20c0-1.7 1-3 2.2-3s2.2 1.3 2.2 3" {...S} />
    </Svg>
  );
}

/** shop tab — a cart */
export function IconCart(p) {
  return (
    <Svg {...p}>
      <path d="M2.8 4h2.6l2.3 10.4h9.6l2-7.2H6.4" {...S} />
      <circle cx="9.4" cy="19" r="1.7" {...S} />
      <circle cx="16.8" cy="19" r="1.7" {...S} />
    </Svg>
  );
}

/** locked / paid-only slot */
export function IconLock(p) {
  return (
    <Svg {...p}>
      <rect x="4.8" y="10.4" width="14.4" height="9.4" rx="2.4" {...S} />
      <path d="M8.2 10.4V7.8a3.8 3.8 0 0 1 7.6 0v2.6" {...S} />
    </Svg>
  );
}

/** empty slot affordance */
export function IconPlus(p) {
  return (
    <Svg {...p}>
      <path d="M12 5.6v12.8M5.6 12h12.8" {...S} />
    </Svg>
  );
}

export function IconBack(p) {
  return (
    <Svg {...p}>
      <path d="M14.6 5.4 8 12l6.6 6.6" {...S} />
    </Svg>
  );
}

/** the coin that floats up off a working cat */
export function IconCoin({ size = 16, ...rest }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true" {...rest}>
      <circle cx="12" cy="12" r="9.4" fill="#FFD700" stroke="#b98d00" strokeWidth="2" />
      <circle cx="12" cy="12" r="5.8" fill="none" stroke="#b98d00" strokeWidth="1.4" opacity=".55" />
      <path d="M9.4 9.6c1.6-1 3.6-1 5.2 0" fill="none" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" opacity=".75" />
    </svg>
  );
}

// ---- resource icons --------------------------------------------------------
// Solid shapes with their OWN colours and a thick dark outline, not thin line
// icons. A line icon reads as an app; a filled one with a highlight reads as a
// game, and stays legible at 18px in the top bar where these actually live.

function Ico({ children, size = 22, ...rest }) {
  return (
    <svg viewBox="0 0 32 32" width={size} height={size} aria-hidden="true" focusable="false" {...rest}>
      {children}
    </svg>
  );
}

/** Fish — the food. */
export function IconFish(p) {
  return (
    <Ico {...p}>
      <path
        d="M3 16c4.6-6.2 10.6-9.4 17.6-9.4 1.4 2.9 2.1 6 2.1 9.4s-.7 6.5-2.1 9.4C13.6 25.4 7.6 22.2 3 16Z"
        fill="#5bb8e8"
        stroke="#1f6f9c"
        strokeWidth="2.4"
        strokeLinejoin="round"
      />
      <path d="M22.4 11.2 29.4 6v20l-7-5.2Z" fill="#8fd4f2" stroke="#1f6f9c" strokeWidth="2.4" strokeLinejoin="round" />
      <circle cx="9.4" cy="14.4" r="1.9" fill="#123f5c" />
      <path d="M6.6 10.8c2.6-1.6 5.6-2.4 8.8-2.4" stroke="#dff2fd" strokeWidth="2" strokeLinecap="round" fill="none" />
    </Ico>
  );
}

/** Gold — the soft currency the cottages mint and Palis drops. A stack of
 *  coins, so it can never be read as the Golden Fish, which buys time instead. */
export function IconGold(p) {
  return (
    <Ico {...p}>
      <ellipse cx="16" cy="24.5" rx="11" ry="4.6" fill="#b57f0d" stroke="#6b4a05" strokeWidth="2.2" />
      <rect x="5" y="17.5" width="22" height="7" fill="#e0a520" stroke="#6b4a05" strokeWidth="2.2" />
      <ellipse cx="16" cy="17.5" rx="11" ry="4.6" fill="#ffd75e" stroke="#6b4a05" strokeWidth="2.2" />
      <ellipse cx="16" cy="10.5" rx="8.6" ry="3.8" fill="#ffd75e" stroke="#6b4a05" strokeWidth="2.2" />
      <path d="M9.6 8.6c2.4-1.4 6.2-1.6 9-.6" stroke="#fff4c8" strokeWidth="2" strokeLinecap="round" fill="none" />
    </Ico>
  );
}

/** Wood — a cut log. */
export function IconWood(p) {
  return (
    <Ico {...p}>
      <rect x="3" y="10" width="26" height="12" rx="6" fill="#c08b4f" stroke="#6f4a22" strokeWidth="2.4" />
      <ellipse cx="9" cy="16" rx="3.6" ry="5" fill="#e6bd88" stroke="#6f4a22" strokeWidth="2.2" />
      <ellipse cx="9" cy="16" rx="1.4" ry="2" fill="#6f4a22" />
      <path d="M17 12.6h9M17 19.4h9" stroke="#8f6533" strokeWidth="2" strokeLinecap="round" />
    </Ico>
  );
}

/** Stone — a faceted rock. */
export function IconStone(p) {
  return (
    <Ico {...p}>
      <path d="M4 20 9 8.4l9-1.6 9.2 7.6-2 11.2H6.6Z" fill="#a9b4c7" stroke="#4e5b73" strokeWidth="2.4" strokeLinejoin="round" />
      <path d="m9 8.4 4.4 7.8 9.6-.4" fill="none" stroke="#4e5b73" strokeWidth="2.2" strokeLinejoin="round" />
      <path d="m13.4 16.2-1.8 9.4" fill="none" stroke="#4e5b73" strokeWidth="2.2" />
      <path d="m10.4 10 5.4-1" stroke="#dde3ee" strokeWidth="2" strokeLinecap="round" />
    </Ico>
  );
}

/** Catnip — a leafy sprig. */
export function IconCatnip(p) {
  return (
    <Ico {...p}>
      <path d="M16 28V13" stroke="#4d7a2f" strokeWidth="2.8" strokeLinecap="round" />
      <path d="M15.4 16.6C11.6 16.6 5.6 14.2 4.8 7.4c6.6-.8 9.8 4 10.6 9.2Z" fill="#78be4f" stroke="#3d6626" strokeWidth="2.4" strokeLinejoin="round" />
      <path d="M16.6 14.4c3.8 0 9.8-2.4 10.6-9.2-6.6-.8-9.8 4-10.6 9.2Z" fill="#9ad46f" stroke="#3d6626" strokeWidth="2.4" strokeLinejoin="round" />
      <circle cx="10" cy="10.4" r="1.5" fill="#cdeeb0" />
    </Ico>
  );
}

/** Treats — a biscuit. */
export function IconBiscuit(p) {
  return (
    <Ico {...p}>
      <circle cx="16" cy="16" r="11.6" fill="#f2a03d" stroke="#8f5312" strokeWidth="2.4" />
      <circle cx="12.4" cy="13" r="2" fill="#7a4310" />
      <circle cx="19.4" cy="12.4" r="1.7" fill="#7a4310" />
      <circle cx="16.6" cy="19.8" r="1.9" fill="#7a4310" />
      <path d="M8.6 11.4c1.6-2.2 3.8-3.6 6.4-4.2" stroke="#ffd39a" strokeWidth="2.2" strokeLinecap="round" fill="none" />
    </Ico>
  );
}

/** Premium currency — a golden fish, unmistakably richer than the plain one. */
export function IconGoldFish(p) {
  return (
    <Ico {...p}>
      <path
        d="M3 16c4.6-6.2 10.6-9.4 17.6-9.4 1.4 2.9 2.1 6 2.1 9.4s-.7 6.5-2.1 9.4C13.6 25.4 7.6 22.2 3 16Z"
        fill="#ffc327"
        stroke="#a06a00"
        strokeWidth="2.4"
        strokeLinejoin="round"
      />
      <path d="M22.4 11.2 29.4 6v20l-7-5.2Z" fill="#ffdd7a" stroke="#a06a00" strokeWidth="2.4" strokeLinejoin="round" />
      <circle cx="9.4" cy="14.4" r="1.9" fill="#6b4600" />
      <path d="M6.6 10.8c2.6-1.6 5.6-2.4 8.8-2.4" stroke="#fff3cd" strokeWidth="2" strokeLinecap="round" fill="none" />
    </Ico>
  );
}

/** A builder's hammer — the icon for the builder bottleneck. */
export function IconHammer(p) {
  return (
    <Ico {...p}>
      <rect x="13.6" y="12" width="5.6" height="17" rx="2.6" fill="#c9954f" stroke="#7a5220" strokeWidth="2.2" />
      <path d="M6 8.6h20v6.2H6z" fill="#a9b4c7" stroke="#4e5b73" strokeWidth="2.4" strokeLinejoin="round" />
      <path d="M8.6 5.4h6.4v3.2H8.6z" fill="#dde3ee" stroke="#4e5b73" strokeWidth="2.2" strokeLinejoin="round" />
    </Ico>
  );
}
