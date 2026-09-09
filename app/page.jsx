import { config } from "../lib/config";
import { CATS, ART, COMMUNITY, pick } from "../lib/siteArt";
import { FundProvider } from "./components/FundContext";
import { BuyProvider, BuyButton } from "./components/BuyModal";
import CareFund from "./components/CareFund";
import CatStrip from "./components/CatStrip";
import LiveTicker from "./components/LiveTicker";
import ScrollFX from "./components/ScrollFX";
import CopyCA from "./components/CopyCA";
import HeroMascot from "./components/HeroMascot";
import NavBar from "./components/NavBar";
import Band from "./components/Band";
import Footer from "./components/Footer";

// a link only renders when it's real — no "#" placeholders shown to visitors
const isReal = (u) => Boolean(u) && u !== "#" && u !== "https://x.com/";
const isRealWallet = (w) => Boolean(w) && !w.startsWith("{{");

function TileGrid({ images, limit }) {
  const list = (images || []).slice(0, limit || images.length);
  return (
    <div className="tile-grid">
      {list.map((src, i) => (
        <div className="tile reveal" data-i={i % 6} key={i}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src} alt="Tubby cat" loading="lazy" decoding="async" />
        </div>
      ))}
    </div>
  );
}

// The five buckets, in the order they matter to a reader. Colours match the
// donut on /tokenomics so the two pages never disagree.
const BUCKETS = [
  {
    k: "care",
    ic: "🧡",
    name: "Tubby Cares",
    color: "#e0459a",
    what: "Buys supplies for children's shelters in Rio de Janeiro. Goods, never cash — every run is published with the institution, the item list, the transaction and photos of the supplies.",
  },
  {
    k: "ops",
    ic: "⚙️",
    name: "Operations",
    color: "#6E4326",
    what: "Runs the coin and builds the game — servers, development, and the people doing the work day to day.",
  },
  {
    k: "treats",
    ic: "🎁",
    name: "Treats",
    color: "#FF7CB9",
    what: "The game's prize pool. Seasons, the leaderboard and player rewards are paid from this and never from anywhere else.",
  },
  {
    k: "bite",
    ic: "🔥",
    name: "The Bite",
    color: "#4a1230",
    what: "Buys $TUBBY on the open market and burns it. Supply can only ever go down, and every burn is posted with its transaction.",
  },
  {
    k: "art",
    ic: "🎨",
    name: "Art Fund",
    color: "#FFD700",
    what: "Goes to the tubby cats brand — new art, products and merch for the universe the coin comes from. CC0 forever.",
  },
];

export default function Page() {
  const { links, wallets, token, feeSplit, care, merch, communityArt, brand, venues, socials } =
    config;
  const social = socials
    .map((s) => ({ name: s.name, url: links[s.key] }))
    .filter((s) => isReal(s.url));

  // deterministic picks — same on server and client, so no hydration mismatch
  const wall = pick(CATS, 24, 5);
  const gameShots = pick(CATS, 9, 41);
  const community = COMMUNITY.length ? COMMUNITY : ART;

  return (
    <FundProvider>
      <BuyProvider>
        <ScrollFX />
        <NavBar ticker={token.ticker} />

        <main id="top">
          {/* ============ HERO ============ */}
          <section className="hero">
            <div className="wrap">
              <HeroMascot />
              <h1>
                A memecoin that <em>buys diapers</em>
              </h1>
              <p className="lead">
                {token.ticker} is the community coin of the tubby cats universe on Solana — 20,000
                hand-drawn cats, public domain since 2022. <b>{feeSplit.care}% of every creator fee</b>{" "}
                buys food, medicine and supplies for children&apos;s shelters in Rio de Janeiro.
              </p>
              <div className="hero-cta">
                <BuyButton className="btn">Buy {token.ticker}</BuyButton>
                <a className="btn ghost" href="#cares">
                  See where it goes
                </a>
              </div>
              <CopyCA />
              {social.length > 0 && (
                <div className="social-row">
                  {social.map((s) => (
                    <a className="chip" key={s.name} href={s.url} target="_blank" rel="noopener">
                      {s.name}
                    </a>
                  ))}
                </div>
              )}

              <div className="trust-strip">
                <div className="trust-cell reveal" data-i="0">
                  <div className="n">{feeSplit.care}%</div>
                  <div className="l">to shelters</div>
                </div>
                <div className="trust-cell reveal" data-i="1">
                  <div className="n">0%</div>
                  <div className="l">presale &amp; team</div>
                </div>
                <div className="trust-cell reveal" data-i="2">
                  <div className="n">20K</div>
                  <div className="l">cats, CC0</div>
                </div>
                <div className="trust-cell reveal" data-i="3">
                  <div className="n">2022</div>
                  <div className="l">collection minted</div>
                </div>
              </div>
            </div>
          </section>

          {/* the collection, as texture rather than a thumbnail grid */}
          <CatStrip count={26} seed={0} />

          <Band text={brand.taglinePrimary} cls="band-a" />

          {/* ============ TUBBY CARES ============ */}
          <section id="cares" className="sec brand">
            <div className="wrap">
              <div className="care-hero">
                <div className="reveal">
                  <span className="super">🧡 the point of the whole thing</span>
                  <h2 style={{ fontSize: "clamp(2.4rem,5.6vw,3.9rem)" }}>Tubby Cares</h2>
                  <p style={{ fontSize: "1.06rem", marginTop: 18, opacity: 0.94 }}>
                    Every trade pays the coin&apos;s creator a protocol fee. One fifth of that fee
                    never reaches us — it is routed straight to a public wallet that buys what
                    children&apos;s shelters in {care.city.split(",")[0]} actually run out of.
                  </p>
                  <p style={{ fontSize: "1.06rem", marginTop: 14, opacity: 0.94 }}>
                    We have run drives like this before and gave plush toys. Toys are the easy
                    donation, and they are the one thing shelters already have.{" "}
                    <b>This buys the boring things instead.</b>
                  </p>
                  <div className="basket" style={{ marginTop: 26 }}>
                    {care.basket.map((b) => (
                      <span className="basket-item" key={b.name}>
                        <span className="b-ic">{b.emoji}</span>
                        {b.name}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="reveal" data-i="1">
                  <CareFund />
                </div>
              </div>

              <div className="care-rules">
                <div className="card reveal" data-i="0">
                  <div className="ic">📦</div>
                  <h3>Goods, never cash</h3>
                  <p>
                    Nothing is wired to anyone. The fund buys physical supplies and hands them over in
                    person. A pallet of diapers can be counted, photographed and signed for — a
                    transfer can only be believed.
                  </p>
                </div>
                <div className="card reveal" data-i="1">
                  <div className="ic">🧾</div>
                  <h3>Every run has receipts</h3>
                  <p>
                    Date, institution, its CNPJ, the full item list, the transaction that paid for it,
                    and photos of the supplies. Published together, or it did not happen.
                  </p>
                </div>
                <div className="card reveal" data-i="2">
                  <div className="ic">⛓️</div>
                  <h3>The wallet is public</h3>
                  <p>
                    The donation slice is a setting inside the coin itself, so the money arrives there
                    without passing through us. You can watch it fill up and empty out, from any block
                    explorer, forever.
                  </p>
                </div>
              </div>

              <p className="care-note">
                We photograph the supplies, the delivery and the staff — never the children&apos;s
                faces. Kids in institutional care are the most protected people in Brazilian law, and
                that is exactly as it should be.
              </p>
            </div>
          </section>

          {/* ============ TOKENOMICS ============ */}
          <section id="tokenomics" className="sec light">
            <div className="wrap">
              <div className="sec-head">
                <span className="super">where every cent goes</span>
                <h2>The whole economy, on one screen</h2>
                <p>
                  There is no tax on your tokens and no team bag to dump. pump.fun pays the creator of
                  a coin a fee on every trade — <b>that fee is the entire economy</b>, and it is split
                  by the protocol into five public wallets before anyone can touch it.
                </p>
              </div>

              <div className="flow">
                <div className="flow-source reveal">
                  <div className="flow-coin">
                    <b>100%</b>
                    <span>of the creator fee</span>
                  </div>
                  <p className="flow-note">
                    Paid by the protocol on every trade. Never deducted from what you hold — your
                    balance is never touched by anything on this page.
                  </p>
                </div>

                <div className="flow-bars reveal" data-i="1">
                  {BUCKETS.map((b) => (
                    <div className="fbar" key={b.k}>
                      <i className="fill" style={{ background: b.color, "--w": `${feeSplit[b.k]}%` }} />
                      <div className="row">
                        <span className="sw" style={{ background: b.color }} />
                        <h4>
                          {b.ic} {b.name}
                        </h4>
                        <span className="pct">{feeSplit[b.k]}%</span>
                      </div>
                      <p>{b.what}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="steps" style={{ marginTop: 58 }}>
                <div className="card step-card reveal" data-i="0">
                  <h3>Fair launch, no exceptions</h3>
                  <p>
                    100% of the supply entered the market on a public bonding curve, at the same price
                    for everyone, on day one. No presale, no team allocation, no VC.
                  </p>
                </div>
                <div className="card step-card reveal" data-i="1">
                  <h3>Zero transfer tax</h3>
                  <p>
                    What you trade is what you get. The fee that funds all of this is paid by the
                    protocol to the creator — it is not skimmed off your swap.
                  </p>
                </div>
                <div className="card step-card reveal" data-i="2">
                  <h3>Supply only shrinks</h3>
                  <p>
                    New tokens can never be minted — that is protocol law, not our promise. The Bite
                    buys and burns, and every burn is posted with its transaction.
                  </p>
                </div>
                <div className="card step-card reveal" data-i="3">
                  <h3>Nothing changes quietly</h3>
                  <p>
                    The split lives in the coin&apos;s own fee configuration. Anyone can inspect it,
                    and a change would be visible on-chain the moment it happened.
                  </p>
                </div>
              </div>

              <div style={{ textAlign: "center", marginTop: 40 }}>
                <a className="btn" href="/tokenomics">
                  Full tokenomics, live from the chain
                </a>
              </div>
            </div>
          </section>

          <Band text={brand.taglineSecondary} cls="band-b" />

          {/* ============ THE GAME ============ */}
          <section id="game" className="sec plum">
            <div className="wrap">
              <div className="game-panel">
                <div className="game-shot reveal">
                  <div className="game-grid">
                    {gameShots.map((src, i) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={src} alt="" key={i} loading="lazy" decoding="async" />
                    ))}
                  </div>
                </div>

                <div className="reveal" data-i="1">
                  <span className="super">🏘️ tubby town</span>
                  <h2 style={{ fontSize: "clamp(2.2rem,5vw,3.4rem)", marginTop: 6 }}>
                    A town to build, not a farm to drain
                  </h2>
                  <p style={{ marginTop: 16, opacity: 0.9 }}>
                    Tubby Town is a city builder where the cats from the collection are the villagers.
                    It exists to give people a reason to stay close to the project — and the project
                    is the donations.
                  </p>

                  <div className="game-points">
                    <div className="game-point">
                      <span className="tick">✓</span>
                      <div>
                        <b>Not play-to-earn</b>
                        <span>
                          There is no emission, no staking yield and no APR. Prizes come out of a
                          fixed slice of trading fees and can never exceed it.
                        </span>
                      </div>
                    </div>
                    <div className="game-point">
                      <span className="tick">✓</span>
                      <div>
                        <b>Nothing is transferable</b>
                        <span>
                          No trading between accounts, no gifting, no market. There is nothing here to
                          extract and sell, which is the whole reason farms leave.
                        </span>
                      </div>
                    </div>
                    <div className="game-point">
                      <span className="tick">✓</span>
                      <div>
                        <b>Published odds, always</b>
                        <span>
                          Every drop rate is written in the game and never changed quietly. Paying
                          buys pace, never position on the board.
                        </span>
                      </div>
                    </div>
                    <div className="game-point">
                      <span className="tick">✓</span>
                      <div>
                        <b>The Care House</b>
                        <span>
                          One building in your town cannot be bought or rushed. It grows only when a
                          real delivery goes out.
                        </span>
                      </div>
                    </div>
                  </div>

                  <div style={{ marginTop: 30, display: "flex", gap: 14, flexWrap: "wrap" }}>
                    <a className="btn" href="/game">
                      Play the prototype
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <CatStrip count={22} seed={7} reverse />

          {/* ============ COLLECTION ============ */}
          <section id="collection" className="sec cream">
            <div className="wrap">
              <div className="sec-head">
                <span className="super">20,000 cats · minted 2022 · CC0</span>
                <h2>The collection</h2>
                <p>
                  Every cat is hand-drawn and released fully into the public domain — remix them,
                  print them, meme them, sell them, all encouraged. {token.ticker} is the coin of that
                  universe, not a licence to it.
                </p>
                <a className="btn" href={links.opensea} target="_blank" rel="noopener">
                  Explore on OpenSea
                </a>
              </div>

              <TileGrid images={wall} limit={24} />

              {community.length > 0 && (
                <>
                  <div className="sec-head" style={{ marginTop: 74 }}>
                    <span className="super">we love the memes</span>
                    <h2 style={{ fontSize: "clamp(1.9rem,4.2vw,2.8rem)" }}>Onchain positivity</h2>
                    <p>
                      Fan art, PFPs and community love straight from{" "}
                      <a href={links.brandX} target="_blank" rel="noopener">
                        @tubbycatsnft
                      </a>
                      .
                    </p>
                  </div>
                  <TileGrid images={community} limit={12} />
                </>
              )}

              {merch && merch.length > 0 && (
                <>
                  <div className="sec-head" style={{ marginTop: 74 }}>
                    <span className="super">tubby swag</span>
                    <h2 style={{ fontSize: "clamp(1.9rem,4.2vw,2.8rem)" }}>Official merch</h2>
                    <p>Dressed in hand-crafted tubby art, funded by the art fund.</p>
                    <a className="btn" href={links.shop} target="_blank" rel="noopener">
                      Go to the shop
                    </a>
                  </div>
                  <div className="merch-row">
                    {merch.map((src, i) => (
                      <div className="reveal" data-i={i} key={i}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={src} alt="Tubby merch" loading="lazy" decoding="async" />
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </section>

          {/* ============ RECEIPTS ============ */}
          <section id="receipts" className="sec brand">
            <div className="wrap">
              <div className="sec-head">
                <span className="super">trust, but verify</span>
                <h2>The receipts 🧾</h2>
                <p>
                  Every cat coin says &ldquo;trust me.&rdquo; This one says &ldquo;check.&rdquo; Each
                  claim on this page has a proof you can open before spending a single lamport.
                </p>
              </div>

              <div className="receipt-grid">
                <div className="card receipt reveal" data-i="0">
                  <span className="stamp">verify it</span>
                  <h3>Endorsed by the brand, on the record</h3>
                  <p>
                    The tubby cats brand publicly backs this coin: a post from the official account
                    and a signed message from a project-linked wallet. The NFT channels stay dedicated
                    to art; this account and site run the coin.
                  </p>
                  <div className="links">
                    {isReal(links.endorsementPost) && (
                      <a className="chip" href={links.endorsementPost} target="_blank" rel="noopener">
                        Endorsement post
                      </a>
                    )}
                    {isReal(links.signedMsg) && (
                      <a className="chip" href={links.signedMsg} target="_blank" rel="noopener">
                        Signed wallet proof
                      </a>
                    )}
                  </div>
                </div>

                <div className="card receipt reveal" data-i="1">
                  <span className="stamp">verify it</span>
                  <h3>Five wallets, one protocol setting</h3>
                  <p>
                    The split is configured in pump.fun&apos;s fee sharing — a setting anyone can
                    inspect, not a sentence on a website. The donation slice is routed there before we
                    ever hold it.
                  </p>
                  {isRealWallet(wallets.care) && (
                    <div className="wallet">
                      <b>🧡 Tubby Cares ({feeSplit.care}%):</b> {wallets.care}
                    </div>
                  )}
                  {isRealWallet(wallets.ops) && (
                    <div className="wallet">
                      <b>⚙️ Operations ({feeSplit.ops}%):</b> {wallets.ops}
                    </div>
                  )}
                  {isRealWallet(wallets.treats) && (
                    <div className="wallet">
                      <b>🎁 Treats ({feeSplit.treats}%):</b> {wallets.treats}
                    </div>
                  )}
                  {isRealWallet(wallets.bite) && (
                    <div className="wallet">
                      <b>🔥 The Bite ({feeSplit.bite}%):</b> {wallets.bite}
                    </div>
                  )}
                  {isRealWallet(wallets.art) && (
                    <div className="wallet">
                      <b>🎨 Art fund ({feeSplit.art}%):</b> {wallets.art}
                    </div>
                  )}
                  <div className="links">
                    {isReal(links.feeConfig) && (
                      <a className="chip" href={links.feeConfig} target="_blank" rel="noopener">
                        View fee config
                      </a>
                    )}
                  </div>
                </div>

                <div className="card receipt reveal" data-i="2">
                  <span className="stamp">by design</span>
                  <h3>No presale. No team allocation. Zero snipe.</h3>
                  <p>
                    A standard pump.fun launch: the token starts on a transparent bonding curve with
                    zero insider supply and no bundled launch wallets. If the team wants tokens, we
                    buy on the curve like everyone else — declared publicly first.
                  </p>
                  <div className="links">
                    <BuyButton className="chip">Token on pump.fun</BuyButton>
                  </div>
                </div>

                <div className="card receipt reveal" data-i="3">
                  <span className="stamp">recurring</span>
                  <h3>Every delivery, logged</h3>
                  <p>
                    Each Tubby Cares run is published with the institution and its CNPJ, the full item
                    list, the transaction that funded it, and photos of the supplies. No fixed amount
                    is ever promised — the fees decide, and the fees are on-chain.
                  </p>
                  <div className="links">
                    {isReal(links.deliveryLog) && (
                      <a className="chip" href={links.deliveryLog} target="_blank" rel="noopener">
                        Delivery log
                      </a>
                    )}
                    {isReal(links.reports) && (
                      <a className="chip" href={links.reports} target="_blank" rel="noopener">
                        Updates
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* ============ FIND / HOW TO BUY ============ */}
          <section id="buy" className="sec light">
            <div className="wrap">
              <div className="sec-head">
                <span className="super">five minutes, four steps</span>
                <h2>How to buy {token.ticker}</h2>
                <p>
                  Double-check the address every single time. We never DM, and we never post a
                  contract address anywhere before posting it here first.
                </p>
              </div>

              <CopyCA />

              <div className="steps">
                <div className="card step-card reveal" data-i="0">
                  <h3>Get a Solana wallet</h3>
                  <p>
                    Phantom, Solflare or Backpack. Write the seed phrase on paper and never share it
                    with anyone — including us.
                  </p>
                </div>
                <div className="card step-card reveal" data-i="1">
                  <h3>Fund it with SOL</h3>
                  <p>
                    Buy SOL on an exchange and send it over, or use the wallet&apos;s own on-ramp.
                  </p>
                </div>
                <div className="card step-card reveal" data-i="2">
                  <h3>Open the official link</h3>
                  <p>
                    Use only the buy button on this page and check the address above. Anything else is
                    a fake.
                  </p>
                </div>
                <div className="card step-card reveal" data-i="3">
                  <h3>Swap SOL → {token.ticker}</h3>
                  <p>
                    Set slippage, confirm, done. No staking, no claiming, no &ldquo;activation&rdquo;
                    step. Ever.
                  </p>
                </div>
              </div>

              <div className="venue-grid">
                {venues.map((v) =>
                  v.buy ? (
                    <BuyButton className="venue" key={v.name}>
                      <span className="v-ic">{v.icon}</span>
                      {v.name}
                    </BuyButton>
                  ) : (
                    <a className="venue" key={v.name} href={v.url} target="_blank" rel="noopener">
                      <span className="v-ic">{v.icon}</span>
                      {v.name}
                    </a>
                  )
                )}
              </div>

              <div className="buy-cta">
                <BuyButton className="btn">Buy {token.ticker} now</BuyButton>
                <a className="btn ghost" href="#cares">
                  See Tubby Cares
                </a>
              </div>
            </div>
          </section>

          {/* ============ FAQ ============ */}
          <section id="faq" className="sec plum">
            <div className="wrap">
              <div className="sec-head">
                <span className="super">the short version</span>
                <h2>Questions worth asking</h2>
              </div>

              <div className="faq">
                <details>
                  <summary>What is {token.ticker}?</summary>
                  <div className="a">
                    The community memecoin of the tubby cats universe on Solana — 20,000 hand-drawn
                    cats released into the public domain in 2022. It is an entertainment token with a
                    job: {feeSplit.care}% of every creator fee buys supplies for children&apos;s
                    shelters in Rio de Janeiro.
                  </div>
                </details>

                <details>
                  <summary>Where does the money actually go?</summary>
                  <div className="a">
                    Into five public wallets, split by the protocol itself: {feeSplit.care}% to Tubby
                    Cares, {feeSplit.ops}% to the team running the coin and the game,{" "}
                    {feeSplit.treats}% to the game&apos;s prize pool, {feeSplit.bite}% to buyback and
                    burn, and {feeSplit.art}% to the art fund. Your tokens are never taxed — the fee
                    is paid by pump.fun to the coin&apos;s creator, and the split is a setting inside
                    the coin that anyone can inspect.
                  </div>
                </details>

                <details>
                  <summary>How do I know the donations are real?</summary>
                  <div className="a">
                    Because they arrive as objects, not transfers. Every run is published with the
                    institution and its CNPJ, the full list of what was bought, the transaction that
                    paid for it, and photos of the supplies. The wallet is public, so you can watch
                    the money go in and the goods come out. What you will never see is a child&apos;s
                    face — that is not ours to publish.
                  </div>
                </details>

                <details>
                  <summary>Is the game play-to-earn?</summary>
                  <div className="a">
                    No. There is no emission, no staking yield, no APR, and nothing transferable
                    between accounts — no trading, no gifting, no market. Prizes come out of a fixed
                    slice of trading fees and can never exceed it, so there is nothing to drain and
                    nothing to farm. The game exists to bring people to the cause, not to pay people
                    to show up.
                  </div>
                </details>

                <details>
                  <summary>How do I buy it, safely?</summary>
                  <div className="a">
                    Use the buy button on this page and check the contract address against our two X
                    accounts first. We never DM you, never ask for a seed phrase, and never post an
                    address anywhere before here. If someone messages you a &ldquo;{token.ticker}&rdquo;
                    address, it is a scam.
                  </div>
                </details>

                <details>
                  <summary>Are there any guarantees?</summary>
                  <div className="a">
                    The only guarantee is that we love tubby cats. {token.ticker} is an entertainment
                    token with no intrinsic value, it is not an investment, and nothing here is
                    financial advice. Buying it is also not a tax-deductible donation — the project
                    donates from its own fee income, not on your behalf. Please have fun responsibly.
                  </div>
                </details>
              </div>
            </div>
          </section>
        </main>

        <Footer />
        <LiveTicker />
      </BuyProvider>
    </FundProvider>
  );
}
