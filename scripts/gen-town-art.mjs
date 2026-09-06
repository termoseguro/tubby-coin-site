// ============================================================================
//  Generate the Tubby Town building art.
//
//  Usage:
//    1. Put your OpenAI API key in .env.local  (already gitignored):
//         OPENAI_API_KEY=sk-...
//    2. npm run art            # generates only the files that are missing
//       npm run art -- --force # regenerate everything
//       npm run art -- hall kitchen   # regenerate just these
//
//  Output: public/town/<id>.png, transparent, 1024x1024.
//
//  Notes:
//  - This needs an OpenAI **API** key from platform.openai.com. A ChatGPT Plus
//    subscription is a different product and does not work here.
//  - The key is read from the environment and never printed or committed.
//  - Prompts live in one place so the ten buildings stay stylistically
//    consistent — consistency matters far more than any single building.
//    See docs/art-brief.md.
// ============================================================================

import { readFile, writeFile, mkdir, access } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "public", "town");

// The style line is appended to every prompt, unchanged.
const STYLE =
  "cute kawaii mobile game building asset, chunky rounded shapes, soft pastel palette, " +
  "clean vector illustration with thick smooth outlines and soft cel shading, in the art " +
  "style of the mobile games Cats and Soup and Hay Day, front-facing with a very slight " +
  "three-quarter angle, centred with generous margin, whole building visible, isolated on " +
  "a fully transparent background, no ground, no shadow, no characters, no text, no logo";

const BUILDINGS = {
  hall:
    "A cheerful pink town hall for a village of cats. Two storeys, a wide arched wooden " +
    "double door, two round windows, a small bell tower on the roof with a golden bell and " +
    "a little flag on top. Bubblegum pink walls, deep magenta roof.",
  adoption:
    "A cosy shop shaped like a giant wrapped gift box with a big soft ribbon and bow on the " +
    "roof, a round window shaped like a cat's head, and a warm inviting door. Cream and " +
    "butter-yellow walls, golden-orange ribbon.",
  nap:
    "A small round cottage for sleeping cats. Soft domed roof, one big circular window with " +
    "curtains, a tiny arched door, a crescent moon ornament above the door. Lavender walls, " +
    "deep purple roof.",
  kitchen:
    "A cosy village kitchen cottage with a stone chimney, a warm open serving window with a " +
    "wooden counter, a striped awning, and a big soup pot sign hanging outside. Mint-green " +
    "walls, teal roof.",
  treats:
    "A small candy-coloured factory that makes cat treats. One tall rounded chimney, a wide " +
    "window showing shelves of biscuits, and a hanging sign shaped like a fish biscuit. " +
    "Peach walls, warm orange roof.",
  lumber:
    "An open wooden workshop shed with a slanted roof, stacks of round logs and tall " +
    "carpet-wrapped scratching posts leaning against the side, and a sawhorse. Warm tan " +
    "wood, brown roof.",
  quarry:
    "A small stone-cutting yard: a low rocky mound with smooth rounded grey boulders, neat " +
    "stacks of cut pebbles, and a wooden cart with a pickaxe leaning on it. Cool grey-blue " +
    "stone, slate roof on a small shelter.",
  garden:
    "A tidy raised garden plot with wooden edging, rows of leafy catnip plants with small " +
    "purple flowers, a tiny wooden fence and a watering can. Fresh green leaves, warm wood " +
    "edging.",
  storehouse:
    "A round-roofed barn for storing supplies. Big double barn doors, a hay-loft window at " +
    "the top, and wooden crates and sacks stacked beside it. Sky-blue walls, deeper blue roof.",
  watchtower:
    "A tall slender lookout tower with a pointed conical roof, a small balcony near the top " +
    "with a railing, a lantern hanging from it, and narrow windows. Pale lilac stone, deep " +
    "purple roof.",
};

async function loadKey() {
  if (process.env.OPENAI_API_KEY) return process.env.OPENAI_API_KEY;
  try {
    const env = await readFile(join(ROOT, ".env.local"), "utf8");
    const line = env.split(/\r?\n/).find((l) => l.trim().startsWith("OPENAI_API_KEY="));
    if (line) return line.slice(line.indexOf("=") + 1).trim().replace(/^["']|["']$/g, "");
  } catch {}
  return null;
}

const exists = (p) => access(p).then(() => true, () => false);

async function generate(key, id, prompt) {
  const res = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: "gpt-image-1",
      prompt: `${prompt} ${STYLE}`,
      size: "1024x1024",
      background: "transparent",
      quality: "medium",
      output_format: "png",
      n: 1,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`${res.status} ${res.statusText} — ${body.slice(0, 400)}`);
  }

  const json = await res.json();
  const b64 = json?.data?.[0]?.b64_json;
  if (!b64) throw new Error("no image data in response");
  await writeFile(join(OUT, `${id}.png`), Buffer.from(b64, "base64"));
}

const main = async () => {
  const key = await loadKey();
  if (!key) {
    console.error(
      "\nNo API key found.\n\n" +
        "Create .env.local in the project root (it is already gitignored) with:\n" +
        "  OPENAI_API_KEY=sk-...\n\n" +
        "Get the key at platform.openai.com/api-keys — this is separate from a\n" +
        "ChatGPT Plus subscription and needs its own credit balance.\n"
    );
    process.exit(1);
  }

  await mkdir(OUT, { recursive: true });

  const args = process.argv.slice(2);
  const force = args.includes("--force");
  const only = args.filter((a) => !a.startsWith("--"));

  const targets = Object.keys(BUILDINGS).filter((id) => (only.length ? only.includes(id) : true));
  if (!targets.length) {
    console.error(`Unknown building. Valid ids: ${Object.keys(BUILDINGS).join(", ")}`);
    process.exit(1);
  }

  let made = 0;
  let skipped = 0;
  for (const id of targets) {
    const file = join(OUT, `${id}.png`);
    if (!force && (await exists(file))) {
      console.log(`· ${id} — already there, skipping`);
      skipped++;
      continue;
    }
    process.stdout.write(`… ${id} `);
    try {
      await generate(key, id, BUILDINGS[id]);
      console.log("✓");
      made++;
    } catch (err) {
      console.log("✗");
      console.error(`  ${err.message}`);
    }
  }

  console.log(`\n${made} generated, ${skipped} skipped. Files in public/town/`);
  if (made) console.log("Reload /game — the town picks them up automatically.");
};

main();
