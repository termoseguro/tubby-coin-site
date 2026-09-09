// GET /api/town — what the server says your town is.
//
// Read-only, and it says so: no version bump, no clock write, no grant. The
// clock is advanced in memory so the numbers are current, and the write that
// makes that permanent happens on the next real intent.

import { NextResponse } from "next/server";
import { requirePlayerId } from "../../../lib/server/session.js";
import { readTown } from "../../../lib/server/town.js";
import { errorBody } from "../../../lib/server/guard.js";

// A town is per-player and changes constantly. Cached at any layer it would be
// somebody else's town, or this one before it was spent out of.
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    const playerId = await requirePlayerId();
    const { state, version } = await readTown(playerId);
    return NextResponse.json(
      { ok: true, state, version },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (e) {
    const { status, body } = errorBody(e);
    return NextResponse.json(body, { status });
  }
}
