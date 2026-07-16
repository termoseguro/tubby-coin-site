// ============================================================================
//  $TUBBY — SINGLE SOURCE OF TRUTH
//  Edit ONLY this file to launch. Everything on the site reads from here.
// ============================================================================

export const config = {
  // ---- launch toggles -------------------------------------------------------
  // Flip to true at the launch minute. Controls buy buttons, CA copy, live data.
  live: false,

  // ---- token identity -------------------------------------------------------
  token: {
    ticker: "$TUBBY",
    name: "Tubby Cats Coin",
    // Keep "TBA" until the launch minute. Paste the mint address here.
    contractAddress: "TBA",
  },

  // ---- creator-fee split (must add up to 100) -------------------------------
  // `art` = % routed to the project fund (reinvested into the project)
  // `ops` = % routed to coin operations (the team). Change these two numbers
  // and every "X/Y" label on the site updates automatically.
  feeSplit: { art: 30, ops: 70 },

  // ---- brand / hero -----------------------------------------------------------
  brand: {
    taglinePrimary: "TUBBY CATS COIN", // big repeated hero band
    taglineSecondary: "the ticker is $tubby", // second repeated band
    mediaKit: "#", // link to logo files / brand assets (media pack)
  },

  // ---- where to find / trade $TUBBY (grid on the "Find $TUBBY" section) -------
  // pump.fun opens the buy modal; the rest are ecosystem tools/venues.
  venues: [
    { name: "pump.fun", icon: "🚀", buy: true },
    { name: "Jupiter", icon: "🪐", url: "https://jup.ag" },
    { name: "Raydium", icon: "⚡", url: "https://raydium.io" },
    { name: "DexScreener", icon: "📊", url: "https://dexscreener.com/solana" },
    { name: "Birdeye", icon: "🐦", url: "https://birdeye.so" },
    { name: "Solscan", icon: "🔎", url: "https://solscan.io" },
    { name: "Phantom", icon: "👻", url: "https://phantom.app" },
    { name: "Photon", icon: "🔦", url: "https://photon-sol.tinyastro.io" },
  ],

  // ---- social / official links (hero row + footer) ---------------------------
  socials: [
    { name: "𝕏 coin", key: "coinX" },
    { name: "𝕏 tubby cats", key: "brandX" },
    { name: "OpenSea", key: "opensea" },
    { name: "Telegram", key: "telegram" },
  ],

  // ---- links ----------------------------------------------------------------
  links: {
    pump: "https://pump.fun", // becomes https://pump.fun/coin/<CA> automatically when CA is set
    jupiter: "https://jup.ag/swap/SOL-", // + CA appended when live
    coinX: "https://x.com/", // X profile of the coin account
    brandX: "https://x.com/tubbycatsnft",
    endorsementPost: "#", // link to the brand's public endorsement post
    signedMsg: "#", // signed wallet-message proof
    feeConfig: "#", // link showing the 50/50 creator-fee split on pump.fun
    reports: "#", // monthly art-fund reports
    telegram: "", // leave "" to hide the chip
    opensea: "https://opensea.io/collection/tubby-cats",
    shop: "https://tubbycatsshop.myshopify.com/", // official merch store
  },

  // ---- fee wallets (published on the receipts section) ----------------------
  wallets: {
    art: "{{WALLET_ART}}", // fee wallet A — tubby art fund (Palis)
    ops: "{{WALLET_OPS}}", // fee wallet B — operations (Rafael)
  },

  // ---- LIVE DATA (Solana RPC, read straight from the browser) ---------------
  // No backend needed: Helius / QuickNode / Triton RPCs allow browser (CORS) reads.
  // 1) paste the art wallet address in `artWallet`
  // 2) paste your RPC url in `rpcUrl`  (e.g. https://mainnet.helius-rpc.com/?api-key=XXXX)
  // 3) set live:true above
  // Until then the site runs in DEMO mode using `demoFundedSol`.
  liveData: {
    rpcUrl: "", // e.g. "https://mainnet.helius-rpc.com/?api-key=YOUR_KEY"
    artWallet: "", // the Solana address whose SOL balance = art fund total
    refreshMs: 30000, // how often to re-read the balance
    demoFundedSol: 12.4, // shown while live:false or rpcUrl empty — animates for the "wow"
  },

  // ---- GAMIFICATION: milestones (the progress bar fills as the fund grows) ---
  // `sol` is the cumulative target. The bar shows progress to the NEXT unmet one.
  // Kept generic on purpose — these are project-funding checkpoints, NOT promises
  // of specific drops, airdrops or launches.
  milestones: [
    { sol: 25, label: "25 SOL back into the project", emoji: "🚀" },
    { sol: 50, label: "50 SOL back into the project", emoji: "🔥" },
    { sol: 100, label: "100 SOL back into the project", emoji: "💎" },
    { sol: 250, label: "250 SOL back into the project", emoji: "👑" },
  ],

  // ---- TUBBY ART (side marquee + faint background pattern) -------------------
  // CC0 art from the tubby cats collection: https://opensea.io/collection/tubby-cats
  // Drop image files into /public/art and list them here (e.g. "/art/0001.png"),
  // OR paste OpenSea/IPFS image URLs. Empty array = drawn placeholder tiles.
  art: [
    "/art/0a127e0d7a332e80e0e0e5de4b5f9389.avif",
    "/art/21aaf443ed1f478567b85d23088654c0.avif",
    "/art/22d427585bbe48b31ffb115cf68f64e0.avif",
    "/art/2b28f1446a7aa6c912577f4601f545d7.avif",
    "/art/2bf6eb136f3fce508a08f46c381ad1a3.avif",
    "/art/324b25707fab33efd5590a4bca9f02fb.avif",
    "/art/3f4ce21a957babb616a8588ca10a0f29.avif",
    "/art/4c32670630e973929e22175e531b8513.avif",
    "/art/5ca6900125bec5ba0ca273106a92afdf.avif",
    "/art/5e5631b10703594563f81c1ffcc51469.avif",
    "/art/656750b637d45df65b78fb6641d81758.avif",
    "/art/66be0ea1f79b916a54001699b5572d1e.avif",
    "/art/66e3fecf4f5fbb611e46056c7ef1e54e.avif",
    "/art/7991688efc562b04fffb3db44b200228.avif",
    "/art/80bf90e96313eb59cdbf9e4108c5c705.avif",
    "/art/88c59d46ad7c0636d1c4e792b4d5f1a1.avif",
    "/art/9e98fcd61f2780d1c8f470f278073b5a.avif",
    "/art/abc6d71fff17d2c1cbbe19c948ea84ff.avif",
    "/art/b777f257bbf00ee61294c410843c5e04.avif",
    "/art/c7d3362eea4213a4eca8becfc1a824ef.avif",
    "/art/c80ea1ba18d9f8a9162108e2e596dd8e.avif",
    "/art/e0948d1731e97af9bacfcac19a4408c0.avif",
    "/art/e2b2e1804d7c6378e49f91f7a2a74121.avif",
    "/art/ef89089aaaf9abdac6a414deb88025bd.avif",
    "/art/f214950d642026b3eb60a5f9531deea4.avif",
  ],

  // ---- MERCH (gallery — hidden until you add images) ------------------------
  // Drop merch photos in /public/merch and list them here, e.g. "/merch/tee.png".
  // The section auto-appears once this has at least one item.
  merch: [
    "/merch-1.jpg",
    "/merch-2.jpg",
    "/merch-3.jpg",
    "/merch-4.jpg"
  ],
};

// ---- derived helpers (don't edit) -----------------------------------------
export function pumpUrl() {
  const ca = config.token.contractAddress;
  return config.live && ca && ca !== "TBA"
    ? `https://pump.fun/coin/${ca}`
    : config.links.pump;
}

export function jupiterUrl() {
  const ca = config.token.contractAddress;
  return config.live && ca && ca !== "TBA" ? `${config.links.jupiter}${ca}` : null;
}

export function isLive() {
  return config.live && config.token.contractAddress !== "TBA";
}
