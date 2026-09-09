// POST /api/auth/verify — prove the wallet is yours, get a session.
//
// The signature is checked HERE. The client never says "I logged in"; it hands
// over a signature and the server decides. Everything about this route is one
// of the attacks in docs/security.md §4 being closed:
//
//   · the nonce is BURNED atomically, so a captured signature works once
//   · the nonce is bound to the address, so wallet A's signature is not
//     wallet B's proof
//   · the message names the domain, so a signature phished by another site
//     does not verify here
//   · the session goes in an httpOnly cookie, never in localStorage

import { NextResponse } from "next/server";
import { db } from "../../../../lib/server/db.js";
import { errorBody, token, userError } from "../../../../lib/server/guard.js";
import { startSession } from "../../../../lib/server/session.js";
import { isAddress, loginMessage, verifySignature } from "../../../../lib/server/solana.js";
import { NONCE_TTL_MS } from "../nonce/route.js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request) {
  try {
    const { address, nonce, signature, issuedAt } = await request.json().catch(() => ({}));
    if (!isAddress(address)) throw bad("That is not a Solana address.");
    const n = token(nonce, { name: "nonce", max: 64 });
    if (typeof signature !== "string" || signature.length > 128) throw bad("Malformed signature.");

    // BURN FIRST. Claiming the nonce before checking the signature means two
    // concurrent attempts cannot both succeed, and a valid signature replayed
    // a second later finds nothing to spend. The database decides the race.
    const burned = await db.update(
      "wallet_nonces",
      `nonce=eq.${encodeURIComponent(n)}&address=eq.${encodeURIComponent(address)}&used_at=is.null`,
      { used_at: new Date().toISOString() }
    );
    if (!burned || burned.length !== 1) throw bad("That sign-in request has expired. Try again.");

    const row = burned[0];
    if (Date.now() - new Date(row.created_at).getTime() > NONCE_TTL_MS) {
      throw bad("That sign-in request has expired. Try again.");
    }

    const domain = new URL(request.url).host;
    const message = loginMessage({ domain, address, nonce: n, issuedAt: String(issuedAt || "") });
    if (!verifySignature(address, message, signature)) {
      throw bad("That signature does not match the wallet.");
    }

    // ---- who this is --------------------------------------------------------
    let wallet = await db.one(
      "wallets",
      `address=eq.${encodeURIComponent(address)}&select=player_id`
    );
    let playerId = wallet?.player_id;

    if (!playerId) {
      const [player] = await db.insert("players", {});
      playerId = player.id;
      const claimed = await db.claim("wallets", { address, player_id: playerId });
      if (!claimed) {
        // Somebody registered this wallet between the read and the write.
        // Theirs wins; the player row we just made is orphaned and harmless.
        wallet = await db.one(
          "wallets",
          `address=eq.${encodeURIComponent(address)}&select=player_id`
        );
        playerId = wallet.player_id;
      }
    }

    const player = await db.one("players", `id=eq.${playerId}&select=banned_at,ban_reason`);
    if (player?.banned_at) throw bad("This account is closed.");

    await startSession(playerId, request.headers.get("user-agent"));
    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    const { status, body } = errorBody(e);
    return NextResponse.json(body, { status });
  }
}

const bad = (message) => userError(message);
