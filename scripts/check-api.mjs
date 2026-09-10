// npm run check:api — attacks the running server the way a player would.
//
// docs/security.md sets the standing rule: every attack found gets closed by a
// constraint and by a TEST THAT PROVES IT NOW FAILS. This is that test. It is
// not a unit test of the handlers; it is HTTP against a live server, because
// the defence is the whole request path — cookie, middleware, validation,
// database — and any of those can be right in isolation and wrong together.
//
// It signs with a real ed25519 key, so the happy path is exercised too. A
// security check that only ever sends garbage never notices that it has broken
// logging in.
//
//   npm run dev          (in another terminal)
//   npm run check:api

import { generateKeyPairSync, sign as edSign, createPublicKey } from "node:crypto";

const BASE = process.env.CHECK_API_BASE || "http://localhost:3000";

let pass = 0;
let fail = 0;
const skipped = [];

function ok(name, condition, detail = "") {
  if (condition) {
    pass++;
    console.log(`  ✓ ${name}`);
  } else {
    fail++;
    console.log(`  ✗ ${name}${detail ? " — " + detail : ""}`);
  }
}

async function req(path, { method = "GET", body, cookie, headers = {} } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(cookie ? { cookie } : {}),
      ...headers,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    redirect: "manual",
  });
  let json = null;
  const text = await res.text();
  try {
    json = text ? JSON.parse(text) : null;
  } catch {}
  return { status: res.status, json, text, headers: res.headers };
}

// ---- base58, for the signature ---------------------------------------------
const B58 = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
function base58(bytes) {
  const digits = [0];
  for (const byte of bytes) {
    let carry = byte;
    for (let i = 0; i < digits.length; i++) {
      carry += digits[i] << 8;
      digits[i] = carry % 58;
      carry = (carry / 58) | 0;
    }
    while (carry) {
      digits.push(carry % 58);
      carry = (carry / 58) | 0;
    }
  }
  let out = "";
  for (const b of bytes) {
    if (b === 0) out += "1";
    else break;
  }
  return out + digits.reverse().map((d) => B58[d]).join("");
}

/** A throwaway Solana-shaped identity. `generateKeyPairSync` already hands
 *  back a public KeyObject, so it goes straight to `.export` — passing it back
 *  through createPublicKey is what threw "expected private". */
function makeWallet() {
  const { publicKey, privateKey } = generateKeyPairSync("ed25519");
  const raw = publicKey.export({ format: "der", type: "spki" }).subarray(-32);
  return {
    address: base58(raw),
    sign: (message) => base58(edSign(null, Buffer.from(message, "utf8"), privateKey)),
  };
}

console.log(`\n  Attacking ${BASE}\n`);

// ---------------------------------------------------------------------------
//  1. Nothing is readable or writable without a session
// ---------------------------------------------------------------------------
console.log("  Anonymous requests");
{
  const town = await req("/api/town");
  ok("GET /api/town is refused without a session", town.status === 401, `got ${town.status}`);

  const act = await req("/api/town/act", {
    method: "POST",
    body: { intent: "collect_alley" },
  });
  ok("POST /api/town/act is refused without a session", act.status === 401, `got ${act.status}`);
}

// ---------------------------------------------------------------------------
//  2. Sign-in: the signature is checked, the nonce is single use
// ---------------------------------------------------------------------------
console.log("\n  Sign-in");
const wallet = makeWallet();
let cookie = null;
{
  const bad = await req("/api/auth/nonce", { method: "POST", body: { address: "not-an-address" } });
  ok("a malformed address is rejected", bad.status === 400, `got ${bad.status}`);

  const first = await req("/api/auth/nonce", { method: "POST", body: { address: wallet.address } });

  if (first.status === 500) {
    skipped.push(
      "the wallet sign-in tests — the server could not reach the database " +
        "(is SUPABASE_SERVICE_ROLE_KEY set in .env.local?)"
    );
  } else {
    ok("a valid address gets a nonce", first.status === 200 && !!first.json?.nonce);

    const { nonce, issuedAt, message } = first.json;

    // A signature from a DIFFERENT wallet must not log this one in.
    const impostor = makeWallet();
    const forged = await req("/api/auth/verify", {
      method: "POST",
      body: { address: wallet.address, nonce, issuedAt, signature: impostor.sign(message) },
    });
    ok("another wallet's signature is refused", forged.status === 400, `got ${forged.status}`);

    // The forged attempt BURNED the nonce, which is correct — burn first, then
    // check. So the real sign-in needs a fresh one.
    const second = await req("/api/auth/nonce", {
      method: "POST",
      body: { address: wallet.address },
    });
    const real = await req("/api/auth/verify", {
      method: "POST",
      body: {
        address: wallet.address,
        nonce: second.json.nonce,
        issuedAt: second.json.issuedAt,
        signature: wallet.sign(second.json.message),
      },
    });
    ok("a real signature signs in", real.status === 200, `got ${real.status} ${real.text.slice(0, 90)}`);

    const setCookie = real.headers.get("set-cookie") || "";
    ok("the session cookie is httpOnly", /httponly/i.test(setCookie), setCookie.slice(0, 60));
    ok("the session cookie is SameSite", /samesite/i.test(setCookie));
    cookie = setCookie.split(";")[0];

    // Replaying the same signature must not produce a second session.
    const replay = await req("/api/auth/verify", {
      method: "POST",
      body: {
        address: wallet.address,
        nonce: second.json.nonce,
        issuedAt: second.json.issuedAt,
        signature: wallet.sign(second.json.message),
      },
    });
    ok("a replayed signature is refused", replay.status === 400, `got ${replay.status}`);
  }
}

// ---------------------------------------------------------------------------
//  3. With a session: the server still decides everything
// ---------------------------------------------------------------------------
if (cookie) {
  console.log("\n  Signed in");

  const town = await req("/api/town", { cookie });
  ok("GET /api/town works with a session", town.status === 200, `got ${town.status}`);

  const unknown = await req("/api/town/act", {
    method: "POST",
    cookie,
    body: { intent: "give_me_everything" },
  });
  ok("an unknown intent is refused", unknown.status === 400, `got ${unknown.status}`);

  // The endpoint takes no amount. Sending one must change nothing.
  const forgedAmount = await req("/api/town/act", {
    method: "POST",
    cookie,
    body: { intent: "collect_alley", args: { coin: 999999999, amount: 999999999 } },
  });
  const after = await req("/api/town", { cookie });
  const coin = after.json?.state?.res?.coin ?? 0;
  ok(
    "an amount in the body is ignored",
    forgedAmount.status === 200 && coin < 1_000_000,
    `coin is ${coin}`
  );

  // Building something that is not unlocked.
  const cheat = await req("/api/town/act", {
    method: "POST",
    cookie,
    body: { intent: "start_upgrade", args: { building: "warroom" } },
  });
  ok("upgrading a locked building is refused", cheat.status === 400, `got ${cheat.status}`);

  // A building id that does not exist at all.
  const junk = await req("/api/town/act", {
    method: "POST",
    cookie,
    body: { intent: "start_upgrade", args: { building: "__proto__" } },
  });
  ok("a junk building id is refused", junk.status === 400, `got ${junk.status}`);

  // Assigning a cat the player does not own.
  const idor = await req("/api/town/act", {
    method: "POST",
    cookie,
    body: { intent: "assign", args: { cat: "somebody-elses-cat", building: "lumber" } },
  });
  ok("assigning a cat you do not own is refused", idor.status === 400, `got ${idor.status}`);

  // The same idempotency key twice must do the work once.
  const key = "check-" + Date.now();
  const one = await req("/api/town/act", {
    method: "POST",
    cookie,
    body: { intent: "collect_alley", key },
  });
  const two = await req("/api/town/act", {
    method: "POST",
    cookie,
    body: { intent: "collect_alley", key },
  });
  ok(
    "the same idempotency key does not pay twice",
    one.status === 200 && two.status === 200 && JSON.stringify(one.json?.result) === JSON.stringify(two.json?.result),
    `${JSON.stringify(one.json?.result)} vs ${JSON.stringify(two.json?.result)}`
  );

  // Reusing a key for a different intent is confusion, not a retry.
  const crossed = await req("/api/town/act", {
    method: "POST",
    cookie,
    body: { intent: "sync", key },
  });
  ok("a key reused for a different intent is a conflict", crossed.status === 409, `got ${crossed.status}`);

  // Spamming collect must not print money: the purse is computed from the
  // server's own clock, which was just reset.
  const before = (await req("/api/town", { cookie })).json?.state?.res?.coin ?? 0;
  for (let i = 0; i < 5; i++) {
    await req("/api/town/act", { method: "POST", cookie, body: { intent: "collect_alley" } });
  }
  const spammed = (await req("/api/town", { cookie })).json?.state?.res?.coin ?? 0;
  ok("spamming collect yields nothing", spammed - before < 10, `gained ${spammed - before}`);
}

// ---------------------------------------------------------------------------
//  3b. The gacha: the server rolls, the server counts, the server remembers
// ---------------------------------------------------------------------------
if (cookie) {
  console.log();
  console.log("  The wheel");

  // A result in the body must not become the result.
  const forged = await req("/api/town/act", {
    method: "POST",
    cookie,
    body: {
      intent: "spin",
      args: { wheel: "silver", how: "key", rarity: "mythic", hero: "carlos", shards: 9999 },
    },
  });
  ok(
    "a result posted in the body is ignored",
    forged.status !== 200 || forged.json?.result?.rarity !== "mythic" || forged.json?.result?.shards !== 9999,
    JSON.stringify(forged.json?.result || forged.json?.error)
  );

  // Spinning a wheel you have no keys for.
  const before = (await req("/api/town", { cookie })).json?.state || {};
  const goldKeys = before.keys?.gold ?? 0;
  const broke = await req("/api/town/act", {
    method: "POST",
    cookie,
    body: { intent: "spin", args: { wheel: "gold", how: "key" } },
  });
  ok(
    "spinning without a key is refused",
    goldKeys > 0 ? broke.status === 200 : broke.status === 400,
    `had ${goldKeys} gold keys, got ${broke.status}`
  );

  // A wheel that does not exist.
  const junkWheel = await req("/api/town/act", {
    method: "POST",
    cookie,
    body: { intent: "spin", args: { wheel: "diamond", how: "key" } },
  });
  ok("an invented wheel is refused", junkWheel.status === 400, `got ${junkWheel.status}`);

  // A key IS spent, and exactly one.
  const s0 = (await req("/api/town", { cookie })).json?.state || {};
  const silver0 = s0.keys?.silver ?? 0;
  if (silver0 > 0) {
    const spun = await req("/api/town/act", {
      method: "POST",
      cookie,
      body: { intent: "spin", args: { wheel: "silver", how: "key", clientSeed: "check" } },
    });
    const s1 = spun.json?.state || {};
    ok(
      "a spin costs exactly one key",
      spun.status === 200 && (s1.keys?.silver ?? 0) === silver0 - 1,
      `${silver0} -> ${s1.keys?.silver}`
    );
    ok("the spin came back with a rarity", !!spun.json?.result?.rarity, JSON.stringify(spun.json?.result));
    ok("the roll got a nonce", typeof spun.json?.roll?.nonce === "number", JSON.stringify(spun.json?.roll));
  } else {
    skipped.push("the silver spin — the account had no keys");
  }

  // The pity counter is the server's. Sending one must not move it.
  const withPity = await req("/api/town/act", {
    method: "POST",
    cookie,
    body: { intent: "spin", args: { wheel: "silver", how: "key", pity: 999, litter: { pity: { silver: 999 } } } },
  });
  const after = (await req("/api/town", { cookie })).json?.state || {};
  ok(
    "a pity counter in the body is ignored",
    (after.litter?.pity?.silver ?? 0) < 100,
    `pity is ${after.litter?.pity?.silver}`
  );

  // Adoption: paying with Treats you do not have.
  const poor = await req("/api/town/act", {
    method: "POST",
    cookie,
    body: { intent: "adopt", args: { count: 10 } },
  });
  ok(
    "adopting without Treats is refused",
    (after.res?.treats ?? 0) >= 4000 ? poor.status === 200 : poor.status === 400,
    `treats ${after.res?.treats}, got ${poor.status}`
  );

  // A negative count must be rejected, not multiplied.
  const negative = await req("/api/town/act", {
    method: "POST",
    cookie,
    body: { intent: "adopt", args: { count: -5 } },
  });
  ok("a negative count is refused", negative.status === 400, `got ${negative.status}`);

  // Idempotency covers the wheel too: the same key must not spin twice.
  const spinKey = "spin-" + Date.now();
  const t0 = (await req("/api/town", { cookie })).json?.state?.keys?.silver ?? 0;
  await req("/api/town/act", {
    method: "POST",
    cookie,
    body: { intent: "spin", args: { wheel: "silver", how: "key" }, key: spinKey },
  });
  await req("/api/town/act", {
    method: "POST",
    cookie,
    body: { intent: "spin", args: { wheel: "silver", how: "key" }, key: spinKey },
  });
  const t1 = (await req("/api/town", { cookie })).json?.state?.keys?.silver ?? 0;
  ok("the same key does not spin twice", t0 === 0 || t0 - t1 <= 1, `${t0} -> ${t1}`);
}

// ---------------------------------------------------------------------------
//  4. The headers the browser needs
// ---------------------------------------------------------------------------
console.log("\n  Response headers");
{
  const page = await req("/game");
  const h = page.headers;
  const csp = h.get("content-security-policy") || "";
  const scriptSrc = (csp.match(/script-src([^;]*)/) || [])[1] || "";

  ok("Content-Security-Policy is set", !!csp);

  // NOT "no unsafe-inline". That assertion was here, and it was asserting a
  // policy that took the live site down: a nonce plus 'strict-dynamic' blocked
  // every chunk, and the page still returned 200 with no scripts running. The
  // documented trade is in middleware.js — inline is allowed, foreign origins
  // are not — so the test checks the part that actually holds.
  ok(
    "scripts cannot come from another origin",
    /'self'/.test(scriptSrc) && !/https?:|\*/.test(scriptSrc),
    scriptSrc.trim()
  );
  ok("object-src is none", /object-src 'none'/.test(csp));
  ok("base-uri is locked", /base-uri 'self'/.test(csp));
  ok("form-action is locked", /form-action 'self'/.test(csp));
  ok("frame-ancestors is none", /frame-ancestors 'none'/.test(csp));
  ok("X-Content-Type-Options is nosniff", h.get("x-content-type-options") === "nosniff");
  ok("Referrer-Policy is set", !!h.get("referrer-policy"));
  ok("Permissions-Policy is set", !!h.get("permissions-policy"));
}

console.log();
for (const s of skipped) console.log(`  … skipped ${s}`);
console.log(`\n  ${pass} passed, ${fail} failed${skipped.length ? `, ${skipped.length} skipped` : ""}\n`);
if (fail > 0) process.exitCode = 1;
