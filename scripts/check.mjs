// npm run check — a production build that does NOT disturb `npm run dev`.
//
// Running `next build` normally writes into the same .next the dev server is
// serving from, which deletes the chunks that server already handed to the
// browser. Every chunk 404s on the next reload and the game hangs on "Waking
// the cats" — it looks exactly like a code bug, and it is not one. This cost
// three debugging sessions before anyone noticed the cause.
//
// So this builds into .next-check instead. Safe to run at any time, including
// while the dev server is up.
//
// Written as a script rather than an inline env var in package.json because
// `FOO=bar next build` is a POSIX shell idiom and npm runs scripts through
// cmd.exe on Windows, where it fails.

import { spawnSync } from "node:child_process";

const result = spawnSync("next", ["build"], {
  stdio: "inherit",
  shell: true,
  env: { ...process.env, NEXT_DIST_DIR: ".next-check" },
});

process.exit(result.status ?? 1);
