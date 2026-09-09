// POST /api/town/act — do one thing.
//
// The body is `{ intent, args, key }` and nothing else matters:
//
//   · `intent` must be one of a closed list (lib/server/town.js INTENTS)
//   · `args` may carry a building id, a cat key — never an amount, never a
//     price, never a timestamp, never an elapsed
//   · `key` is the idempotency key, so a retry is a retry and a double-submit
//     is not two rewards
//
// The player id comes from the session cookie and NEVER from the body. That
// one rule is the whole of the IDOR defence: there is no path where a client
// -supplied id decides whose town changes.

import { NextResponse } from "next/server";
import { requirePlayerId } from "../../../../lib/server/session.js";
import { applyIntent } from "../../../../lib/server/town.js";
import {
  claimIdempotency,
  errorBody,
  rateLimit,
  releaseIdempotency,
  storeIdempotentResponse,
  token,
} from "../../../../lib/server/guard.js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Generous enough for a person tapping fast, mean enough that a script gets
// nowhere. Per account, in the database, so it survives a cold start.
const LIMIT = { max: 120, windowSec: 60 };

export async function POST(request) {
  let playerId = null;
  let idem = { key: null };
  try {
    playerId = await requirePlayerId();

    const body = await request.json().catch(() => ({}));
    const intent = token(body?.intent, { name: "intent", max: 40 });
    // Never spread client JSON anywhere. `args` is read key by key inside the
    // intent handler, which is the only place that knows what it may contain.
    const args = body?.args && typeof body.args === "object" && !Array.isArray(body.args)
      ? body.args
      : {};
    const key = token(body?.key, { name: "key", max: 80, optional: true });

    await rateLimit(playerId, "town_act", LIMIT);

    idem = await claimIdempotency(playerId, key, intent);
    if (!idem.fresh) {
      // A retry. Replay the stored answer rather than running the intent a
      // second time — this is what makes tapping twice safe.
      return NextResponse.json(
        idem.response ?? { ok: true, replayed: true },
        { headers: { "Cache-Control": "no-store" } }
      );
    }

    const out = await applyIntent(playerId, intent, args);
    const response = { ok: true, state: out.state, version: out.version, result: out.result };
    await storeIdempotentResponse(playerId, key, response);
    return NextResponse.json(response, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    // A failed intent must not leave its idempotency key claimed, or the retry
    // the player is about to make replays "nothing happened" forever.
    if (playerId && idem.fresh && idem.key) {
      await releaseIdempotency(playerId, idem.key);
    }
    const { status, body } = errorBody(e);
    return NextResponse.json(body, { status });
  }
}
