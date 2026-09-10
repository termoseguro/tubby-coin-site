// POST /api/auth/nonce — ask for something to sign.
//
// The nonce is single-use, short-lived and bound to the address that asked for
// it. All three matter: without single-use, a captured signature logs in
// forever; without an expiry, a signature captured once works next year;
// without the binding, a signature made by wallet A can be presented as wallet
// B's. docs/security.md §4.

import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { db } from "../../../../lib/server/db.js";
import { errorBody, userError } from "../../../../lib/server/guard.js";
import { isAddress, loginMessage, signingDomain } from "../../../../lib/server/solana.js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const NONCE_TTL_MS = 5 * 60 * 1000;

export async function POST(request) {
  try {
    const { address } = await request.json().catch(() => ({}));
    if (!isAddress(address)) {
      throw userError("That is not a Solana address.");
    }

    const nonce = randomBytes(24).toString("base64url");
    const issuedAt = new Date().toISOString();
    // Pinned, not derived from the request — see signingDomain().
    const domain = signingDomain(request);

    // Stored WITHOUT a player id: the wallet has not proved anything yet. The
    // row exists so the nonce can be burned on use, and for nothing else.
    await db.insert("wallet_nonces", { nonce, address, player_id: null }).catch(async (e) => {
      // The init migration made player_id NOT NULL. A nonce belongs to nobody
      // until it is used, so the column has to allow it — say so loudly rather
      // than failing login with a database code.
      if (e.code === "23502") {
        throw Object.assign(
          new Error("wallet_nonces.player_id must be nullable — run the latest migration."),
          { status: 500 }
        );
      }
      throw e;
    });

    return NextResponse.json(
      { ok: true, nonce, issuedAt, message: loginMessage({ domain, address, nonce, issuedAt }) },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (e) {
    const { status, body } = errorBody(e);
    return NextResponse.json(body, { status });
  }
}
