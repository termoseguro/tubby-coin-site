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
// One per gathered resource. Solid, chunky shapes that stay readable at 18px in
// the top bar — the bar is glanced at, never studied.

export function IconWood(p) {
  return (
    <Svg {...p}>
      <rect x="3.2" y="8.6" width="17.6" height="7.2" rx="3.6" fill="currentColor" opacity=".35" />
      <rect x="3.2" y="8.6" width="17.6" height="7.2" rx="3.6" {...S} />
      <ellipse cx="6.6" cy="12.2" rx="2.1" ry="3.2" fill="currentColor" />
      <path d="M12.4 9.4h6M12.4 15h6" {...S} strokeWidth="1.6" opacity=".7" />
    </Svg>
  );
}

export function IconStone(p) {
  return (
    <Svg {...p}>
      <path d="M4.6 14.4 8 7.6l6.2-1.2 5.4 5.2-1.6 6.2H6.4Z" fill="currentColor" opacity=".35" />
      <path d="M4.6 14.4 8 7.6l6.2-1.2 5.4 5.2-1.6 6.2H6.4Z" {...S} />
      <path d="m8 7.6 2.8 5 6.4-.2M10.8 12.6l-1.2 5.2" {...S} strokeWidth="1.6" opacity=".8" />
    </Svg>
  );
}

export function IconCatnip(p) {
  return (
    <Svg {...p}>
      <path d="M12 20.4V11" {...S} />
      <path d="M12 12.6C9.4 12.6 5 11 4.4 6.2c4.8-.6 7 2.8 7.6 6.4Z" fill="currentColor" opacity=".4" />
      <path d="M12 12.6C9.4 12.6 5 11 4.4 6.2c4.8-.6 7 2.8 7.6 6.4Z" {...S} />
      <path d="M12 11.4c2.6 0 7-1.6 7.6-6.4-4.8-.6-7 2.8-7.6 6.4Z" fill="currentColor" opacity=".4" />
      <path d="M12 11.4c2.6 0 7-1.6 7.6-6.4-4.8-.6-7 2.8-7.6 6.4Z" {...S} />
    </Svg>
  );
}

export function IconBiscuit(p) {
  return (
    <Svg {...p}>
      <circle cx="12" cy="12" r="8.4" fill="currentColor" opacity=".3" />
      <circle cx="12" cy="12" r="8.4" {...S} />
      <circle cx="9.4" cy="10" r="1.35" fill="currentColor" />
      <circle cx="14.4" cy="9.6" r="1.15" fill="currentColor" />
      <circle cx="12.6" cy="14.6" r="1.3" fill="currentColor" />
    </Svg>
  );
}

/** Premium currency — a golden fish, distinct from the plain Fish resource. */
export function IconGoldFish({ size = 22, ...rest }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true" {...rest}>
      <path
        d="M2.6 12c3.7-4.6 8.3-6.9 13.7-6.9.9 2.2 1.4 4.5 1.4 6.9s-.5 4.7-1.4 6.9C10.9 18.9 6.3 16.6 2.6 12Z"
        fill="#ffd23f"
        stroke="#c98a00"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path d="M17.6 8.4 21.6 5v14l-4-3.4" fill="#ffd23f" stroke="#c98a00" strokeWidth="1.8" strokeLinejoin="round" />
      <circle cx="7.6" cy="11.1" r="1.3" fill="#7a5400" />
      <path d="M5.4 8.2c1.8-1 3.8-1.4 5.8-1.3" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" fill="none" opacity=".75" />
    </svg>
  );
}
