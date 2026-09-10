// ============================================================================
//  TUBBY TOWN — the living town (PixiJS scene)
//
//  Everything here is drawn, not imported: buildings are Graphics, the sky is
//  Graphics, the only external images are the real tubby cat portraits, which
//  become the townsfolk.
//
//  Cats run a small state machine — WALK → WORK → WALK → NAP — so the town is
//  never still and the movement means something. A cat walking to the Kitchen
//  is a cat that is about to produce Kibble.
//
//  Kept deliberately free of game rules: this module renders a town from a
//  plain list of cats. Production, stamina and timers belong to the server.
// ============================================================================

// PIXI WITHOUT eval(), AND IT HAS TO BE IMPORTED FIRST.
//
// Pixi 8 builds its batch shaders at runtime with `new Function()`, which a
// Content-Security-Policy without 'unsafe-eval' refuses. Our CSP allows it in
// development and not in production — so the town worked perfectly on this
// machine and, on the live site, threw
//
//     Current environment does not allow unsafe-eval, please use
//     pixi.js/unsafe-eval module to enable support.
//
// The page still rendered: the header, the resource bar and every panel were
// there, and only the canvas was missing. It looked like a broken game rather
// than a blocked script.
//
// The answer is NOT to allow unsafe-eval. `pixi.js/unsafe-eval` is Pixi's own
// CSP-safe path — it installs pre-built shader generation instead of compiling
// it — and it must be imported BEFORE anything creates an Application, which is
// why it sits above the main import rather than beside the others.
import "pixi.js/unsafe-eval";
import { Application, Assets, Container, Graphics, Rectangle, Sprite, Text } from "pixi.js";
import { BUILDINGS, FOCUS, HORIZON, PLAZA, RING_ROADS, WORLD, workSpot } from "../../../lib/townConfig";
import { RARITIES } from "../../../lib/gameConfig";
import { villagerArt } from "../../../lib/villagers";

const RARITY_HEX = {
  common: 0xb3a3c4,
  rare: 0x6cc2f7,
  epic: 0xc489ff,
  legendary: 0xffbe2e,
  mythic: 0xff7a9c,
};

const LABEL = {
  fontFamily: "Inter Tight, system-ui, sans-serif",
  fontWeight: "800",
  fill: 0x5d2444,
};

// ---------------------------------------------------------------------------
//  Buildings
// ---------------------------------------------------------------------------

/** A building backed by real art: `/town/<id>.png`, transparent, drawn to sit
 *  on its base point. See docs/art-brief.md for the spec and the prompts.
 *  Returns null when the file is absent so the caller can fall back. */
/** Which art file each building resolved to, remembered for the page's life so
 *  a remount does not re-probe all ten. `null` means "no art, use the drawing". */
const artUrlCache = new Map();

async function resolveArt(id) {
  if (artUrlCache.has(id)) return artUrlCache.get(id);
  let url = null;
  // WebP first — the same art is ~15x smaller than PNG with the same
  // transparency, and page weight is conversion on mobile.
  for (const ext of ["webp", "png"]) {
    const candidate = `/town/${id}.${ext}`;
    try {
      // Probe first: a dev server answers a missing file with an HTML 404 page,
      // which the texture loader then chokes on in a way try/catch cannot
      // always contain.
      const head = await fetch(candidate, { method: "HEAD" });
      if (!head.ok) continue;
      const type = head.headers.get("content-type") || "";
      if (!type.startsWith("image/")) continue;
      url = candidate;
      break;
    } catch {}
  }
  artUrlCache.set(id, url);
  return url;
}

async function spriteBuilding(b) {
  // `b.art` lets several buildings share one file — the eight cottages are one
  // building drawn eight times, not eight pieces of art.
  const url = await resolveArt(b.art || b.id);
  if (!url) return null;

  let tex;
  try {
    tex = await Assets.load(url);
  } catch {
    return null;
  }
  if (!tex || !tex.width) return null;

  const c = new Container();
  c.x = b.x;
  c.y = b.y;

  const shadow = new Graphics();
  shadow.ellipse(0, 4, b.w * 0.5, 13).fill({ color: 0xc44e8d, alpha: 0.22 });
  c.addChild(shadow);

  const s = new Sprite(tex);
  // Scale by HEIGHT: art proportions vary, but every building must stand the
  // same "storeys tall" or the street looks broken.
  const targetH = b.h * 1.75;
  s.scale.set(targetH / tex.height);
  s.anchor.set(0.5, 1);
  c.addChild(s);
  c.__art = s;
  c.__body = s;
  c.__shadow = shadow;

  c.scale.set(b.scale);
  c.zIndex = b.y;
  return c;
}

/** One cute building. Same silhouette family, different roof per shape, so the
 *  town reads as one place while every building stays identifiable.
 *  Placeholder only — real art replaces this, see docs/art-brief.md. */
function drawBuilding(b) {
  const c = new Container();
  c.x = b.x;
  c.y = b.y;

  const w = b.w;
  const h = b.h;
  const half = w / 2;

  // ground shadow
  const shadow = new Graphics();
  shadow.ellipse(0, 6, half * 0.94, 13).fill({ color: 0xc44e8d, alpha: 0.22 });
  c.addChild(shadow);

  const g = new Graphics();

  // ---- body ----
  g.roundRect(-half, -h, w, h, 14).fill(b.body);
  g.roundRect(-half, -h, w, h, 14).stroke({ width: 3, color: 0xffffff, alignment: 1 });

  // ---- roof, by shape ----
  const rh = Math.round(h * 0.42);
  if (b.shape === "tower") {
    g.moveTo(-half - 8, -h).lineTo(0, -h - rh - 22).lineTo(half + 8, -h).closePath().fill(b.roof);
    g.circle(0, -h - rh - 26, 7).fill(0xffffff);
  } else if (b.shape === "hall") {
    g.moveTo(-half - 14, -h).lineTo(0, -h - rh).lineTo(half + 14, -h).closePath().fill(b.roof);
    // little bell cupola
    g.roundRect(-16, -h - rh - 30, 32, 30, 8).fill(b.trim);
    g.moveTo(-22, -h - rh - 30).lineTo(0, -h - rh - 52).lineTo(22, -h - rh - 30).closePath().fill(b.roof);
    g.circle(0, -h - rh - 56, 6).fill(0xffd23f);
  } else if (b.shape === "barn") {
    g.moveTo(-half - 10, -h).lineTo(-half * 0.5, -h - rh).lineTo(half * 0.5, -h - rh).lineTo(half + 10, -h).closePath().fill(b.roof);
  } else if (b.shape === "gift") {
    g.roundRect(-half - 8, -h - 26, w + 16, 30, 10).fill(b.roof);
    // ribbon down the body
    g.rect(-11, -h, 22, h).fill({ color: b.roof, alpha: 0.5 });
    // bow
    g.ellipse(-19, -h - 32, 15, 11).fill(b.trim);
    g.ellipse(19, -h - 32, 15, 11).fill(b.trim);
    g.circle(0, -h - 32, 7).fill(b.roof);
  } else if (b.shape === "shed") {
    g.moveTo(-half - 10, -h).lineTo(half + 10, -h - rh).lineTo(half + 10, -h).closePath().fill(b.roof);
    // stacked logs
    for (let i = 0; i < 3; i++) {
      g.circle(-half + 22 + i * 22, -14, 11).fill(b.trim);
      g.circle(-half + 22 + i * 22, -14, 4).fill(b.roof);
    }
  } else if (b.shape === "pit") {
    g.ellipse(0, -h, half + 6, rh * 0.7).fill(b.roof);
    g.circle(-24, -h - 6, 13).fill(b.trim);
    g.circle(6, -h - 12, 17).fill(b.trim);
    g.circle(30, -h - 4, 11).fill(b.trim);
  } else if (b.shape === "garden") {
    g.roundRect(-half, -h - 10, w, 16, 8).fill(b.roof);
    for (let i = 0; i < 4; i++) {
      const px = -half + 20 + i * ((w - 40) / 3);
      g.ellipse(px, -h - 22, 9, 15).fill(b.trim);
      g.ellipse(px - 8, -h - 14, 8, 11).fill(b.roof);
      g.ellipse(px + 8, -h - 14, 8, 11).fill(b.roof);
    }
  } else if (b.shape === "factory") {
    g.moveTo(-half - 12, -h).lineTo(0, -h - rh).lineTo(half + 12, -h).closePath().fill(b.roof);
    g.roundRect(half * 0.42, -h - rh - 32, 22, 40, 6).fill(b.trim);
  } else {
    // "house"
    g.moveTo(-half - 12, -h).lineTo(0, -h - rh).lineTo(half + 12, -h).closePath().fill(b.roof);
  }

  // ---- door + windows ----
  g.roundRect(-17, -34, 34, 34, 9).fill(b.roof);
  g.roundRect(-13, -30, 26, 30, 7).fill(b.trim);
  const wy = -h + Math.max(24, h * 0.3);
  g.roundRect(-half + 16, wy, 24, 22, 7).fill(0xffffff);
  g.roundRect(half - 40, wy, 24, 22, 7).fill(0xffffff);
  g.roundRect(-half + 20, wy + 4, 16, 14, 5).fill(b.trim);
  g.roundRect(half - 36, wy + 4, 16, 14, 5).fill(b.trim);

  c.addChild(g);
  c.__body = g;
  c.__shadow = shadow;

  c.scale.set(b.scale);
  c.zIndex = b.y;
  return c;
}

/** A small ground label under the building, not a big pill floating over it.
 *
 *  Ten heavy white plates hovering above the roofs made the town read as a
 *  labelled diagram rather than a place. The art now identifies each building
 *  on its own (a gift box, a barn, a tower); the label is a quiet confirmation
 *  sitting on the grass, and the full detail lives in the tap panel. */
function namePlate(b) {
  // Front row labels sit on the grass below. Back row labels sit ABOVE the
  // roof — otherwise the front row covers them and half the town goes unnamed.
  const y = 6;

  const label = new Text({
    text: b.name,
    style: { ...LABEL, fontSize: 18, fill: 0x35502a },
  });
  label.anchor.set(0.5);
  label.y = y + 13;

  const pw = label.width + 26;
  const plate = new Graphics();
  plate.roundRect(-pw / 2, y, pw, 28, 13).fill(0xffffff);
  plate.roundRect(-pw / 2, y, pw, 28, 13).stroke({ width: 2.5, color: 0xd8ecc4, alignment: 1 });
  plate.__w = pw;
  plate.__y = y;

  return [plate, label];
}

// ---------------------------------------------------------------------------
//  Cats
// ---------------------------------------------------------------------------

/** A townsfolk cat: the real portrait, in a white ring tinted by rarity, with
 *  a shadow that squashes as it bobs.
 *
 *  These were briefly generated vector cats, to stop villagers and heroes
 *  looking alike. They were ugly and — worse — they had nothing to do with
 *  Tubby Cats: a game about a cat collection whose streets are full of
 *  clip-art has thrown away the only art it owns. The line between the two
 *  systems is drawn by SHAPE instead: a villager is a round chip with a job,
 *  a hero is a portrait card with stars and skills. Nobody confuses those. */
function makeCat(cat, texture) {
  const c = new Container();
  const R = 23;

  const shadow = new Graphics();
  shadow.ellipse(0, 4, R * 0.82, 6).fill({ color: 0xc44e8d, alpha: 0.35 });
  c.addChild(shadow);

  const body = new Container();

  const ring = new Graphics();
  ring.circle(0, -R, R + 4).fill(0xffffff);
  ring
    .circle(0, -R, R + 4)
    .stroke({ width: 3.5, color: RARITY_HEX[cat.rarity] || 0xb3a3c4, alignment: 0 });
  body.addChild(ring);

  if (texture) {
    const sprite = new Sprite(texture);
    sprite.width = R * 2;
    sprite.height = R * 2;
    sprite.anchor.set(0.5);
    sprite.y = -R;
    const mask = new Graphics();
    mask.circle(0, -R, R).fill(0xffffff);
    sprite.mask = mask;
    body.addChild(mask, sprite);
  } else {
    // NO PICTURE IS NOT NO CAT. A missing file used to make the villager vanish
    // from the town entirely — invisible, unexplained, and indistinguishable
    // from a bug in the assignment code. It gets a plain disc instead and
    // carries on working.
    const blank = new Graphics();
    blank.circle(0, -R, R).fill(RARITY_HEX[cat.rarity] || 0xb3a3c4);
    blank.circle(-7, -R - 5, 3.4).fill(0x2a2230);
    blank.circle(7, -R - 5, 3.4).fill(0x2a2230);
    body.addChild(blank);
  }

  // sleep bubble, hidden until napping
  const zzz = new Text({
    text: "z",
    style: { ...LABEL, fontSize: 15, fill: 0xffffff },
  });
  zzz.anchor.set(0.5);
  zzz.x = R;
  zzz.y = -R * 2 - 6;
  zzz.visible = false;
  body.addChild(zzz);

  c.addChild(body);
  c.__body = body;
  c.__shadow = shadow;
  c.__zzz = zzz;
  return c;
}

// ---------------------------------------------------------------------------
//  The scene
// ---------------------------------------------------------------------------

const rand = (a, b) => a + Math.random() * (b - a);
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

/**
 * Mounts the town into `host`. Returns a handle with `setCats` and `destroy`.
 * `cats` is [{ key, art, rarity }].
 */
export async function createTown(host, cats, opts = {}) {
  const app = new Application();
  await app.init({
    width: Math.max(320, host.clientWidth || WORLD.w),
    height: Math.max(240, host.clientHeight || WORLD.h),
    backgroundAlpha: 0,
    antialias: true,
    resolution: Math.min(window.devicePixelRatio || 1, 2),
    autoDensity: true,
  });

  if (!host.isConnected) {
    app.destroy(true, { children: true });
    return { destroy() {}, setCats() {} };
  }
  host.appendChild(app.canvas);
  app.canvas.style.display = "block";
  app.canvas.style.touchAction = "none";
  app.canvas.style.cursor = "grab";

  // Everything lives in `root`, and `root` is scaled to the real container
  // size. Doing it this way means the renderer draws at NATIVE resolution —
  // stretching the canvas with CSS (object-fit) resamples the bitmap, which is
  // exactly what "blurry and cut off" looks like.
  // Pixi only walks the display list for events when the stage says it may.
  // Without this the whole scene is inert to taps while the canvas still
  // receives raw DOM pointer events, which is exactly the confusing half-broken
  // state to end up in: dragging works, tapping does nothing, console is silent.
  app.stage.eventMode = "static";

  const root = new Container();
  app.stage.addChild(root);

  // ---- camera --------------------------------------------------------------
  // A city builder you cannot move around is a picture. Drag to pan, wheel or
  // pinch to zoom, and the view is always clamped so the town can never be
  // dragged off into empty space.
  const cam = { zoom: 1, min: 1, max: 2.6, x: 0, y: 0, touched: false };

  function clamp() {
    const w = app.renderer.width / app.renderer.resolution;
    const h = app.renderer.height / app.renderer.resolution;
    const sw = WORLD.w * cam.zoom;
    const sh = WORLD.h * cam.zoom;
    cam.x = sw <= w ? (w - sw) / 2 : Math.min(0, Math.max(w - sw, cam.x));
    cam.y = sh <= h ? (h - sh) / 2 : Math.min(0, Math.max(h - sh, cam.y));
    root.scale.set(cam.zoom);
    root.x = cam.x;
    root.y = cam.y;
  }

  function layout() {
    const w = Math.max(320, host.clientWidth || WORLD.w);
    const h = Math.max(240, host.clientHeight || WORLD.h);
    app.renderer.resize(w, h);
    // COVER, NOT CONTAIN. This was Math.min — the zoom at which the whole
    // world FITS INSIDE the box — under a comment claiming it was the zoom that
    // fills it. On a desktop the two are close enough that nobody noticed. On a
    // phone they are not: 375 / 3000 is 0.125 against 1030 / 1760 at 0.585, so
    // the town shrank to a 375x220 strip with a dead band under it taking up
    // a third of the screen. Math.max is the smallest zoom where neither axis
    // has a gap, and clamp() already stops you dragging past the edges.
    cam.min = Math.max(w / WORLD.w, h / WORLD.h);
    cam.max = Math.max(w / WORLD.w, h / WORLD.h) * 2.4;
    // Until the player actually moves the camera, keep snapping to the OPENING
    // SHOT — the built heart of the town filling the screen, not the whole
    // world shrunk to fit. cam.min still lets them pull all the way out.
    // The container settles its size over a few frames, so doing this once on
    // the first layout picks up the wrong number.
    if (!cam.touched) {
      cam.zoom = Math.min(cam.max, Math.max(cam.min, Math.min(w / FOCUS.w, h / FOCUS.h)));
      cam.x = w / 2 - FOCUS.x * cam.zoom;
      cam.y = h / 2 - FOCUS.y * cam.zoom;
    }
    cam.zoom = Math.min(cam.max, Math.max(cam.min, cam.zoom));
    clamp();
  }

  /** Zoom keeping the point under the cursor fixed — anything else feels wrong. */
  function zoomAt(px, py, factor) {
    cam.touched = true;
    const before = cam.zoom;
    cam.zoom = Math.min(cam.max, Math.max(cam.min, cam.zoom * factor));
    if (cam.zoom === before) return;
    const k = cam.zoom / before;
    cam.x = px - (px - cam.x) * k;
    cam.y = py - (py - cam.y) * k;
    clamp();
  }

  const canvas = app.canvas;
  const onWheel = (e) => {
    e.preventDefault();
    const r = canvas.getBoundingClientRect();
    zoomAt(e.clientX - r.left, e.clientY - r.top, e.deltaY < 0 ? 1.12 : 1 / 1.12);
  };
  canvas.addEventListener("wheel", onWheel, { passive: false });

  // Drag to pan. A drag must not also count as a tap on a building, so we only
  // treat it as a drag once the pointer has actually moved.
  /** How far a pointer may wander and still count as a tap. Declared up here
   *  with the rest of the pointer state, not beside wasDrag where it reads
   *  better: onMove goes live before createTown has finished awaiting its art,
   *  and a `const` further down the function would be in its temporal dead zone
   *  for any pointer that moves during loading. */
  const DRAG_THRESHOLD = 8;

  const pointers = new Map();
  let dragging = false;
  let moved = 0;
  let last = null;
  let pinchDist = 0;

  // The building currently being dragged, if any. Declared HERE rather than
  // down with beginMove/endMove where it reads more naturally: the pointer
  // listeners below go live immediately, while createTown still has several
  // awaits to go (loading the building art, then the cat portraits). A pointer
  // released during that window runs onUp, and a `let` declared further down
  // the function is in its temporal dead zone — so it threw
  // "Cannot access 'moving' before initialization" instead of simply being null.
  //
  // `ghost` is only ever touched inside `if (moving)`, and moving can only be
  // set by beginMove once everything is built, so it needs no such treatment.
  let moving = null;

  // A DROPPED POINTERUP MUST NOT BRICK THE MAP.
  //
  // Browsers lose pointerup all the time — alt-tab mid-drag, a context menu, a
  // cancelled touch, a devtools pause. When that happens the id stays in
  // `pointers` forever, the next press looks like a second finger, the pinch
  // branch sets moved = 99, and from then on EVERY tap is read as a drag. The
  // town stops responding to clicks entirely and nothing in the console says
  // why. That is what happened here.
  //
  // So a press that arrives long after the last one starts a clean gesture.
  // Nobody holds a finger down for two seconds and then expects the press
  // before it to still count.
  let lastPointerAt = 0;
  const STALE_MS = 2000;

  const onDown = (e) => {
    const now = Date.now();
    if (now - lastPointerAt > STALE_MS) {
      pointers.clear();
      pinchDist = 0;
      moved = 0;
    }
    lastPointerAt = now;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size === 1) {
      dragging = true;
      moved = 0;
      last = { x: e.clientX, y: e.clientY };
    } else if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      pinchDist = Math.hypot(a.x - b.x, a.y - b.y);
    }
  };
  const onMove = (e) => {
    if (!pointers.has(e.pointerId)) return;
    lastPointerAt = Date.now();
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      if (pinchDist > 0) {
        const r = canvas.getBoundingClientRect();
        zoomAt((a.x + b.x) / 2 - r.left, (a.y + b.y) / 2 - r.top, d / pinchDist);
      }
      pinchDist = d;
      moved = 99;
      return;
    }
    if (moving) {
      const w = screenToWorld(e.clientX, e.clientY);
      const sp = snap(w.x, w.y);
      moving.node.x = sp.x;
      moving.node.y = sp.y;
      moving.node.zIndex = sp.y;
      if (moving.node.__label) {
        moving.node.__label.x = sp.x;
        moving.node.__label.y = sp.y;
      }
      ghost.clear();
      ghost.ellipse(sp.x, sp.y + 6, 92, 30).fill({ color: 0xffd23f, alpha: 0.35 });
      ghost.ellipse(sp.x, sp.y + 6, 92, 30).stroke({ width: 4, color: 0xffc327, alpha: 0.9 });
      ghost.visible = true;
      moved = 99;
      return;
    }
    if (!dragging || !last) return;
    const dx = e.clientX - last.x;
    const dy = e.clientY - last.y;
    moved += Math.abs(dx) + Math.abs(dy);
    last = { x: e.clientX, y: e.clientY };

    // DO NOT PAN UNTIL IT IS ACTUALLY A DRAG.
    //
    // Panning on every pixel of movement looks harmless and breaks tapping
    // outright: a click carries a stray move between pointerdown and pointerup,
    // the map slides a pixel or two, the release lands on something else, and
    // Pixi emits pointertap on the nearest COMMON ANCESTOR — the stage — rather
    // than on the building. Hit-testing looked perfect the whole time; the
    // scene was simply not sitting still long enough to be tapped.
    //
    // Below the threshold the movement is remembered and not applied, so the
    // moment it becomes a real drag the map catches up in one step.
    if (moved <= DRAG_THRESHOLD) return;
    cam.touched = true;
    cam.x += dx;
    cam.y += dy;
    clamp();
  };
  const onUp = (e) => {
    lastPointerAt = Date.now();
    pointers.delete(e.pointerId);
    if (pointers.size < 2) pinchDist = 0;
    if (pointers.size === 0) {
      dragging = false;
      last = null;
      if (moving) {
        const done = endMove(true);
        if (done) opts.onMoved?.(done.id, done.x, done.y);
      }
    }
  };
  /** Anything that can interrupt a gesture ends it cleanly. */
  const resetGesture = () => {
    pointers.clear();
    dragging = false;
    pinchDist = 0;
    moved = 0;
    last = null;
  };

  canvas.addEventListener("pointerdown", onDown);
  window.addEventListener("pointermove", onMove);
  window.addEventListener("pointerup", onUp);
  window.addEventListener("pointercancel", onUp);
  window.addEventListener("blur", resetGesture);
  document.addEventListener("visibilitychange", resetGesture);

  /** True when the gesture that just ended was a drag, not a tap. */
  const wasDrag = () => moved > DRAG_THRESHOLD;

  layout();

  const ro = new ResizeObserver(() => layout());
  ro.observe(host);

  // ---- sky -----------------------------------------------------------------
  const sky = new Graphics();
  // full-height so no bare band can ever show above the land
  sky.rect(0, 0, WORLD.w, WORLD.h).fill({
    type: "linear",
    start: { x: 0, y: 0 },
    end: { x: 0, y: 1 },
    colorStops: [
      { offset: 0, color: 0x5cbdf0 },
      { offset: 0.35, color: 0x8fd6f7 },
      { offset: 0.7, color: 0xc9ecff },
      { offset: 1, color: 0xffe0ef },
    ],
  });
  root.addChild(sky);

  // sun glow
  const sun = new Graphics();
  sun.circle(250, 120, 130).fill({ color: 0xfff3bd, alpha: 0.2 });
  sun.circle(250, 120, 92).fill({ color: 0xfff6cf, alpha: 0.28 });
  sun.circle(250, 120, 42).fill({ color: 0xfffbe4, alpha: 0.75 });
  root.addChild(sun);

  // ---- clouds --------------------------------------------------------------
  const clouds = new Container();
  root.addChild(clouds);
  const cloudData = [];
  for (let i = 0; i < 5; i++) {
    const g = new Graphics();
    const s = rand(0.7, 1.35);
    g.ellipse(0, 0, 42 * s, 20 * s).fill({ color: 0xffffff, alpha: 0.95 });
    g.ellipse(-30 * s, 6 * s, 26 * s, 15 * s).fill({ color: 0xffffff, alpha: 0.95 });
    g.ellipse(30 * s, 5 * s, 30 * s, 16 * s).fill({ color: 0xffffff, alpha: 0.95 });
    g.x = rand(-100, WORLD.w);
    g.y = rand(16, 96);
    clouds.addChild(g);
    cloudData.push({ g, speed: rand(4, 11) });
  }

  // ---- the land ------------------------------------------------------------
  // A town needs a SHAPE. A green rectangle bleeding off the edges reads as a
  // background; a plateau with a visible soil edge reads as a place you own.
  const land = new Graphics();
  const LX = 24, LW = WORLD.w - 48, LY = HORIZON + 4, LH = WORLD.h - LY - 4, LR = 130;

  // soil cliff under the grass — the thing that makes it an island
  land.roundRect(LX, LY + 26, LW, LH, LR).fill(0xb98a5e);
  land.roundRect(LX, LY + 40, LW, LH - 14, LR).fill(0xa2764c);

  // grass top
  land.roundRect(LX, LY, LW, LH, LR).fill(0xb3e394);
  // lighter band along the top edge, so the plateau catches the light
  land.roundRect(LX + 6, LY + 5, LW - 12, LH * 0.42, LR).fill({ color: 0xcaf0ac, alpha: 0.75 });
  root.addChild(land);

  // ---- the roads -----------------------------------------------------------
  // Every road runs out of the central plaza. A town reads as a town when it
  // has a centre things point at — two parallel streets read as a shelf.
  // Spokes reach the INNER ring only, and the outer rings get ring roads.
  //
  // The first version drew a spoke from the plaza to every building. That was
  // fine at ten buildings and became a starburst of nineteen lines at twenty —
  // the town read as a diagram of itself. Real settlements do this instead: a
  // few roads out of the centre, and concentric streets joining what is further
  // out. It also makes the rings legible, which is the point of having them.
  const road = new Graphics();
  road.setStrokeStyle({ width: 52, color: 0xe9d3ae, cap: "round", join: "round" });
  for (const b of BUILDINGS) {
    if (b.ring !== 1) continue;
    road.moveTo(PLAZA.x, PLAZA.y);
    const dx = b.x - PLAZA.x;
    const dy = b.y + 26 - PLAZA.y;
    // a gentle bow so the spokes are not laser-straight
    road.quadraticCurveTo(PLAZA.x + dx * 0.55 - dy * 0.1, PLAZA.y + dy * 0.55 + dx * 0.1, b.x, b.y + 26);
  }
  road.stroke();

  // the plaza itself
  road.ellipse(PLAZA.x, PLAZA.y, 250, 155).fill(0xefdcbb);
  road.ellipse(PLAZA.x, PLAZA.y, 250, 155).stroke({ width: 6, color: 0xe0c79f, alignment: 0 });
  road.ellipse(PLAZA.x, PLAZA.y, 158, 98).fill({ color: 0xf7e9d0, alpha: 0.9 });
  root.addChild(road);

  // The ring roads: one per outer ring, each drawn a touch narrower than the
  // one inside it so the town reads as spreading rather than as a target.
  const lane = new Graphics();
  for (const r of RING_ROADS) {
    lane.setStrokeStyle({ width: r.w, color: 0xe9d3ae, cap: "round", join: "round" });
    lane.ellipse(PLAZA.x, PLAZA.y + r.dy, r.rx, r.ry);
    lane.stroke();
  }
  // and four short links out of the plaza so the rings are not moats
  lane.setStrokeStyle({ width: 34, color: 0xe9d3ae, cap: "round" });
  for (const [dx, dy] of [[0, 1], [0, -1], [1, 0.35], [-1, 0.35]]) {
    lane.moveTo(PLAZA.x, PLAZA.y).lineTo(PLAZA.x + dx * 1300, PLAZA.y + dy * 660);
  }
  lane.stroke();
  root.addChild(lane);

  // the plaza itself
  road.ellipse(PLAZA.x, PLAZA.y, 230, 145).fill(0xefdcbb);
  road.ellipse(PLAZA.x, PLAZA.y, 230, 145).stroke({ width: 6, color: 0xe0c79f, alignment: 0 });
  road.ellipse(PLAZA.x, PLAZA.y, 145, 92).fill({ color: 0xf7e9d0, alpha: 0.9 });
  root.addChild(road);

  // ---- decoration ----------------------------------------------------------
  // Empty grass between buildings is what makes a town look unfinished. Trees,
  // bushes, fences and a pond fill it — and trees drawn IN FRONT of buildings
  // are the cheapest depth cue there is.
  let seed = 20260906;
  const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
  const decoBack = new Graphics();
  const decoFront = new Container();

  function tree(g, x, y, s = 1, dark = false) {
    g.ellipse(x, y + 2, 15 * s, 5 * s).fill({ color: 0x6b4a2f, alpha: 0.2 });
    g.roundRect(x - 4 * s, y - 26 * s, 8 * s, 28 * s, 4 * s).fill(0xa9743f);
    const c1 = dark ? 0x5aa845 : 0x74c257;
    const c2 = dark ? 0x74c257 : 0x93d873;
    g.circle(x - 13 * s, y - 34 * s, 15 * s).fill(c1);
    g.circle(x + 13 * s, y - 33 * s, 14 * s).fill(c1);
    g.circle(x, y - 48 * s, 19 * s).fill(c2);
    g.circle(x - 5 * s, y - 52 * s, 10 * s).fill({ color: 0xb6ea97, alpha: 0.85 });
  }

  function bush(g, x, y, s = 1) {
    g.ellipse(x, y + 1, 16 * s, 4 * s).fill({ color: 0x6b4a2f, alpha: 0.16 });
    g.circle(x - 9 * s, y - 7 * s, 10 * s).fill(0x74c257);
    g.circle(x + 9 * s, y - 6 * s, 9 * s).fill(0x74c257);
    g.circle(x, y - 13 * s, 12 * s).fill(0x93d873);
    for (let i = 0; i < 3; i++) {
      g.circle(x - 8 + i * 8, y - 14 - (i % 2) * 5, 2.4).fill(0xffffff);
    }
  }

  function flowers(g, x, y) {
    const cols = [0xffffff, 0xffd6ec, 0xfff2a8, 0xd9c6ff];
    for (let i = 0; i < 5; i++) {
      const fx = x + (rnd() - 0.5) * 34;
      const fy = y + (rnd() - 0.5) * 14;
      g.circle(fx, fy, 3.2).fill(cols[Math.floor(rnd() * cols.length)]);
      g.circle(fx, fy, 1.2).fill(0xffc327);
    }
  }

  function fence(g, x, y, n = 4) {
    for (let i = 0; i < n; i++) {
      const px = x + i * 22;
      g.roundRect(px, y - 22, 6, 24, 3).fill(0xe6c79a);
    }
    g.roundRect(x, y - 18, (n - 1) * 22 + 6, 5, 2.5).fill(0xd9b483);
    g.roundRect(x, y - 9, (n - 1) * 22 + 6, 5, 2.5).fill(0xd9b483);
  }

  function pond(g, x, y) {
    g.ellipse(x, y, 62, 26).fill(0x8fd0e8);
    g.ellipse(x, y - 3, 56, 21).fill(0x6bbde0);
    g.ellipse(x - 16, y - 8, 16, 6).fill({ color: 0xd9f2fb, alpha: 0.7 });
    for (let i = 0; i < 3; i++) {
      g.ellipse(x + 8 + i * 14, y + 4 + (i % 2) * 6, 8, 4).fill(0x5aa845);
    }
  }

  function lamppost(g, x, y) {
    g.ellipse(x, y + 1, 8, 3).fill({ color: 0x6b4a2f, alpha: 0.18 });
    g.roundRect(x - 3, y - 52, 6, 54, 3).fill(0xc9a06a);
    g.circle(x, y - 58, 9).fill(0xfff0b8);
    g.circle(x, y - 58, 9).stroke({ width: 2.5, color: 0xc9a06a, alignment: 0 });
  }

  // behind the buildings: hedges along the back edge, a pond, scattered green
  pond(decoBack, LX + 250, LY + 110);
  for (let x = 70; x < LW; x += 110) {
    if (rnd() > 0.45) tree(decoBack, LX + x + rnd() * 30, LY + 40 + rnd() * 22, 0.72 + rnd() * 0.2, true);
    else bush(decoBack, LX + x + rnd() * 40, LY + 52 + rnd() * 20, 0.7 + rnd() * 0.3);
  }
  for (let i = 0; i < 26; i++) {
    flowers(decoBack, LX + 40 + rnd() * (LW - 80), LY + 30 + rnd() * (LH - 70));
  }
  fence(decoBack, LX + 90, LY + 150, 5);
  fence(decoBack, LX + LW - 200, LY + 150, 4);
  root.addChild(decoBack);

  // ---- greenery that is NOT standing inside a wall -------------------------
  //
  // These used to be hand-placed at plaza-relative offsets, and the moment the
  // layout changed they ended up inside buildings — trees growing out of roofs.
  // Hand-placed decoration on a layout that moves is decoration that will be
  // wrong again next week, so these are now CHOSEN: candidate spots are laid
  // out on rings and every one that lands on a building is dropped.
  const KEEP_CLEAR = 150;
  const occupied = BUILDINGS.map((b) => ({ x: b.x, y: b.y }));
  const clearOf = (x, y) =>
    occupied.every((o) => Math.abs(o.x - x) > KEEP_CLEAR || Math.abs(o.y - y) > KEEP_CLEAR);

  const frontProps = [];
  const wantProps = [
    { fn: lamppost, ring: 300, count: 4, from: 45, s: 1 },
    { fn: tree, ring: 620, count: 7, from: 12, s: 1.45 },
    { fn: bush, ring: 470, count: 8, from: 26, s: 1.3 },
    { fn: tree, ring: 980, count: 9, from: 20, s: 1.5 },
    { fn: bush, ring: 1240, count: 8, from: 8, s: 1.25 },
  ];
  for (const w of wantProps) {
    for (let i = 0; i < w.count; i++) {
      const a = ((w.from + (360 / w.count) * i) * Math.PI) / 180;
      const x = Math.round(PLAZA.x + Math.cos(a) * w.ring);
      const y = Math.round(PLAZA.y + Math.sin(a) * w.ring * 0.6);
      if (y < HORIZON + 140 || y > WORLD.h - 60) continue;
      if (x < 60 || x > WORLD.w - 60) continue;
      if (!clearOf(x, y)) continue;
      frontProps.push({ fn: w.fn, x, y, s: w.s });
      // A tree is scenery too — nothing else should be planted on top of it.
      occupied.push({ x, y });
    }
  }

  // ---- world layer (buildings + cats, depth-sorted) ------------------------
  const world = new Container();
  world.sortableChildren = true;
  root.addChild(world);

  // The sky, land, roads and greenery are scenery. Marking them inert keeps
  // every tap going to a building and saves Pixi walking them on every move.
  for (const layer of [sky, sun, clouds, land, road, lane, decoBack]) {
    layer.eventMode = "none";
    if ("interactiveChildren" in layer) layer.interactiveChildren = false;
  }

  // NAME PLATES LIVE IN THEIR OWN LAYER, ABOVE EVERY BUILDING.
  //
  // They used to be children of the building they name, which meant a big
  // building standing in front of a smaller one drew straight over its label —
  // the Adoption Center swallowed the Treat Factory's name, and any future
  // layout tweak could do the same to any other pair. Checking distances kept
  // it mostly working and "mostly" is the wrong word for whether a town's
  // buildings are legible.
  //
  // In their own layer, no building can ever cover a name, at any spacing.
  const labels = new Container();
  labels.zIndex = 99998;
  // Decoration is never a click target. Pixi hit-tests every branch it is not
  // told to skip, and this one sits ABOVE every building by design — so it has
  // to be explicitly inert or it stands between the player and the town.
  labels.eventMode = "none";
  labels.interactiveChildren = false;
  world.addChild(labels);

  // Real art first, drawn placeholder only where a file is still missing — so
  // the town upgrades one building at a time as art lands. See docs/art-brief.md.
  //
  // Buildings are static sprites and still fully interactive: a hit area, a
  // hover lift, a selection ring, and overlays drawn on top for level, build
  // progress and "ready" badges. This is exactly how the genre does it — no 3D
  // is involved or needed.
  // The construction overlay, loaded once and shared. Tinting a building grey
  // said "something is happening here"; actual scaffolding says WHAT.
  let scaffoldTex = null;
  const scaffoldUrl = await resolveArt("scaffold");
  if (scaffoldUrl) {
    try {
      scaffoldTex = await Assets.load(scaffoldUrl);
    } catch {}
  }

  const buildingNodes = {};
  for (const b of BUILDINGS) {
    const node = (await spriteBuilding(b)) || drawBuilding(b);

    const artH = node.__art ? node.__art.height : b.h + b.h * 0.42;
    const artW = node.__art ? node.__art.width : b.w + 24;

    // selection ring, under everything, hidden until picked
    const ring = new Graphics();
    ring.ellipse(0, 4, artW * 0.52, 18).stroke({ width: 5, color: 0xffd23f, alpha: 0.95 });
    ring.visible = false;
    node.addChildAt(ring, 0);

    // overlay slot: build progress and the "build here" marker, above the roof
    const overlay = new Container();
    overlay.y = -artH - 14;
    node.addChild(overlay);

    // An empty PLOT, drawn under the building and swapped in when the building
    // does not exist yet. A locked town that simply hides its buildings has no
    // shape and nothing to want; a town of marked-out plots shows the player
    // the whole place they are going to build, which is the entire reason the
    // unlock ladder works.
    const plot = new Graphics();
    const pw = Math.max(70, b.w * 0.82);
    const ph = Math.max(26, b.w * 0.3);
    plot.ellipse(0, 0, pw / 2 + 10, ph / 2 + 6).fill({ color: 0xd9c49a, alpha: 0.85 });
    plot.ellipse(0, 0, pw / 2, ph / 2).fill({ color: 0xc7ab7d, alpha: 0.9 });
    for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      const px = (sx * pw) / 2;
      const py = (sy * ph) / 2;
      plot.roundRect(px - 3, py - 18, 6, 20, 3).fill(0xe6c79a);
      plot.circle(px, py - 20, 4).fill(0xfff0b8);
    }
    plot.visible = false;
    node.addChildAt(plot, 0);
    node.__plot = plot;

    // Scaffolding, sized to this building and drawn OVER it while it builds.
    if (scaffoldTex) {
      const sc = new Sprite(scaffoldTex);
      sc.anchor.set(0.5, 1);
      sc.scale.set((b.h * 1.95) / scaffoldTex.height);
      sc.visible = false;
      node.addChild(sc);
      node.__scaffold = sc;
    }

    // The label group: plate, name, and the level chip docked to its left edge
    // as one unit. It lives in the `labels` layer, never in the building, so no
    // building can cover another's name.
    const label = new Container();
    label.scale.set(b.scale);
    const [plate, text] = namePlate(b);
    const levelTag = new Container();
    levelTag.y = plate.__y + 14;
    levelTag.x = -plate.__w / 2 - 15;
    label.addChild(plate, text, levelTag);
    labels.addChild(label);
    node.__label = label;
    node.__levelTag = levelTag;

    node.__ring = ring;
    node.__overlay = overlay;
    node.__artH = artH;
    node.__baseY = b.y;

    node.eventMode = "static";
    node.cursor = "pointer";
    node.hitArea = new Rectangle(-artW / 2, -artH, artW, artH + 22);
    node.on("pointertap", () => {
      if (wasDrag()) return;
      opts.onSelect?.(b.id);
    });
    // Hover lifts the building only. The label stays put on the grass — a name
    // that bobs with the mouse reads as a glitch, not as feedback.
    node.on("pointerover", () => {
      node.y = node.__baseY - 6;
    });
    node.on("pointerout", () => {
      node.y = node.__baseY;
    });

    buildingNodes[b.id] = node;
    world.addChild(node);
  }

  // ---- moving a building ---------------------------------------------------
  // The map has empty land around the ring on purpose. Being able to rearrange
  // it is what turns "a picture of a town" into "my town".
  // (`moving` itself is declared up with the pointer state — see the note there.)

  function screenToWorld(clientX, clientY) {
    const r = app.canvas.getBoundingClientRect();
    return {
      x: (clientX - r.left - cam.x) / cam.zoom,
      y: (clientY - r.top - cam.y) / cam.zoom,
    };
  }

  const ghost = new Graphics();
  ghost.visible = false;
  ghost.zIndex = 99999;
  world.addChild(ghost);

  function beginMove(id) {
    const node = buildingNodes[id];
    if (!node) return;
    moving = { id, node };
    node.alpha = 0.75;
    app.canvas.style.cursor = "grabbing";
  }

  function endMove(commit) {
    if (!moving) return null;
    const { id, node } = moving;
    node.alpha = 1;
    ghost.visible = false;
    moving = null;
    app.canvas.style.cursor = "grab";
    return commit ? { id, x: Math.round(node.x), y: Math.round(node.y) } : null;
  }

  /** Keep a moved building on the grass and clear of the plaza. */
  function snap(x, y) {
    const m = 120;
    let nx = Math.min(WORLD.w - m, Math.max(m, x));
    let ny = Math.min(WORLD.h - 70, Math.max(HORIZON + 90, y));
    const dx = nx - PLAZA.x;
    const dy = (ny - PLAZA.y) * 1.6;
    const d = Math.hypot(dx, dy);
    if (d < 230) {
      const k = 230 / (d || 1);
      nx = PLAZA.x + dx * k;
      ny = PLAZA.y + (dy * k) / 1.6;
    }
    return { x: nx, y: ny };
  }

  /** Apply saved positions on top of the layout in townConfig. */
  function setPositions(positions = {}) {
    for (const b of BUILDINGS) {
      const node = buildingNodes[b.id];
      if (!node) continue;
      const pos = positions[b.id];
      node.x = pos ? pos.x : b.x;
      node.y = pos ? pos.y : b.y;
      node.zIndex = node.y;
      node.__baseY = node.y;
      if (node.__label) {
        node.__label.x = node.x;
        node.__label.y = node.y;
      }
    }
  }

  /** Paint per-building state: { hall: { level, job: {pct} , ready } } */
  function setBuildingState(states = {}, selectedId = null) {
    lastStates = states;
    for (const b of BUILDINGS) {
      const node = buildingNodes[b.id];
      if (!node) continue;
      node.__ring.visible = b.id === selectedId;

      const st = states[b.id] || {};
      const ov = node.__overlay;
      ov.removeChildren().forEach((ch) => ch.destroy({ children: true }));

      // ---- the three states a building can be in --------------------------
      // LOCKED: a pale ghost of the building, so the player can see the town
      //   they are working towards. Hiding it would hide the goal.
      // PLOT:   marked-out ground with a hammer over it — unlocked, unbuilt.
      // BUILT:  the building itself.
      const isPlot = !!st.plot;
      const isLocked = !!st.locked;
      if (node.__plot) node.__plot.visible = isPlot || isLocked;
      if (node.__body) node.__body.visible = !isPlot;
      if (node.__shadow) node.__shadow.visible = !isPlot;
      node.alpha = isLocked ? 0.4 : 1;
      if (node.__label) node.__label.alpha = isLocked ? 0.55 : 1;
      ov.y = isPlot ? -34 : -node.__artH - 14;

      // level, docked to the name plate
      const tag = node.__levelTag;
      if (tag) {
        tag.removeChildren().forEach((ch) => ch.destroy({ children: true }));
        if (isLocked) {
          // The level it needs, in place of the level it has — the one number
          // that turns a grey building into a goal.
          const t = new Text({
            text: `Hall ${st.needsHall}`,
            style: { ...LABEL, fontSize: 13, fill: 0xffffff },
          });
          t.anchor.set(0.5);
          const cw = t.width + 18;
          const chip = new Graphics();
          chip.roundRect(-cw / 2, -13, cw, 26, 11).fill(0x8a97ad);
          chip.roundRect(-cw / 2, -13, cw, 26, 11).stroke({ width: 2.5, color: 0xffffff, alignment: 1 });
          tag.addChild(chip, t);
        } else if (st.level) {
          const t = new Text({
            text: String(st.level),
            style: { ...LABEL, fontSize: 14, fill: 0x6a4300 },
          });
          t.anchor.set(0.5);
          const cw = Math.max(26, t.width + 16);
          const chip = new Graphics();
          chip.roundRect(-cw / 2, -13, cw, 26, 11).fill(0xffd23f);
          chip.roundRect(-cw / 2, -13, cw, 26, 11).stroke({ width: 2.5, color: 0xffffff, alignment: 1 });
          tag.addChild(chip, t);
        }
      }

      // an unlocked, unbuilt plot: a bouncing "build here" marker, the same
      // affordance as the collect bubble because it wants the same tap
      if (isPlot && !st.job) {
        const mark = new Container();
        mark.y = -18;
        const g = new Graphics();
        g.circle(0, 0, 18).fill(0xffffff);
        g.circle(0, 0, 18).stroke({ width: 3, color: 0x57c89a, alignment: 0 });
        g.moveTo(-6, 15).lineTo(6, 15).lineTo(0, 23).closePath().fill(0xffffff);
        const plus = new Graphics();
        plus.roundRect(-8, -2.5, 16, 5, 2.5).fill(0x3f9d7d);
        plus.roundRect(-2.5, -8, 5, 16, 2.5).fill(0x3f9d7d);
        mark.addChild(g, plus);
        mark.__bounce = true;
        ov.addChild(mark);
      }

      // There is no collect bubble any more. Production runs straight into the
      // Storehouse, so a bubble over every building would be a button that does
      // nothing — and a town covered in nothing-buttons is worse than a quiet
      // one. What is left over a building is what you can ACT on: a plot to
      // build, or a job in progress.

      // under construction: scaffolding tint + a progress bar
      if (st.job) {
        const bar = new Graphics();
        const bw = 92;
        bar.roundRect(-bw / 2, 18, bw, 14, 7).fill(0xffffff);
        bar.roundRect(-bw / 2, 18, bw, 14, 7).stroke({ width: 2.5, color: 0xe08fbb, alignment: 1 });
        bar.roundRect(-bw / 2 + 3, 21, Math.max(4, (bw - 6) * st.job.pct), 8, 4).fill(0x57c89a);
        ov.addChild(bar);

        // drawn, not an emoji — emoji icons are the loudest "a template made
        // this" tell there is (see app/game/icons.jsx)
        const hammer = new Graphics();
        hammer.roundRect(-3, -12, 6, 22, 3).fill(0xb07a4a);
        hammer.roundRect(-11, -18, 22, 10, 3).fill(0x9aa4b2);
        hammer.roundRect(-11, -18, 22, 10, 3).stroke({ width: 2, color: 0xffffff, alignment: 1 });
        hammer.y = -32;
        hammer.rotation = -0.3;
        ov.addChild(hammer);
        if (node.__scaffold) node.__scaffold.visible = true;
        // The grey tint stays as well, but lighter now the scaffolding carries
        // the message — a building under construction should still read as
        // itself, not as a ghost.
        if (node.__art) node.__art.tint = node.__scaffold ? 0xe4dce2 : 0xcfc4cc;
      } else {
        if (node.__scaffold) node.__scaffold.visible = false;
        if (node.__art) node.__art.tint = isLocked ? 0xa9b4c7 : 0xffffff;
      }
    }
  }

  // ---- AMBIENT LIFE --------------------------------------------------------
  //
  // A town where only the cats move is a diorama with cats in it. Everything
  // here is cheap — a sine on a rotation, a few drifting sprites — and together
  // they are the difference between a picture and a place.
  //
  // Every prop is drawn around its own base so it can SWAY from the root rather
  // than slide sideways, which is what makes it read as a breeze and not a
  // glitch.
  const swayers = [];
  for (const pr of frontProps) {
    const g = new Graphics();
    pr.fn(g, 0, 0, pr.s);
    g.x = pr.x;
    g.y = pr.y;
    g.zIndex = pr.y + 2;
    g.pivot.set(0, 0);
    world.addChild(g);
    // Trees sway more than bushes, and lampposts do not sway at all.
    const amp = pr.fn === tree ? 0.022 : pr.fn === bush ? 0.012 : 0;
    if (amp > 0) swayers.push({ g, amp, phase: Math.random() * Math.PI * 2, speed: rand(0.5, 0.9) });
  }

  // Chimney smoke, from producers that are actually producing. It is the one
  // ambient cue that carries information: a smoking building is a working one.
  const smoke = [];
  const smokeFor = (b) => ({ x: b.x + b.w * 0.22, y: b.y - b.h * 1.55 });
  function puff(x, y) {
    const g = new Graphics();
    const r = rand(7, 12);
    g.circle(0, 0, r).fill({ color: 0xffffff, alpha: 0.55 });
    g.circle(-r * 0.5, r * 0.2, r * 0.7).fill({ color: 0xffffff, alpha: 0.45 });
    g.x = x;
    g.y = y;
    g.zIndex = 90000;
    world.addChild(g);
    smoke.push({ g, life: 0, ttl: rand(2.6, 4), drift: rand(-9, 9) });
  }

  // Butterflies. Pure decoration, and the cheapest thing on this list that
  // anybody actually notices.
  const flutter = [];
  for (let i = 0; i < 7; i++) {
    const g = new Graphics();
    const c = [0xfff0a8, 0xffd6ec, 0xd9c6ff, 0xbdeeff][i % 4];
    g.ellipse(-4, 0, 4.5, 3).fill(c);
    g.ellipse(4, 0, 4.5, 3).fill(c);
    g.circle(0, 0, 1.6).fill(0x6b4a2f);
    g.zIndex = 90001;
    world.addChild(g);
    flutter.push({
      g,
      x: rand(200, WORLD.w - 200),
      y: rand(HORIZON + 200, WORLD.h - 200),
      a: rand(0, Math.PI * 2),
      speed: rand(22, 42),
      turn: rand(-0.9, 0.9),
      phase: rand(0, 10),
    });
  }

  const fx = new Container();
  root.addChild(fx);

  // ---- cats ----------------------------------------------------------------
  const PRODUCERS_ONLY = ["kitchen", "lumber", "quarry", "garden", "treats"];
  const WORKABLE = BUILDINGS.filter((b) => PRODUCERS_ONLY.includes(b.id));
  // Cats rest where they live. There is no separate rest building any more —
  // see the note at the top of townConfig.js.
  const COTTAGES = BUILDINGS.filter((b) => b.cottage);
  const HOME = COTTAGES[0];
  let napBeds = () => 3;

  let agents = [];

  function sendTo(a, building) {
    a.target = building;
    // The Nap House is the one building cats go INSIDE: they walk to the door
    // and shrink into it. Sleeping is private, beds are limited, and this way
    // we never need interior art — the bed count on the roof carries the state.
    const spot =
      building.cottage
        ? { x: building.x, y: building.y - 4 }
        : workSpot(building, a.slot);
    // Out to the plaza, then out again to the destination — so cats visibly
    // travel along the roads instead of cutting across the grass.
    a.route = [
      { x: PLAZA.x + (Math.random() - 0.5) * 150, y: PLAZA.y + (Math.random() - 0.5) * 80 },
      spot,
    ];
    a.leg = 0;
    a.state = "walk";
  }

  // ---- where a cat with no job goes ---------------------------------------
  //
  // Cats at home are not employed, so they have nowhere to BE — and a cat with
  // nowhere to be is the thing that makes a town look inhabited rather than
  // staffed. They loaf: a slow walk to somewhere on the road, a long sit, then
  // somewhere else.
  //
  // The spots are sampled off the ring roads the scene already draws and then
  // filtered against the buildings, so nobody ends up sitting inside a wall —
  // the same mistake the trees used to make.
  const LOAF_SPOTS = (() => {
    const out = [];
    const clear = (x, y) =>
      BUILDINGS.every((b) => Math.abs(b.x - x) > 170 || Math.abs(b.y - y) > 140);
    // The drawn roads, plus two rings between them: sampling only the three
    // real roads left 10 usable spots for 10 cats, and they stood on top of
    // each other. The grass between rings is walkable too.
    const rings = [...RING_ROADS, { rx: 980, ry: 490, dy: 45 }, { rx: 640, ry: 340, dy: 20 }];
    for (const r of rings) {
      for (let i = 0; i < 40; i++) {
        const t = (i / 40) * Math.PI * 2;
        const x = PLAZA.x + Math.cos(t) * r.rx;
        const y = PLAZA.y + r.dy + Math.sin(t) * r.ry;
        const inside =
          x > 200 && x < WORLD.w - 200 && y > HORIZON + 160 && y < WORLD.h - 160;
        if (inside && clear(x, y)) out.push({ x, y });
      }
    }
    // The plaza is always walkable and always the middle of the frame, so it
    // gets its own ring — this is where the town reads as busy.
    for (let i = 0; i < 9; i++) {
      const t = (i / 9) * Math.PI * 2;
      out.push({ x: PLAZA.x + Math.cos(t) * 190, y: PLAZA.y + Math.sin(t) * 105 });
    }
    return out;
  })();

  /** Send a loafer somewhere else. */
  function loafSomewhere(a) {
    // Mostly a short hop, occasionally the long way across town. All short
    // hops looks like pacing in a cage; all long ones looks like a commute.
    const near = Math.random() < 0.68;
    const pool = near
      ? LOAF_SPOTS.filter((p) => Math.hypot(p.x - a.node.x, p.y - a.node.y) < 560)
      : LOAF_SPOTS;
    const to = pick(pool.length ? pool : LOAF_SPOTS);
    a.target = null;
    a.route = [{ x: to.x + rand(-46, 46), y: to.y + rand(-26, 26) }];
    a.leg = 0;
    a.state = "stroll";
  }

  /** Stop and be a cat for a while. */
  function sitDown(a) {
    a.state = "sit";
    a.timer = rand(3.5, 11);
    // Every so often one of them dozes off in the sun. It costs a boolean.
    a.dozing = Math.random() < 0.28;
    a.node.__zzz.visible = a.dozing;
  }

  function spawnCoin(x, y) {
    const g = new Graphics();
    g.circle(0, 0, 7).fill(0xffd23f);
    g.circle(0, 0, 7).stroke({ width: 2, color: 0xd39b00, alignment: 0 });
    g.circle(-2, -2, 2).fill({ color: 0xffffff, alpha: 0.8 });
    g.x = x;
    g.y = y;
    fx.addChild(g);
    coins.push({ g, life: 0, vx: rand(-14, 14), vy: rand(-56, -40) });
  }
  const coins = [];

  function buildAgents(list) {
    for (const a of agents) a.node.destroy({ children: true });
    agents = [];
    // Slot index WITHIN a building, so two cats at the same building stand
    // side by side instead of on top of each other.
    const seat = {};
    list.forEach((cat) => {
      const node = makeCat(cat, cat.texture);
      const home = cat.building
        ? BUILDINGS.find((b) => b.id === cat.building && PRODUCERS_ONLY.includes(b.id))
        : null;

      // A cat with no building is a cat at home — it loafs instead of working.
      // Note the difference from the old code, which handed an unassigned cat a
      // random workable building: that made idle cats look employed, which is
      // exactly the confusion between workers and residents we spent a session
      // untangling in the UI.
      if (!home) {
        const spot = pick(LOAF_SPOTS);
        node.x = spot.x + rand(-46, 46);
        node.y = spot.y + rand(-26, 26);
        node.zIndex = node.y + 1;
        world.addChild(node);
        const a = {
          key: cat.key,
          node,
          home: null,
          slot: 0,
          state: "sit",
          target: null,
          // Staggered, so they do not all stand up on the same frame.
          timer: rand(0.4, 9),
          bob: rand(0, Math.PI * 2),
          // Loafers amble. Workers have somewhere to be.
          speed: rand(20, 32),
          route: [],
          leg: 0,
          dozing: false,
        };
        agents.push(a);
        return;
      }

      const slot = (seat[home.id] = (seat[home.id] || 0) + 1) - 1;
      const spot = workSpot(home, slot);
      node.x = spot.x;
      node.y = spot.y;
      node.zIndex = spot.y + 1;
      world.addChild(node);
      const a = {
        key: cat.key,
        node,
        home,
        slot,
        state: "work",
        target: home,
        timer: rand(2, 7),
        bob: rand(0, Math.PI * 2),
        speed: rand(34, 52),
        route: [],
        leg: 0,
      };
      agents.push(a);
    });
  }

  // One texture per distinct cat, cached. A failed load is NOT a dropped cat
  // any more — makeCat falls back to a plain disc, so a villager you own is
  // always somewhere in the town even when its file is missing.
  const textures = {};
  async function setCats(list) {
    const resolved = [];
    for (const c of list) {
      const url = villagerArt(c.id);
      if (textures[url] === undefined) {
        try {
          textures[url] = await Assets.load(url);
        } catch {
          textures[url] = null;
        }
      }
      resolved.push({ ...c, texture: textures[url] });
    }
    buildAgents(resolved);
  }

  await setCats(cats);

  // ---- the loop ------------------------------------------------------------
  // REDUCED MOTION MEANS LESS MOTION, NOT A FROZEN TOWN.
  //
  // This used to return out of the whole ticker, which stopped the cats dead —
  // and a cat walking to the Kitchen is INFORMATION, not decoration. On a
  // machine with Windows animation effects switched off (very common, it is the
  // default on anything tuned for performance) the entire town simply never
  // moved, which reads as a broken game rather than as an accessibility
  // setting being respected.
  //
  // So the split is by MEANING: things that tell the player something keep
  // moving, gently. Things that exist to be pretty stop.
  const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;

  let bounceT = 0;
  let clock = 0;
  let smokeTimer = 0;
  let lastStates = {};

  app.ticker.add((ticker) => {
    const dt = Math.min(ticker.deltaMS, 60) / 1000;

    for (const c of cloudData) {
      c.g.x += c.speed * dt;
      if (c.g.x > WORLD.w + 120) c.g.x = -120;
    }

    // ---- the town breathing -------------------------------------------------
    clock += dt;

    // A breeze. One sine per prop, offset so they do not move as one object.
    // Pure decoration, so it is the first thing reduced motion switches off.
    if (!reduced) {
      for (const w of swayers) {
        w.g.rotation = Math.sin(clock * w.speed + w.phase) * w.amp;
      }
    }

    // Smoke, only from buildings that are actually producing — the one piece of
    // decoration here that also tells you something.
    // Smoke is decoration that happens to carry information, so it stays on a
    // reduced-motion machine but drifts more slowly.
    smokeTimer -= dt;
    if (smokeTimer <= 0) {
      smokeTimer = rand(0.5, 1.1);
      const working = BUILDINGS.filter(
        (b) => PRODUCERS_ONLY.includes(b.id) && (lastStates[b.id]?.rate || 0) > 0
      );
      if (working.length) {
        const b = working[Math.floor(Math.random() * working.length)];
        const at = smokeFor(b);
        puff(at.x + rand(-4, 4), at.y);
      }
    }
    for (let i = smoke.length - 1; i >= 0; i--) {
      const s2 = smoke[i];
      s2.life += dt;
      const t = s2.life / s2.ttl;
      s2.g.y -= dt * (reduced ? 12 : 26);
      s2.g.x += s2.drift * dt * (reduced ? 0.4 : 1);
      s2.g.alpha = Math.max(0, 0.55 * (1 - t));
      s2.g.scale.set(1 + t * 1.4);
      if (t >= 1) {
        s2.g.destroy();
        smoke.splice(i, 1);
      }
    }

    // Butterflies are decoration and nothing else. Off.
    for (const f of reduced ? [] : flutter) {
      f.a += f.turn * dt;
      f.x += Math.cos(f.a) * f.speed * dt;
      f.y += Math.sin(f.a) * f.speed * 0.5 * dt;
      if (f.x < 120 || f.x > WORLD.w - 120) f.a = Math.PI - f.a;
      if (f.y < HORIZON + 160 || f.y > WORLD.h - 120) f.a = -f.a;
      f.g.x = f.x;
      f.g.y = f.y + Math.sin(clock * 6 + f.phase) * 5;
      // The wing flap is a scale, not a sprite swap — one line, reads fine.
      f.g.scale.x = 0.55 + Math.abs(Math.sin(clock * 9 + f.phase)) * 0.6;
    }

    for (const a of agents) {
      // The bob is the decorative half of a cat. Walking is not.
      const strolling = a.state === "stroll";
      a.bob +=
        reduced ? 0 : dt * (a.state === "walk" ? 9 : strolling ? 5.6 : 3.2);
      const body = a.node.__body;
      const shadow = a.node.__shadow;

      // Walking and strolling are the same movement; only the ending differs —
      // a worker arrives at a shift, a loafer arrives at nothing in particular.
      if (a.state === "walk" || strolling) {
        const arrive = () => {
          if (strolling) sitDown(a);
          else if (a.target.cottage) {
            a.state = "entering";
            a.t = 0;
          } else {
            a.state = "work";
            a.timer = rand(6, 14);
          }
        };
        const leg = a.route[a.leg];
        if (!leg) {
          arrive();
        } else {
          const dx = leg.x - a.node.x;
          const dy = leg.y - a.node.y;
          const dist = Math.hypot(dx, dy);
          if (dist < 2) {
            a.leg += 1;
            if (a.leg >= a.route.length) arrive();
          } else {
            const step = Math.min(a.speed * dt, dist);
            a.node.x += (dx / dist) * step;
            a.node.y += (dy / dist) * step;
            if (Math.abs(dx) > 1) body.scale.x = dx < 0 ? -1 : 1;
          }
        }
        // walk bounce — smaller on a stroll, because an amble is not a march
        const bounce = Math.abs(Math.sin(a.bob)) * (strolling ? 3.2 : 5);
        body.y = -bounce;
        body.rotation = 0;
        shadow.scale.set(1 - bounce / 26, 1 - bounce / 20);
        a.node.__zzz.visible = false;
      } else if (a.state === "sit") {
        // A cat at rest. Breathing and a slow lean, nothing more — and no coin,
        // because a cat at home earns nothing and the scene must not imply it
        // does. Dozing shows the zzz the nappers use.
        body.y = Math.sin(a.bob * 0.9) * 1.5;
        body.rotation = Math.sin(a.bob * 0.4) * 0.05;
        shadow.scale.set(1, 1);
        a.node.__zzz.visible = !!a.dozing;
        a.timer -= dt;
        if (a.timer <= 0) loafSomewhere(a);
      } else if (a.state === "work") {
        // working bob, slower and smaller — plus coins
        const bob = Math.sin(a.bob) * 2.6;
        body.y = bob;
        body.rotation = Math.sin(a.bob * 0.6) * 0.06;
        shadow.scale.set(1, 1);
        a.timer -= dt;
        a.coinTimer = (a.coinTimer || rand(1.2, 2.6)) - dt;
        if (a.coinTimer <= 0) {
          spawnCoin(a.node.x, a.node.y - 44);
          a.coinTimer = rand(1.4, 3.2);
        }
        if (a.timer <= 0) {
          // a tired cat goes to bed and then returns to its OWN job — cats do
          // not wander between buildings, because the player chose where each
          // of them works and the town has to show that choice
          sendTo(a, Math.random() < 0.3 ? HOME : a.home);
        }
      } else if (a.state === "entering") {
        // shrink into the door
        a.t = Math.min(1, a.t + dt / 0.45);
        a.node.scale.set(1 - a.t * 0.85);
        a.node.alpha = 1 - a.t;
        if (a.t >= 1) {
          a.node.visible = false;
          a.state = "nap";
          a.timer = rand(7, 14);
        }
      } else if (a.state === "nap") {
        // asleep inside — invisible, counted on the Nap House roof instead
        a.timer -= dt;
        if (a.timer <= 0) {
          a.node.visible = true;
          a.state = "exiting";
          a.t = 0;
        }
      } else if (a.state === "exiting") {
        a.t = Math.min(1, a.t + dt / 0.4);
        // slight overshoot on the way out — it reads as "refreshed"
        const k = a.t < 0.75 ? a.t / 0.75 : 1 + (1 - (a.t - 0.75) / 0.25) * 0.12;
        a.node.scale.set(0.15 + Math.min(k, 1.12) * 0.85);
        a.node.alpha = a.t;
        if (a.t >= 1) {
          a.node.scale.set(1);
          a.node.alpha = 1;
          sendTo(a, a.home);
        }
      }

      a.node.zIndex = a.node.y + 1;
    }

    // bounce the collect bubbles — a still badge does not pull the eye
    bounceT += dt * 4.2;
    for (const b of BUILDINGS) {
      const node = buildingNodes[b.id];
      if (!node) continue;
      for (const ch of node.__overlay.children) {
        if (ch.__bounce) {
          ch.y = -30 - Math.abs(Math.sin(bounceT)) * 9;
          ch.scale.set(1 + Math.abs(Math.sin(bounceT)) * 0.06);
        }
      }
    }

    // Nap House bed counter — the state of the beds, readable at a glance
    const napNode = HOME ? buildingNodes[HOME.id] : null;
    if (napNode) {
      const asleep = agents.filter((a) => a.state === "nap" || a.state === "entering").length;
      if (napNode.__napShown !== asleep) {
        napNode.__napShown = asleep;
        if (napNode.__napBadge) napNode.__napBadge.destroy({ children: true });
        const badge = new Container();
        badge.y = -napNode.__artH - 40;
        const beds = napBeds();
        const t = new Text({
          text: `${asleep}/${beds} beds`,
          style: { ...LABEL, fontSize: 13, fill: 0x5d2444 },
        });
        t.anchor.set(0.5);
        const g = new Graphics();
        const bw = t.width + 22;
        g.roundRect(-bw / 2, -13, bw, 26, 10).fill(0xe8dcff);
        g.roundRect(-bw / 2, -13, bw, 26, 10).stroke({ width: 2.5, color: 0xffffff, alignment: 1 });
        badge.addChild(g, t);
        if (asleep > 0) {
          const z = new Text({ text: "z z", style: { ...LABEL, fontSize: 14, fill: 0x9b7fe0 } });
          z.anchor.set(0.5);
          z.y = -30;
          badge.addChild(z);
        }
        napNode.addChild(badge);
        napNode.__napBadge = badge;
      }
    }

    // coins drift up and fade
    for (let i = coins.length - 1; i >= 0; i--) {
      const c = coins[i];
      c.life += dt;
      c.g.x += c.vx * dt;
      c.g.y += c.vy * dt;
      c.vy += 26 * dt;
      c.g.alpha = Math.max(0, 1 - c.life / 1.15);
      c.g.scale.set(0.7 + Math.min(c.life, 0.3));
      if (c.life > 1.15) {
        c.g.destroy();
        coins.splice(i, 1);
      }
    }
  });

  // Dev-only handle on the scene. Verifying that a town is actually MOVING is
  // impossible from screenshots — two frames of a cat mid-stride look the same
  // — and this is the difference between checking and guessing.
  if (process.env.NODE_ENV !== "production" && typeof window !== "undefined") {
    window.__TOWN__ = { app, root, world, buildingNodes, agents, reduced };
  }

  return {
    setCats,
    setBuildingState,
    setPositions,
    beginMove,
    cancelMove: () => endMove(false),
    zoomIn: () => {
      const w = app.renderer.width / app.renderer.resolution;
      const h = app.renderer.height / app.renderer.resolution;
      zoomAt(w / 2, h / 2, 1.35);
    },
    zoomOut: () => {
      const w = app.renderer.width / app.renderer.resolution;
      const h = app.renderer.height / app.renderer.resolution;
      zoomAt(w / 2, h / 2, 1 / 1.35);
    },
    centerOn: (id) => {
      const b = BUILDINGS.find((x) => x.id === id);
      if (!b) return;
      const w = app.renderer.width / app.renderer.resolution;
      const h = app.renderer.height / app.renderer.resolution;
      cam.x = w / 2 - b.x * cam.zoom;
      cam.y = h / 2 - b.y * cam.zoom;
      clamp();
    },
    setNapBeds(n) {
      napBeds = () => n;
      if (HOME && buildingNodes[HOME.id]) buildingNodes[HOME.id].__napShown = -1;
    },
    destroy() {
      try {
        ro.disconnect();
    window.removeEventListener("blur", resetGesture);
    document.removeEventListener("visibilitychange", resetGesture);
        canvas.removeEventListener("wheel", onWheel);
        canvas.removeEventListener("pointerdown", onDown);
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        window.removeEventListener("pointercancel", onUp);
      } catch {}
      try {
        app.destroy(true, { children: true });
      } catch {}
    },
  };
}
