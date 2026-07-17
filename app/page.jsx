import { config } from "../lib/config";
import { FundProvider } from "./components/FundContext";
import { BuyProvider, BuyButton } from "./components/BuyModal";
import LiveArtFund from "./components/LiveArtFund";
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
        <div className="tile" key={i}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src} alt="Tubby cat" loading="lazy" />
        </div>
      ))}
    </div>
  );
}

export default function Page() {
  const { links, wallets, token, feeSplit, merch, art, communityArt, brand, venues, socials } = config;
  const social = socials
    .map((s) => ({ name: s.name, url: links[s.key] }))
    .filter((s) => isReal(s.url));

  return (
    <FundProvider>
      <BuyProvider>
        {/* ============ TOP BAR ============ */}
        <NavBar ticker={token.ticker} />

        <main id="top">
          {/* ============ HERO ============ */}
          <section className="hero">
            <div className="wrap">
              <HeroMascot />
              <h1>
                TUBBY CATS COIN
              </h1>
              <p className="lead">
                The community coin of the tubby cats universe on Solana. No presale, no team
                allocation, and {feeSplit.art}% of every creator fee flows straight back to the project.
              </p>
              <div className="hero-cta">
                <BuyButton className="btn">Buy {token.ticker}</BuyButton>
                <a className="btn ghost" href="#find">Find $TUBBY</a>
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
              <p className="risk-note">
                {token.ticker} is a memecoin — made by the community for the community.
              </p>
            </div>
          </section>

          {/* ============ BANNER ============ */}
          <section className="banner-section" style={{ background: "var(--brand)", padding: "0 0 64px 0" }}>
            <div className="wrap" style={{ maxWidth: "100%", padding: 0 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/coin-banner.webp"
                alt="Tubby Coin Banner"
                width={2560}
                height={846}
                loading="lazy"
                style={{ width: "100%", height: "auto", display: "block" }}
              />
            </div>
          </section>
          <Band text={brand.taglinePrimary} cls="band-a" />

          {/* ============ FIND $TUBBY ============ */}
          <section id="find" className="sec light">
            <div className="wrap">
              <div className="sec-head">
                <span className="super">Fair-launched &amp; verifiable</span>
                <h2>Find $TUBBY</h2>
                <p>
                  One token, one bonding curve, one contract. Always double-check the address below
                  against our two X accounts before you trade.
                </p>
              </div>
              <CopyCA />
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
            </div>
          </section>

          <Band text={brand.taglineSecondary} cls="band-b" />

          {/* ============ PROJECT FUND, LIVE ============ */}
          <section id="fund" className="sec brand">
            <div className="wrap">
              <div className="sec-head">
                <span className="super">On-chain, not on-trust</span>
                <h2>The project fund, live</h2>
                <p>
                  {feeSplit.art}% of every creator fee flows back to the project. This counter reads that
                  wallet straight from the Solana blockchain — the static site promised, this one proves.
                </p>
              </div>
              <LiveArtFund />
            </div>
          </section>

          {/* ============ TUBBY NFTs ============ */}
          <section id="nfts" className="sec dark">
            <div className="wrap">
              <div className="sec-head">
                <span className="super">20,000 hand-crafted cats · minted 2022</span>
                <h2>Tubby NFTs</h2>
                <p>
                  The tubby cats collection is 20,000 hand-drawn cats released fully into the public
                  domain (CC0) — remix them, print them, meme them, all encouraged. $TUBBY is the coin
                  of that universe. Explore the originals on OpenSea.
                </p>
                <a className="btn" href={links.opensea} target="_blank" rel="noopener">
                  Explore the collection
                </a>
              </div>
              <TileGrid images={art} limit={18} />
            </div>
          </section>

          {/* ============ MERCH ============ */}
          <section id="merch" className="sec brand">
            <div className="wrap">
              <div className="sec-head">
                <span className="super">Tubby swag</span>
                <h2>Official merch</h2>
                <p>
                  Tees, hoodies, hats and more — dressed in hand-crafted tubby art. Funded by the
                  project fund, CC0 forever.
                </p>
                <a className="btn" href={links.shop} target="_blank" rel="noopener">Go to shop</a>
              </div>
              {merch && merch.length > 0 ? (
                <TileGrid images={merch} />
              ) : (
                <div className="tile-grid">
                  {new Array(4).fill(null).map((_, i) => (
                    <div className="tile placeholder" key={i}>
                      <span>🧢</span>
                      <small>coming soon</small>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          {/* ============ ART (NFT arts live here, Toshi-style) ============ */}
          <section id="art" className="sec cream">
            <div className="wrap">
              <div className="sec-head">
                <span className="super">We love the memes</span>
                <h2>Onchain Positivity</h2>
                <p>
                  Straight from the official tubby cats X — fan art, PFPs and community love.
                  Follow{" "}
                  <a href={links.brandX} target="_blank" rel="noopener">@tubbycatsnft</a> for more.
                </p>
              </div>
              <TileGrid images={communityArt && communityArt.length ? communityArt : art} limit={18} />
            </div>
          </section>

          {/* ============ MEDIA PACK ============ */}
          <section id="media" className="sec light">
            <div className="wrap media-pack">
              <div className="sec-head">
                <span className="super">Brand style guide</span>
                <h2>Media pack</h2>
                <p>Grab the tubby coin logo, art files and brand assets for your posts and threads.</p>
                {isReal(brand.mediaKit) ? (
                  <a className="btn" href={brand.mediaKit} target="_blank" rel="noopener">
                    Download assets
                  </a>
                ) : (
                  <span className="chip">Coming soon</span>
                )}
              </div>
            </div>
          </section>

          {/* ============ THE RECEIPTS ============ */}
          <section id="receipts" className="sec cream">
            <div className="wrap">
              <div className="sec-head">
                <span className="super">Trust, but verify</span>
                <h2>The receipts 🧾</h2>
                <p>
                  Every cat coin says “trust me.” This one says “check.” Four claims, four proofs — all
                  public, all verifiable before you spend a single lamport.
                </p>
              </div>
              <div className="receipt-grid">
                <div className="receipt">
                  <span className="stamp">verify it</span>
                  <h3>Endorsed by the brand, on the record</h3>
                  <p>The tubby cats brand publicly backs this coin: a post from the official account and
                    a signed message from a project-linked wallet. The NFT channels stay dedicated to art;
                    this account and site run the coin.</p>
                  <div className="links">
                    {isReal(links.endorsementPost) && (
                      <a className="chip" href={links.endorsementPost} target="_blank" rel="noopener">Endorsement post</a>
                    )}
                    {isReal(links.signedMsg) && (
                      <a className="chip" href={links.signedMsg} target="_blank" rel="noopener">Signed wallet proof</a>
                    )}
                  </div>
                </div>

                <div className="receipt">
                  <span className="stamp">verify it</span>
                  <h3>{feeSplit.art}/{feeSplit.ops}/{feeSplit.treats}/{feeSplit.bite} fee split, enforced on-chain</h3>
                  <p>The creator-fee split is configured in pump.fun&apos;s fee sharing — not a promise,
                    a setting anyone can inspect. All 4 wallets are configured at launch.</p>
                  {isRealWallet(wallets.art) && (
                    <div className="wallet"><b>🎨 Project fund ({feeSplit.art}%):</b> {wallets.art}</div>
                  )}
                  {isRealWallet(wallets.ops) && (
                    <div className="wallet"><b>⚙️ Operations ({feeSplit.ops}%):</b> {wallets.ops}</div>
                  )}
                  {isRealWallet(wallets.treats) && (
                    <div className="wallet"><b>🎁 Treats ({feeSplit.treats}%):</b> {wallets.treats}</div>
                  )}
                  {isRealWallet(wallets.bite) && (
                    <div className="wallet"><b>🔥 The Bite ({feeSplit.bite}%):</b> {wallets.bite}</div>
                  )}
                  <div className="links">
                    {isReal(links.feeConfig) && (
                      <a className="chip" href={links.feeConfig} target="_blank" rel="noopener">View fee config</a>
                    )}
                  </div>
                </div>

                <div className="receipt">
                  <span className="stamp">by design</span>
                  <h3>No presale. No team allocation. Zero snipe.</h3>
                  <p>Standard pump.fun launch: the token starts on a transparent bonding curve with zero
                    insider supply and no bundled launch wallets. If the team wants tokens, we buy on the
                    curve like everyone else — declared publicly first.</p>
                  <div className="links">
                    <BuyButton className="chip">Token on pump.fun</BuyButton>
                  </div>
                </div>

                <div className="receipt">
                  <span className="stamp">recurring</span>
                  <h3>Project-fund transparency</h3>
                  <p>The project-fund wallet is public and on-chain, so anyone can see what came in and
                    what went out at any time. It&apos;s reinvested into the project — no fixed promises,
                    just an open wallet you can always check.</p>
                  <div className="links">
                    {isReal(links.reports) && (
                      <a className="chip" href={links.reports} target="_blank" rel="noopener">Updates</a>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* ============ HOW TO BUY ============ */}
          <section id="buy" className="sec brand">
            <div className="wrap">
              <div className="sec-head">
                <span className="super">Five minutes, four steps</span>
                <h2>How to buy $TUBBY</h2>
                <p>Double-check the CA every single time. We never DM and never post a CA anywhere before here.</p>
              </div>
              <div className="steps">
                <div className="step-card">
                  <h3>Get a Solana wallet</h3>
                  <p>Phantom, Solflare or Backpack. Write your seed phrase on paper — never share it with
                    anyone, including us.</p>
                </div>
                <div className="step-card">
                  <h3>Fund it with SOL</h3>
                  <p>Buy SOL on an exchange and send it to your wallet, or use the wallet&apos;s built-in
                    on-ramp.</p>
                </div>
                <div className="step-card">
                  <h3>Open the official link</h3>
                  <p>Use only the buy button on this page and check the CA above. Anything else is a fake.</p>
                </div>
                <div className="step-card">
                  <h3>Swap SOL → {token.ticker}</h3>
                  <p>Set slippage, confirm, done. It&apos;s in your wallet — no staking, no claiming, no
                    “activation” steps. Ever.</p>
                </div>
              </div>
              <div className="buy-cta">
                <BuyButton className="btn">Buy {token.ticker} now</BuyButton>
                <a className="btn ghost" href="#fund">See the project fund</a>
              </div>
            </div>
          </section>

          {/* ============ FAQ ============ */}
          <section id="faq" className="sec light">
            <div className="wrap">
              <div className="sec-head">
                <span className="super">The lore goes deep, anon</span>
                <h2>Facts about $TUBBY</h2>
              </div>
              <div className="faq">
                <details>
                  <summary>What is $TUBBY?</summary>
                  <div className="a">{token.ticker} is the community memecoin of the tubby cats universe on
                    Solana — 20,000 hand-crafted cats minted in 2022 and released into the public domain
                    (CC0). The coin exists to feed the project that made it, not drain it.</div>
                </details>
                <details>
                  <summary>Is this the official tubby cats token?</summary>
                  <div className="a">It&apos;s the coin initiative of the tubby cats brand, publicly endorsed
                    on the record — see the receipts section for the endorsement post and the signed wallet
                    proof. If you can&apos;t find those two proofs, don&apos;t buy anything claiming to be us.</div>
                </details>
                <details>
                  <summary>How are the creator fees split?</summary>
                  <div className="a">{feeSplit.art}/{feeSplit.ops}/{feeSplit.treats}/{feeSplit.bite}, enforced on-chain by pump.fun&apos;s fee
                    sharing into 4 distinct wallets: {feeSplit.art}% goes back to the project creator to fund the universe itself,
                    {feeSplit.ops}% funds the team running the coin, {feeSplit.treats}% is for community rewards, and {feeSplit.bite}% is dedicated to Buyback & Burn. All wallets are public.</div>
                </details>
                <details>
                  <summary>What does the project fund pay for?</summary>
                  <div className="a">It&apos;s reinvested into the project — products, art, and whatever the
                    tubby universe builds next. No fixed roadmap and no promised drops or airdrops; the wallet
                    is public, so you can always check what came in and where it went.</div>
                </details>
                <details>
                  <summary>Are there any guarantees?</summary>
                  <div className="a">The only guarantee is that we love tubby cats! {token.ticker} is an entertainment token with no intrinsic value. It&apos;s all about community and good vibes, so please remember this isn&apos;t financial advice.</div>
                </details>
              </div>
            </div>
          </section>
        </main>

        {/* ============ FOOTER ============ */}
        <Footer />
      </BuyProvider>
    </FundProvider>
  );
}
