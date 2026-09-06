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

import { Application, Assets, Container, Graphics, Rectangle, Sprite, Text } from "pixi.js";
import { BUILDINGS, HORIZON, LANES, WORLD, workSpot } from "../../../lib/townConfig";
import { RARITIES } from "../../../lib/gameConfig";

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
  const url = await resolveArt(b.id);
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

  c.addChild(...namePlate(b, -s.height));
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

  c.addChild(...namePlate(b, -b.h - b.h * 0.42));
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
function namePlate(b, topY = 0) {
  // Front row labels sit on the grass below. Back row labels sit ABOVE the
  // roof — otherwise the front row covers them and half the town goes unnamed.
  const y = b.row === "back" ? topY - 26 : 4;

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

  return [plate, label];
}

// ---------------------------------------------------------------------------
//  Cats
// ---------------------------------------------------------------------------

/** A townsfolk cat: the real portrait, in a white ring tinted by rarity, with
 *  a shadow that squashes as it bobs. */
function makeCat(texture, rarity) {
  const c = new Container();
  const R = 23;

  const shadow = new Graphics();
  shadow.ellipse(0, 4, R * 0.82, 6).fill({ color: 0xc44e8d, alpha: 0.35 });
  c.addChild(shadow);

  const body = new Container();

  const ring = new Graphics();
  ring.circle(0, -R, R + 4).fill(0xffffff);
  ring.circle(0, -R, R + 4).stroke({ width: 3.5, color: RARITY_HEX[rarity] || 0xb3a3c4, alignment: 0 });
  body.addChild(ring);

  const sprite = new Sprite(texture);
  const size = R * 2;
  sprite.width = size;
  sprite.height = size;
  sprite.anchor.set(0.5);
  sprite.y = -R;

  const mask = new Graphics();
  mask.circle(0, -R, R).fill(0xffffff);
  sprite.mask = mask;
  body.addChild(mask, sprite);

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

  // Everything lives in `root`, and `root` is scaled to the real container
  // size. Doing it this way means the renderer draws at NATIVE resolution —
  // stretching the canvas with CSS (object-fit) resamples the bitmap, which is
  // exactly what "blurry and cut off" looks like.
  const root = new Container();
  app.stage.addChild(root);

  function layout() {
    const w = Math.max(320, host.clientWidth || WORLD.w);
    const h = Math.max(240, host.clientHeight || WORLD.h);
    app.renderer.resize(w, h);
    // Fill the box, then anchor to the BOTTOM: if anything has to be cropped
    // it is empty sky, never the town.
    const k = Math.max(w / WORLD.w, h / WORLD.h);
    root.scale.set(k);
    root.x = (w - WORLD.w * k) / 2;
    root.y = h - WORLD.h * k;
  }
  layout();

  const ro = new ResizeObserver(() => layout());
  ro.observe(host);

  // ---- sky -----------------------------------------------------------------
  const sky = new Graphics();
  sky.rect(0, 0, WORLD.w, HORIZON + 40).fill({
    type: "linear",
    start: { x: 0, y: 0 },
    end: { x: 0, y: 1 },
    colorStops: [
      { offset: 0, color: 0x8fd8f7 },
      { offset: 0.45, color: 0xbfe9ff },
      { offset: 0.78, color: 0xffd9ec },
      { offset: 1, color: 0xffc2e0 },
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
    g.y = rand(40, 210);
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

  // ---- the road ------------------------------------------------------------
  // One winding road, not two straight bars. Straight bars read as UI.
  const road = new Graphics();
  const wander = (y, amp) => {
    road.moveTo(LX + 40, y);
    for (let x = LX + 40; x <= LX + LW - 40; x += 70) {
      road.lineTo(x, y + Math.sin(x / 150) * amp);
    }
  };
  road.setStrokeStyle({ width: 34, color: 0xe9d3ae, cap: "round", join: "round" });
  wander(LANES.back, 7);
  road.stroke();
  road.setStrokeStyle({ width: 38, color: 0xe9d3ae, cap: "round", join: "round" });
  wander(LANES.front, 6);
  road.stroke();
  // connectors between the two streets
  road.setStrokeStyle({ width: 30, color: 0xe9d3ae, cap: "round" });
  for (const x of [300, 700, 1120]) {
    road.moveTo(x, LANES.back).lineTo(x + 24, LANES.front);
  }
  road.stroke();
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
  pond(decoBack, 1460, LY + 74);
  for (let x = 70; x < LW; x += 110) {
    if (rnd() > 0.45) tree(decoBack, LX + x + rnd() * 30, LY + 40 + rnd() * 22, 0.72 + rnd() * 0.2, true);
    else bush(decoBack, LX + x + rnd() * 40, LY + 52 + rnd() * 20, 0.7 + rnd() * 0.3);
  }
  for (let i = 0; i < 26; i++) {
    flowers(decoBack, LX + 40 + rnd() * (LW - 80), LY + 30 + rnd() * (LH - 70));
  }
  fence(decoBack, 120, LANES.back - 60, 5);
  fence(decoBack, 1020, LANES.back - 58, 4);
  root.addChild(decoBack);

  // in front of the buildings: a few big trees and lampposts that OVERLAP the
  // buildings — occlusion is what turns a flat row into a scene
  const frontProps = [
    { fn: tree, x: 40, y: 752, s: 1.45 },
    { fn: tree, x: 322, y: 758, s: 1.3 },
    { fn: tree, x: 952, y: 757, s: 1.35 },
    { fn: tree, x: 1578, y: 750, s: 1.45 },
    { fn: lamppost, x: 636, y: 754 },
    { fn: lamppost, x: 1286, y: 752 },
    { fn: bush, x: 212, y: 758, s: 1.4 },
    { fn: bush, x: 1008, y: 758, s: 1.35 },
  ];

  // ---- world layer (buildings + cats, depth-sorted) ------------------------
  const world = new Container();
  world.sortableChildren = true;
  root.addChild(world);

  // Real art first, drawn placeholder only where a file is still missing — so
  // the town upgrades one building at a time as art lands. See docs/art-brief.md.
  //
  // Buildings are static sprites and still fully interactive: a hit area, a
  // hover lift, a selection ring, and overlays drawn on top for level, build
  // progress and "ready" badges. This is exactly how the genre does it — no 3D
  // is involved or needed.
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

    // overlay slot: level chip, build progress, ready badge
    const overlay = new Container();
    overlay.y = b.row === "back" ? -artH - 58 : -artH - 12;
    node.addChild(overlay);

    node.__ring = ring;
    node.__overlay = overlay;
    node.__artH = artH;
    node.__baseY = b.y;

    node.eventMode = "static";
    node.cursor = "pointer";
    node.hitArea = new Rectangle(-artW / 2, -artH, artW, artH + 22);
    node.on("pointertap", () => opts.onSelect?.(b.id));
    node.on("pointerover", () => {
      node.y = b.y - 6;
    });
    node.on("pointerout", () => {
      node.y = b.y;
    });

    buildingNodes[b.id] = node;
    world.addChild(node);
  }

  /** Paint per-building state: { hall: { level, job: {pct} , ready } } */
  function setBuildingState(states = {}, selectedId = null) {
    for (const b of BUILDINGS) {
      const node = buildingNodes[b.id];
      if (!node) continue;
      node.__ring.visible = b.id === selectedId;

      const st = states[b.id] || {};
      const ov = node.__overlay;
      ov.removeChildren().forEach((ch) => ch.destroy({ children: true }));

      // level chip
      if (st.level) {
        const chip = new Graphics();
        const t = new Text({ text: `Lv ${st.level}`, style: { ...LABEL, fontSize: 13, fill: 0x6a4300 } });
        t.anchor.set(0.5);
        const cw = t.width + 20;
        chip.roundRect(-cw / 2, -14, cw, 26, 10).fill(0xffd23f);
        chip.roundRect(-cw / 2, -14, cw, 26, 10).stroke({ width: 2.5, color: 0xffffff, alignment: 1 });
        ov.addChild(chip, t);
      }

      // ready to collect — the bouncing bubble that is the whole reason a
      // player opens a city builder at all
      if (st.ready > 0) {
        const bubble = new Container();
        bubble.y = -30;
        const g = new Graphics();
        g.circle(0, 0, 17).fill(0xffffff);
        g.circle(0, 0, 17).stroke({ width: 3, color: st.readyFull ? 0xff7a9c : 0xffc327, alignment: 0 });
        g.moveTo(-6, 14).lineTo(6, 14).lineTo(0, 22).closePath().fill(0xffffff);
        const dot = new Graphics();
        const rc = { fish: 0x5bb8e8, wood: 0xc08b4f, stone: 0x8a97ad, catnip: 0x78be4f, treats: 0xf2a03d }[st.res] || 0xf2a03d;
        dot.circle(0, 0, 8).fill(rc);
        bubble.addChild(g, dot);
        bubble.__bounce = true;
        ov.addChild(bubble);
      }

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
        if (node.__art) node.__art.tint = 0xcfc4cc;
      } else if (node.__art) {
        node.__art.tint = 0xffffff;
      }
    }
  }

  for (const pr of frontProps) {
    const g = new Graphics();
    pr.fn(g, pr.x, pr.y, pr.s);
    g.zIndex = pr.y + 2;
    world.addChild(g);
  }

  const fx = new Container();
  root.addChild(fx);

  // ---- cats ----------------------------------------------------------------
  const WORKABLE = BUILDINGS.filter(
    (b) => !["hall", "storehouse", "watchtower", "nap", "adoption"].includes(b.id)
  );
  const NAP = BUILDINGS.find((b) => b.id === "nap");
  let napBeds = () => 3;

  let agents = [];

  function laneFor(y) {
    return Math.abs(y - LANES.back) <= Math.abs(y - LANES.front) ? LANES.back : LANES.front;
  }

  function sendTo(a, building) {
    a.target = building;
    // The Nap House is the one building cats go INSIDE: they walk to the door
    // and shrink into it. Sleeping is private, beds are limited, and this way
    // we never need interior art — the bed count on the roof carries the state.
    const spot =
      building.id === "nap"
        ? { x: building.x, y: building.y - 4 }
        : workSpot(building, a.slot);
    a.lane = laneFor(LANES[building.row]);
    a.route = [
      { x: a.node.x, y: a.lane },
      { x: spot.x, y: a.lane },
      { x: spot.x, y: spot.y },
    ];
    a.leg = 0;
    a.state = "walk";
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
    list.forEach((cat, i) => {
      const node = makeCat(cat.texture, cat.rarity);
      const start = pick(WORKABLE);
      const spot = workSpot(start, i);
      node.x = spot.x;
      node.y = spot.y;
      node.zIndex = spot.y + 1;
      world.addChild(node);
      const a = {
        key: cat.key,
        node,
        slot: i,
        state: "work",
        target: start,
        timer: rand(2, 7),
        bob: rand(0, Math.PI * 2),
        speed: rand(34, 52),
        route: [],
        leg: 0,
        lane: LANES.back,
      };
      agents.push(a);
    });
  }

  const textures = {};
  async function setCats(list) {
    const resolved = [];
    for (const c of list) {
      if (!textures[c.art]) {
        try {
          textures[c.art] = await Assets.load(c.art);
        } catch {
          continue;
        }
      }
      resolved.push({ ...c, texture: textures[c.art] });
    }
    buildAgents(resolved);
  }

  await setCats(cats);

  // ---- the loop ------------------------------------------------------------
  const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;

  let bounceT = 0;
  app.ticker.add((ticker) => {
    const dt = Math.min(ticker.deltaMS, 60) / 1000;

    for (const c of cloudData) {
      c.g.x += c.speed * dt;
      if (c.g.x > WORLD.w + 120) c.g.x = -120;
    }

    if (reduced) return;

    for (const a of agents) {
      a.bob += dt * (a.state === "walk" ? 9 : 3.2);
      const body = a.node.__body;
      const shadow = a.node.__shadow;

      if (a.state === "walk") {
        const leg = a.route[a.leg];
        if (!leg) {
          a.state = "work";
          a.timer = rand(5, 12);
        } else {
          const dx = leg.x - a.node.x;
          const dy = leg.y - a.node.y;
          const dist = Math.hypot(dx, dy);
          if (dist < 2) {
            a.leg += 1;
            if (a.leg >= a.route.length) {
              if (a.target.id === "nap") {
                a.state = "entering";
                a.t = 0;
              } else {
                a.state = "work";
                a.timer = rand(6, 14);
              }
            }
          } else {
            const step = Math.min(a.speed * dt, dist);
            a.node.x += (dx / dist) * step;
            a.node.y += (dy / dist) * step;
            if (Math.abs(dx) > 1) body.scale.x = dx < 0 ? -1 : 1;
          }
        }
        // walk bounce
        const bounce = Math.abs(Math.sin(a.bob)) * 5;
        body.y = -bounce;
        shadow.scale.set(1 - bounce / 26, 1 - bounce / 20);
        a.node.__zzz.visible = false;
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
          // occasionally go for a nap, otherwise switch job
          sendTo(a, Math.random() < 0.28 ? NAP : pick(WORKABLE));
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
          sendTo(a, pick(WORKABLE));
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
    const napNode = buildingNodes.nap;
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

  return {
    setCats,
    setBuildingState,
    setNapBeds(n) {
      napBeds = () => n;
      if (buildingNodes.nap) buildingNodes.nap.__napShown = -1;
    },
    destroy() {
      try {
        ro.disconnect();
      } catch {}
      try {
        app.destroy(true, { children: true });
      } catch {}
    },
  };
}
