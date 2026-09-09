// Security headers, and a Content-Security-Policy with a per-request nonce.
//
// WHY A NONCE AND NOT `unsafe-inline`. Next.js injects inline scripts to
// hydrate, so the lazy CSP is `script-src 'self' 'unsafe-inline'` — which
// permits every inline script, including the one an attacker manages to
// inject. That is a policy that looks like a policy and stops nothing.
//
// A nonce is generated fresh per request, Next stamps it onto its own inline
// scripts, and the browser refuses any script that does not carry it. An
// injected `<script>` cannot guess a value that did not exist when the payload
// was written.
//
// This matters here specifically because of what the threat model says the
// session will be: an httpOnly cookie. httpOnly stops XSS from READING the
// cookie, but not from using the logged-in browser to send requests. CSP is
// the layer that stops the injected script running in the first place.
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
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const dev = process.env.NODE_ENV !== "production";

  // `unsafe-eval` is a development-only concession: the Next dev overlay and
  // fast refresh need it, and shipping it would be handing an attacker eval().
  const scriptSrc = [
    "'self'",
    `'nonce-${nonce}'`,
    // Next's hydration scripts are nonce-stamped, but the framework also emits
    // a couple of inline handlers that a nonce cannot cover; strict-dynamic
    // lets a nonce'd loader pull in the chunks it needs and nothing else.
    "'strict-dynamic'",
    dev ? "'unsafe-eval'" : "",
  ]
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
    "object-src 'none'",
    "base-uri 'self'",
    // Where a <form> may post. Without this, an injected form can POST the
    // page's contents anywhere.
    "form-action 'self'",
    "frame-ancestors 'none'",
    "upgrade-insecure-requests",
  ].join("; ");

  const headers = new Headers(request.headers);
  // Next reads this to stamp its own inline scripts.
  headers.set("x-nonce", nonce);

  const response = NextResponse.next({ request: { headers } });
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
