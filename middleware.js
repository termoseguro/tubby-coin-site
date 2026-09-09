// Security headers and the Content-Security-Policy.
//
// THIS FILE TOOK THE PRODUCTION SITE DOWN ONCE. Read before changing it.
//
// The first version issued a per-request nonce and used 'strict-dynamic'. Two
// things were wrong, and together they blocked every script on the live site —
// the HTML still rendered, so it looked fine to anything that only checks for a
// 200, while every visitor got an unhydrated page:
//
//   1. It passed the nonce to the app as `x-nonce`. Next does not read that.
//      Next takes the nonce out of the `Content-Security-Policy` header on the
//      REQUEST, parses `nonce-...` from script-src, and stamps that onto its
//      own tags. Ours never reached it, so Next emitted un-nonced scripts.
//   2. 'strict-dynamic' DISABLES 'self'. With no nonce on the tags and host
//      allowlisting switched off, nothing was left that could load a chunk.
//
// And a per-request nonce cannot work here anyway: these pages are statically
// prerendered, so their HTML is written once at build time while the nonce
// changes every request. Nonces force dynamic rendering — which is a real cost
// for a marketing site that is otherwise served straight from the edge.
//
// So: 'self' plus 'unsafe-inline' for scripts. That is weaker, and the weakness
// is specific and bounded — an attacker who can already inject markup can run
// it. What still holds: no script from any other origin, object-src none,
// base-uri locked, form-action locked, frame-ancestors none.
//
// WHEN TO GO BACK TO A NONCE: the moment the game renders anything a player
// typed — a name, a town label, a chat line. That is when injected markup stops
// being hypothetical, and dynamic rendering becomes worth paying for. Do it by
// setting the CSP on the REQUEST headers (see point 1) and verify by loading a
// production build and confirming the chunks execute — not by reading the
// header, which looked correct the whole time it was broken.
//
// See docs/security.md §4 "Ownership and identity".

import { NextResponse } from "next/server";

/** Headers that never vary. Kept beside the CSP so the whole posture is in one
 *  file rather than split between here and next.config. */
const STATIC_HEADERS = {
  // A year, and eligible for preload. Only ever served over HTTPS in prod.
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
  // Stop the browser second-guessing a Content-Type. Sniffing turns an
  // uploaded "image" into an executed script.
  "X-Content-Type-Options": "nosniff",
  // Clickjacking: nobody frames the game. `frame-ancestors` in the CSP is the
  // modern form; this is the one older browsers understand.
  "X-Frame-Options": "DENY",
  // Do not leak the full URL — which can carry ids — to third parties.
  "Referrer-Policy": "strict-origin-when-cross-origin",
  // Nothing here needs a camera, a microphone or a location, so nothing gets
  // to ask. Payment is explicitly denied: wallets talk over their own channel.
  "Permissions-Policy":
    "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()",
  // Isolate the browsing context so a malicious opener cannot reach back in.
  "Cross-Origin-Opener-Policy": "same-origin",
  "X-DNS-Prefetch-Control": "off",
};

export function middleware(request) {
  const dev = process.env.NODE_ENV !== "production";

  // `unsafe-eval` is a development-only concession: the Next dev overlay and
  // fast refresh need it, and shipping it would be handing an attacker eval().
  // No 'strict-dynamic' here — it turns OFF 'self', and without a nonce on the
  // tags that leaves nothing able to load a chunk. See the note at the top.
  const scriptSrc = ["'self'", "'unsafe-inline'", dev ? "'unsafe-eval'" : ""]
    .filter(Boolean)
    .join(" ");

  const csp = [
    "default-src 'self'",
    `script-src ${scriptSrc}`,
    // Styles: Next inlines critical CSS, and there is no style-src nonce path
    // that works with the app router today. Inline STYLE cannot execute code —
    // the worst it buys an attacker is defacement — so this is the one place
    // 'unsafe-inline' is an acceptable trade.
    "style-src 'self' 'unsafe-inline'",
    // The collection art is local; the remote patterns in next.config are for
    // the hotlinked fallback. data: covers the inline SVG icons.
    "img-src 'self' data: blob: https://*.seadn.io https://ipfs.io https://*.ipfs.nftstorage.link",
    "font-src 'self' data:",
    // Supabase for the game state, and the Solana RPC for reading balances and
    // verifying payments. Anything else is a data-exfiltration channel.
    `connect-src 'self' ${process.env.NEXT_PUBLIC_SUPABASE_URL || ""} https://*.supabase.co wss://*.supabase.co ${process.env.NEXT_PUBLIC_SOLANA_RPC || "https://api.mainnet-beta.solana.com"}`,
    // WORKER-SRC, EXPLICITLY. PixiJS builds a worker from a blob: URL, and
    // worker-src falls back to SCRIPT-SRC when it is not set — which does not
    // allow blob:. The console said so and the town simply never loaded: the
    // canvas sat on "Building the town…" forever with no error the game could
    // catch. A blob worker is same-origin code the page itself created, so
    // this is not a hole; leaving it unset was the hole.
    "worker-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
    // Where a <form> may post. Without this, an injected form can POST the
    // page's contents anywhere.
    "form-action 'self'",
    "frame-ancestors 'none'",
    "upgrade-insecure-requests",
  ].join("; ");

  const response = NextResponse.next();
  response.headers.set("Content-Security-Policy", csp);
  for (const [k, v] of Object.entries(STATIC_HEADERS)) response.headers.set(k, v);
  return response;
}

export const config = {
  // Everything except Next's own static output and the favicon — those are
  // served straight from disk and re-running this on each one is waste.
  matcher: [
    {
      source: "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:webp|png|jpg|jpeg|svg|avif|ico)$).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
