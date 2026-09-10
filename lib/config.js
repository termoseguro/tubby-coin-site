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
  // Five buckets, all configured in pump.fun's fee sharing at launch, so the
  // split is a protocol setting rather than a promise. Every "X/Y" label on the
  // site reads from here — change a number and the whole site follows.
  //
  //   care   the Tubby Cares fund — goods for children's care homes in Rio.
  //          Funded ONLY from here. See docs/tubby-cares.md for why the amount
  //          must never depend on how much a player spends.
  //   ops    the team running the coin and the game. The profit.
  //   treats the game's reward pool (season board + prizes).
  //   bite   buyback & burn.
  //   art    the tubby cats brand. Cut from 30 to 10 when care was added —
  //          the donation came out of our slice, not out of anyone else's.
  feeSplit: { care: 20, ops: 30, treats: 25, bite: 15, art: 10 },

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
    burns: "#", // public bite/burn log (tx receipts)
    deliveryLog: "/cares", // the delivery log page — app/cares/page.jsx
    feeSchedule: "https://pump.fun/docs/fees", // pump.fun's own table — the source for /tokenomics
  },

  // ---- TOKENOMICS (/tokenomics page) -----------------------------------------
  tokenomics: {
    totalSupply: 1_000_000_000,
    // Manual milestone flags for the 9 Lives quest — flip to true when a life
    // is hit. Life 1 is always unlocked; Life 3 (graduation) unlocks by itself
    // when the coin leaves the bonding curve (detected on-chain).
    lives: { 2: false, 4: false, 5: false, 6: false, 7: false, 8: false, 9: false },
  },

  // ---- fee wallets (published on the receipts section) ----------------------
  wallets: {
    care: "{{WALLET_CARE}}", // fee wallet A — Tubby Cares (care-home supplies)
    ops: "{{WALLET_OPS}}", // fee wallet B — operations (Rafael)
    treats: "{{WALLET_TREATS}}", // fee wallet C — game reward pool
    bite: "{{WALLET_BITE}}", // fee wallet D — buyback & burn
    art: "{{WALLET_ART}}", // fee wallet E — tubby art fund (Palis)
  },

  // ---- LIVE DATA (Solana RPC, read straight from the browser) ---------------
  // No backend needed: Helius / QuickNode / Triton RPCs allow browser (CORS) reads.
  // 1) paste the Tubby Cares wallet address in `careWallet`
  // 2) paste your RPC url in `rpcUrl`  (e.g. https://mainnet.helius-rpc.com/?api-key=XXXX)
  // 3) set live:true above
  // Until then the site runs in DEMO mode using `demoFundedSol`.
  liveData: {
    rpcUrl: "", // e.g. "https://mainnet.helius-rpc.com/?api-key=YOUR_KEY"
    careWallet: "", // the Tubby Cares address — its BALANCE is the basket (see below)
    artWallet: "", // the art fund address — shown on /tokenomics only
    refreshMs: 30000, // how often to re-read the balance
    // ZERO, and it should stay zero until the wallet is real.
    //
    // It was 3.2 — a number nobody had donated, rendered under a heading about
    // donations. The PREVIEW badge beside it is honest and does not survive a
    // screenshot, and "3.2 SOL" cropped out of context is a claim we invented.
    // The same argument that keeps invented buyers out of the corner ticker
    // (LiveTicker.jsx) applies to an invented total, more so.
    //
    // At 0 the card reads "0.00 in the basket · 5.00 SOL to go until the first
    // run · no runs yet", which is true, and reads as anticipation rather than
    // as a dead counter.
    demoFundedSol: 0,
  },

  // ---- MILESTONES: the basket fills, then a run goes out --------------------
  // `sol` is what the Tubby Cares wallet has to hold before that run happens.
  // Deliberately small and frequent: a delivery that actually happens beats a
  // big one that is permanently "coming". The first one clears fast on purpose.
  //
  // ⚠ NEVER WRITE A QUANTITY HERE. Not "400 diapers", not "30 food baskets".
  // What a given amount of SOL actually buys depends on the SOL price that
  // day, on what the shops have in stock, and on what the institution says it
  // is short of that week — none of which is knowable in advance. A number
  // written here becomes a promise the second someone screenshots it, and the
  // first run that lands under it becomes the story instead of the delivery.
  //
  // So these say WHAT KIND of run it is. The categories are honest and stable;
  // the amounts are not ours to know yet. Exact counts get published AFTER the
  // fact in `care.deliveries`, where they are receipts rather than forecasts.
  milestones: [
    { sol: 5, emoji: "🍼", label: "the first run", items: "a supply run for one home — diapers, formula and hygiene" },
    { sol: 15, emoji: "🥫", label: "the pantry run", items: "food staples and cleaning supplies on top of the basics" },
    { sol: 40, emoji: "💊", label: "the pharmacy run", items: "medicine and first aid, alongside a full supply run" },
    { sol: 100, emoji: "🏠", label: "the big one", items: "several homes supplied in a single run" },
  ],

  // ---- TUBBY CARES (the charity fund) ---------------------------------------
  // The rule that protects the whole thing, written where nobody can miss it:
  //
  //   The AMOUNT donated depends only on creator fees. The game decides where a
  //   run goes and whose name is on it — NEVER how much. The moment playing or
  //   spending raises the donation, every sale becomes a charitable solicitation
  //   and every player who spends without seeing the number move accuses us of
  //   pocketing it. Full reasoning in docs/tubby-cares.md.
  care: {
    // ONE wording, used everywhere. "Care home" is true of an orphanage and of
    // an institution for children with disabilities; "orphanage" is not true of
    // the partner we name, and we link to them ourselves.
    cause: "children's care homes in Rio de Janeiro",
    city: "Rio de Janeiro, Brazil",
    // Load-bearing. Goods are photographable, auditable, and impossible to
    // launder back to us — which is exactly why we never send cash.
    kind: "goods, never cash",
    // What the fund buys, headline item first.
    basket: [
      { emoji: "🍼", name: "Diapers & formula" },
      { emoji: "💊", name: "Medicine & first aid" },
      { emoji: "🥫", name: "Food staples" },
      { emoji: "🧼", name: "Hygiene & cleaning" },
      { emoji: "🧸", name: "Plush cats & toys" },
    ],
    // Every completed run, newest first. THIS is the "delivered so far" number —
    // the wallet balance is only what is queued for the NEXT run, because the
    // balance drops to zero the moment we go shopping.
    //
    // Each entry needs, without exception: the signed termo de doação, the
    // institution's CNPJ, the funding tx, and photos OF THE GOODS. Never the
    // children's faces — ECA arts. 17, 18 and 143 protect kids in institutional
    // care harder than anything else in Brazilian law, and it is also the better
    // shot. Shape:
    //   { date: "2026-10-04", org: "Abrigo X", cnpj: "00.000.000/0001-00",
    //     sol: 5.2, items: "400 diapers + 80 tins of formula",
    //     tx: "<signature>", photos: ["/cares/2026-10-04-1.webp"] }
    deliveries: [],

    // ---- PAST DRIVES: the portfolio ---------------------------------------
    // What already happened, with our own money, before the coin existed. This
    // is the strongest asset on the whole site — it turns "we will donate" into
    // "we have been donating", which is a completely different claim.
    drives: [
      {
        title: "The plushie drive",
        when: "before the coin",
        org: "Lar Maria de Lourdes",
        orgWhat: "a residential care institution for people with disabilities, in Rio de Janeiro",
        orgUrl: "https://www.larmariadelourdes.org.br",
        items: "60+ plush cats, plus diapers and hygiene supplies",
        note:
          "Bought at the supermarket, wheeled up to the door by hand, handed over the same " +
          "afternoon. It is also the drive that exposed the gap: toys are the donation everybody " +
          "makes, and the shelves were still short of the boring things. That is the part the coin " +
          "pays for now.",
        // No people in frame. These are the strongest evidence anyway — the
        // first one puts the institution's own sign in the shot, and the others
        // are close enough to read the packaging and count the packs.
        photos: [
          "/cares/drive-01-door.webp",
          "/cares/drive-01-supplies.webp",
          "/cares/drive-01-supplies-2.webp",
        ],
        // Cleared for publication by the institution's own legal department,
        // which supplied these files with the children's faces already redacted.
        // That written grant is what makes publishing them lawful — the
        // redaction is what keeps it decent. Keep the signed copy off-repo.
        authorisation:
          "Image rights granted in writing by Lar Maria de Lourdes' legal department; " +
          "faces redacted at source.",
        clips: [
          { src: "/cares/drive-01-clip-1.mp4", poster: "/cares/drive-01-clip-1.webp" },
          { src: "/cares/drive-01-clip-2.mp4", poster: "/cares/drive-01-clip-2.webp" },
        ],
        // Stills from the same drive, covered by the same written grant.
        people: [
          "/cares/drive-01-kid-1.webp",
          "/cares/drive-01-kid-2.webp",
          "/cares/drive-01-kid-3.webp",
          "/cares/drive-01-kid-4.webp",
        ],
      },
    ],

    // Whether `drives[].people` photos are published on the site.
    //
    // TRUE because Lar Maria de Lourdes' legal department granted image rights
    // in writing and supplied the files already redacted — see
    // `drives[].authorisation`. It is a switch rather than a constant because
    // a grant can be withdrawn, and because the next institution will not
    // necessarily give one.
    //
    // Turning it off hides the photos from the page but does NOT unpublish
    // them: files under /public are served whether or not anything links to
    // them. Withdrawing consent means deleting the files and rewriting the
    // reference, not flipping this.
    publishPeoplePhotos: true,
  },

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

  // ---- COMMUNITY ART (Onchain Positivity section) ---------------------------
  // Hand-picked pieces pulled from the official X (@tubbycatsnft) — only ones
  // that are pure tubby-cat art, no collab/third-party IP mixed in.
  communityArt: [
    "/art/x/tubby-valentines.webp",
    "/art/x/tubby-pfp-king.webp",
    "/art/x/tubby-pfp-grey.webp",
    "/art/x/tubby-gm.webp",
    "/art/x/tubby-npc-meme.webp",
  ],

  // ---- MERCH (gallery — hidden until you add images) ------------------------
  // Drop merch photos in /public/merch and list them here, e.g. "/merch/tee.png".
  // The section auto-appears once this has at least one item.
  merch: [
    "/merch-1.png",
    "/merch-2.png",
    "/merch-3.png",
    "/merch-4.png"
  ],
};

// ---- derived helpers (don't edit) -----------------------------------------

/** SOL actually spent on goods and delivered, summed from the delivery log. */
export function deliveredSol() {
  return (config.care.deliveries || []).reduce((t, d) => t + (d.sol || 0), 0);
}
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
