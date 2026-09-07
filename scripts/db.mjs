// npm run db:<something> — the Supabase CLI, with a guard rail.
//
// WHY THIS WRAPPER EXISTS
//
// The Supabase CLI keeps its login token GLOBALLY (~/.supabase). One token can
// reach every project on the account. The link — which project this folder
// talks to — is stored per-repo in supabase/.temp/project-ref, and that file is
// gitignored, so it is exactly the kind of thing that can quietly be wrong.
//
// This machine has other Supabase projects on it. A `db push` that runs against
// the wrong one would apply Tubby Town's schema to somebody else's database,
// and `db reset` would drop it. That is not a risk worth carrying for the sake
// of typing four fewer words.
//
// So: every command here first checks that the linked project ref matches
// SUPABASE_PROJECT_REF from .env.local, and refuses to run if it does not.
// The ref is not a secret — it is in your public Supabase URL — which is why it
// can live in an env file and be compared out loud.
//
// Destructive commands (`db reset`) are blocked against a linked remote
// entirely. If you ever genuinely need one, run it by hand and mean it.

import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";

const ROOT = new URL("..", import.meta.url);
const envPath = new URL(".env.local", ROOT);

/** Read .env.local without a dependency. Values may be quoted. */
function readEnv() {
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
const expected = env.SUPABASE_PROJECT_REF;
const [cmd, ...rest] = process.argv.slice(2);

const linkedPath = new URL("supabase/.temp/project-ref", ROOT);
const linked = existsSync(linkedPath) ? readFileSync(linkedPath, "utf8").trim() : null;

function die(msg) {
  console.error("\n✗ " + msg + "\n");
  process.exit(1);
}

if (!expected) {
  die(
    "SUPABASE_PROJECT_REF is not set.\n" +
      "  Put it in .env.local (gitignored). It is the subdomain of your project\n" +
      "  URL: https://<THIS-PART>.supabase.co — not a secret.\n" +
      "  See docs/backend-setup.md."
  );
}

if (cmd === "reset") {
  die(
    "`db reset` DROPS EVERY TABLE and is blocked here.\n" +
      "  Against a linked remote it would destroy real data. If you genuinely\n" +
      "  want it, run the CLI by hand and mean it."
  );
}

// `link` is the one command allowed to run without a matching link, since it is
// the thing that creates one.
if (cmd !== "link") {
  if (!linked) {
    die("This folder is not linked to a project yet. Run: npm run db:link");
  }
  if (linked !== expected) {
    die(
      `LINKED TO THE WRONG PROJECT.\n` +
        `  supabase/.temp/project-ref says: ${linked}\n` +
        `  .env.local expects:             ${expected}\n\n` +
        `  Refusing to touch a database this repo does not own. Fix the link\n` +
        `  with: npm run db:link`
    );
  }
}

const args =
  cmd === "link"
    ? ["link", "--project-ref", expected, ...rest]
    : cmd === "push"
      ? ["db", "push", ...rest]
      : cmd === "diff"
        ? ["db", "diff", ...rest]
        : cmd === "pull"
          ? ["db", "pull", ...rest]
          : cmd === "status"
            ? ["projects", "list"]
            : null;

if (!args) {
  die(`Unknown command "${cmd}". Try: link, push, diff, pull, status.`);
}

if (cmd !== "link") console.log(`→ project ${linked}`);

const r = spawnSync("npx", ["supabase", ...args], {
  stdio: "inherit",
  shell: true,
  cwd: new URL(".", ROOT).pathname.replace(/^\/([A-Za-z]:)/, "$1"),
  env,
});
process.exit(r.status ?? 1);
