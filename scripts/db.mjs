// npm run db:<something> — the Supabase CLI, with a guard rail.
//
// WHY THIS WRAPPER EXISTS
//
// The Supabase CLI keeps its login token GLOBALLY (~/.supabase). One token can
// reach every project on the account. The link — which project this folder
// talks to — is stored per-repo in supabase/.temp/project-ref, and that file is
// gitignored, so it is exactly the kind of thing that can quietly be wrong.
//
// This machine has other Supabase projects on it, and they are not ours to
// break. A `db push` that ran against the wrong one would apply Tubby Town's
// schema over somebody else's database; `db reset` would drop it.
//
// So the allowed project is PINNED IN A COMMITTED FILE,
// supabase/ALLOWED_PROJECT_REF, and every command checks that three things
// agree before anything runs:
//
//     the pinned ref  ==  the linked ref  ==  SUPABASE_PROJECT_REF (if set)
//
// Pinning it in git rather than only in .env.local is the point: .env.local is
// gitignored, so nothing reviews it and nothing would notice if it changed. A
// committed file cannot drift silently, and it means that even with a wrong or
// missing .env.local, this repo still cannot reach another project.
//
// The ref is not a secret — it is the subdomain of the public Supabase URL —
// which is exactly why it can be committed and compared out loud.
//
// Destructive commands are blocked rather than guarded. There is no version of
// "drop every table on the linked remote" that deserves a convenience wrapper.

import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";

const ROOT = new URL("..", import.meta.url);

/** Read .env.local without a dependency. Values may be quoted. */
function readEnv() {
  const envPath = new URL(".env.local", ROOT);
  if (!existsSync(envPath)) return {};
  const out = {};
  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
    if (!m) continue;
    out[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
  }
  return out;
}

const env = { ...readEnv(), ...process.env };
const [cmd, ...rest] = process.argv.slice(2);

function die(msg) {
  console.error("\n✗ " + msg + "\n");
  process.exit(1);
}

// ---- the authority --------------------------------------------------------
const pinPath = new URL("supabase/ALLOWED_PROJECT_REF", ROOT);
const pinned = existsSync(pinPath) ? readFileSync(pinPath, "utf8").trim() : null;

if (!pinned) {
  die(
    "supabase/ALLOWED_PROJECT_REF is missing.\n" +
      "  That file pins the one project this repo may touch. Without it there\n" +
      "  is nothing to check against, so nothing runs."
  );
}

// If .env.local names a ref too, it must agree. A disagreement means something
// is pointing this repo somewhere it does not belong: say so, never pick one.
if (env.SUPABASE_PROJECT_REF && env.SUPABASE_PROJECT_REF !== pinned) {
  die(
    ".env.local DISAGREES WITH THE PINNED PROJECT.\n" +
      `  supabase/ALLOWED_PROJECT_REF: ${pinned}\n` +
      `  .env.local:                   ${env.SUPABASE_PROJECT_REF}\n\n` +
      `  This repo may only ever touch ${pinned}. Fix .env.local.`
  );
}

// ---- destructive commands do not get a wrapper ----------------------------
if (["reset", "remote-commit", "branches"].includes(cmd)) {
  die(
    `"${cmd}" can destroy data and is blocked here.\n` +
      "  If you genuinely want it, run the CLI by hand and mean it."
  );
}

// ---- the link must match --------------------------------------------------
const linkedPath = new URL("supabase/.temp/project-ref", ROOT);
const linked = existsSync(linkedPath) ? readFileSync(linkedPath, "utf8").trim() : null;

// `link` is the one command allowed to run without a matching link, because it
// is the thing that creates one — and it can only ever link to the pinned ref.
if (cmd !== "link") {
  if (!linked) die("This folder is not linked yet. Run: npm run db:link");
  if (linked !== pinned) {
    die(
      "LINKED TO THE WRONG PROJECT.\n" +
        `  supabase/.temp/project-ref says: ${linked}\n` +
        `  this repo is pinned to:          ${pinned}\n\n` +
        "  Refusing to touch a database this repo does not own — the other\n" +
        "  projects on this machine are not ours to break. Relink with:\n" +
        "  npm run db:link"
    );
  }
}

const args = {
  link: ["link", "--project-ref", pinned, ...rest],
  push: ["db", "push", ...rest],
  diff: ["db", "diff", ...rest],
  pull: ["db", "pull", ...rest],
  status: ["projects", "list"],
}[cmd];

if (!args) die(`Unknown command "${cmd}". Try: link, push, diff, pull, status.`);

console.log(`→ project ${pinned}`);

const r = spawnSync("npx", ["supabase", ...args], {
  stdio: "inherit",
  shell: true,
  env,
});
process.exit(r.status ?? 1);
