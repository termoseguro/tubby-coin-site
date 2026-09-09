// POST /api/auth/logout — end the session.
//
// Revokes the row as well as clearing the cookie. Clearing only the cookie
// leaves a working token in anyone's hands who copied it, and "log out" has to
// mean the session is dead everywhere, not just in this browser.

import { NextResponse } from "next/server";
import { endSession } from "../../../../lib/server/session.js";
import { errorBody } from "../../../../lib/server/guard.js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST() {
  try {
    await endSession();
    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    const { status, body } = errorBody(e);
    return NextResponse.json(body, { status });
  }
}
