import { config } from "../lib/config";
import { FundProvider } from "./components/FundContext";
import { BuyProvider, BuyButton } from "./components/BuyModal";
import CareFund from "./components/CareFund";
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
  const { links, wallets, token, feeSplit, care, merch, art, communityArt, brand, venues, socials } =
    config;
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
                allocation, and {feeSplit.care}% of every creator fee buys diapers, formula, medicine
                and food for children&apos;s shelters in Rio de Janeiro.
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

          {/* ============ TUBBY CARES ============ */}
          <section id="cares" className="sec brand">
            <div className="wrap">
              <div className="sec-head">
                <span className="super">{feeSplit.care}% of every creator fee · {care.city}</span>
                <h2>Tubby Cares 🧡</h2>
                <p>
                  {feeSplit.care}% of every creator fee buys real supplies for {care.cause}. We have run
                  drives like this before and gave plush toys; this time the coin funds the things a
                  shelter actually runs out of. The counter below reads the wallet straight from the
                  Solana blockchain — the promise is a protocol setting, not a paragraph.
                </p>
              </div>

              <CareFund />

              <div className="basket">
                {care.basket.map((b) => (
                  <span className="basket-item" key={b.name}>
                    <span className="b-ic">{b.emoji}</span>
                    {b.name}
                  </span>
                ))}
              </div>

              <div className="steps" style={{ marginTop: "38px" }}>
                <div className="step-card">
                  <h3>The fees set the amount</h3>
                  <p>
                    {feeSplit.care}% of creator fees, routed by pump.fun itself. Playing the game or
                    buying anything in it never raises it — the donation is arithmetic on a public fee
                    stream, not a marketing lever.
                  </p>
                </div>
                <div className="step-card">
                  <h3>Goods, never cash</h3>
                  <p>
                    The fund is spent on items and delivered in person. Nothing is wired to anyone. A
                    pallet of diapers can be photographed, counted and signed for; a transfer can only
                    be believed.
                  </p>
                </div>
                <div className="step-card">
                  <h3>Every run has a receipt</h3>
                  <p>
                    Date, institution, CNPJ, the full item list, the transaction that paid for it, and
                    photos of the goods. Published together or it did not happen.
                  </p>
                </div>
                <div className="step-card">
                  <h3>The town keeps the score</h3>
                  <p>
                    Tubby Town has a Care House that cannot be bought or rushed. It levels up only when
                    a real delivery goes out — the one building in the game the real world builds.
                  </p>
                </div>
              </div>

              <p className="care-note">
                We photograph the supplies, the delivery and the staff — never the children&apos;s
                faces. Kids in institutional care are the most protected people in Brazilian law
                (ECA arts. 17, 18 and 143), and that is exactly as it should be.
              </p>
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
                  art fund, CC0 forever.
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
                  <h3>Five wallets, one protocol setting</h3>
                  <p>The creator-fee split is configured in pump.fun&apos;s fee sharing — not a promise,
                    a setting anyone can inspect. All 5 wallets are configured at launch, and the
                    donation slice is routed by the protocol before we ever touch it.</p>
                  {isRealWallet(wallets.care) && (
                    <div className="wallet"><b>🧡 Tubby Cares ({feeSplit.care}%):</b> {wallets.care}</div>
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
                  {isRealWallet(wallets.art) && (
                    <div className="wallet"><b>🎨 Art fund ({feeSplit.art}%):</b> {wallets.art}</div>
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
                  <h3>Every delivery, logged</h3>
                  <p>Each Tubby Cares run is published with the date, the institution and its CNPJ, the
                    full list of what was bought, the transaction that funded it, and photos of the
                    supplies. The wallet is public too, so the money is checkable on the way in and the
                    goods are checkable on the way out. No fixed amount is ever promised — the fees
                    decide, and the fees are on-chain.</p>
                  <div className="links">
                    {isReal(links.deliveryLog) && (
                      <a className="chip" href={links.deliveryLog} target="_blank" rel="noopener">Delivery log</a>
                    )}
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
                <a className="btn ghost" href="#cares">See Tubby Cares</a>
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
                  <div className="a">Into 5 distinct wallets, enforced on-chain by pump.fun&apos;s fee sharing:
                    {" "}{feeSplit.care}% to Tubby Cares (supplies for children&apos;s shelters in Rio),
                    {" "}{feeSplit.ops}% to the team running the coin and the game,
                    {" "}{feeSplit.treats}% to the game&apos;s reward pool,
                    {" "}{feeSplit.bite}% to Buyback &amp; Burn, and
                    {" "}{feeSplit.art}% to the tubby art fund. All five wallets are public.
                    The donation slice was cut out of our own: the art fund went from 30% to {feeSplit.art}% to
                    open it up. Nobody else&apos;s share moved.</div>
                </details>
                <details>
                  <summary>Who actually gets the donations, and in what form?</summary>
                  <div className="a">Children&apos;s shelters in Rio de Janeiro, in goods — diapers, formula,
                    medicine, food, hygiene supplies. Never cash, never a transfer. We buy the items, deliver
                    them, and publish the signed donation receipt, the institution&apos;s CNPJ, the funding
                    transaction and photos of the supplies. Faces of children are never published.</div>
                </details>
                <details>
                  <summary>Does playing the game donate more?</summary>
                  <div className="a">No, and that is deliberate. The amount is {feeSplit.care}% of creator fees
                    and nothing else — no purchase in the game changes it. What the game does change is where a
                    run goes and whose name is on the delivery card. If spending could raise the donation, every
                    sale would become a charity pitch, and nobody could tell the two apart. Buy things in the
                    game because you want them; the donation happens either way.</div>
                </details>
                <details>
                  <summary>Is any of this tax-deductible?</summary>
                  <div className="a">No. Buying {token.ticker} is not a charitable donation and gives you no
                    deduction anywhere — you are buying a memecoin. The donations are made by the project from
                    its own fee income. Anyone telling you otherwise is wrong.</div>
                </details>
                <details>
                  <summary>What does the art fund pay for?</summary>
                  <div className="a">{feeSplit.art}% goes to the tubby cats brand — art, products, and whatever
                    the universe builds next. No fixed roadmap and no promised drops or airdrops; the wallet
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
