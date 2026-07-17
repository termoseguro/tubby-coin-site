"use client";
import { useEffect, useState } from "react";
import { config } from "../../lib/config";
import "./tokenomics.css";

export default function Tokenomics() {
  const [market, setMarket] = useState({ price: "—", mcap: "—", vol: "—", liq: "—" });
  const [supply, setSupply] = useState("1,000,000,000");
  const [burned, setBurned] = useState(null);
  const [burnedPct, setBurnedPct] = useState("");
  const [balArt, setBalArt] = useState("—");
  const [balOps, setBalOps] = useState("—");
  const [balTreats, setBalTreats] = useState("—");
  const [balBite, setBalBite] = useState("—");
  const [life3, setLife3] = useState(false);

  useEffect(() => {
    const CA = config.token.contractAddress !== "TBA" ? config.token.contractAddress : "";
    const WALLET_ART = config.wallets.art;
    const WALLET_OPS = config.wallets.ops;
    const WALLET_TREATS = config.wallets.treats;
    const WALLET_BITE = config.wallets.bite;
    const RPC = config.liveData.rpcUrl || "https://api.mainnet-beta.solana.com";
    const TOTAL_SUPPLY = 1000000000;
    const REFRESH_MS = 60000;

    const fmtUsd = (n) => {
      if(n==null||isNaN(n)) return "—";
      if(n>=1e9) return "$"+(n/1e9).toFixed(2)+"B";
      if(n>=1e6) return "$"+(n/1e6).toFixed(2)+"M";
      if(n>=1e3) return "$"+(n/1e3).toFixed(1)+"K";
      return "$"+Number(n).toFixed(n<0.01?6:4);
    };
    const fmtNum = (n) => {
      if(n==null||isNaN(n)) return "—";
      if(n>=1e9) return (n/1e9).toFixed(2)+"B";
      if(n>=1e6) return (n/1e6).toFixed(2)+"M";
      if(n>=1e3) return (n/1e3).toFixed(1)+"K";
      return String(Math.round(n));
    };

    const rpcCall = (method, params) => {
      return fetch(RPC, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: method, params: params })
      }).then(r => r.json());
    };

    const updateMarket = () => {
      if (!CA) return;
      fetch("https://api.dexscreener.com/latest/dex/tokens/" + CA)
        .then(r => r.json())
        .then(d => {
          const pairs = (d && d.pairs) ? d.pairs : [];
          if (!pairs.length) return;
          pairs.sort((a, b) => ((b.liquidity && b.liquidity.usd) || 0) - ((a.liquidity && a.liquidity.usd) || 0));
          const p = pairs[0];
          setMarket({
            price: fmtUsd(parseFloat(p.priceUsd)),
            mcap: fmtUsd(p.marketCap || p.fdv),
            vol: fmtUsd(p.volume && p.volume.h24),
            liq: fmtUsd(p.liquidity && p.liquidity.usd)
          });
          const graduated = pairs.some(x => x.dexId && x.dexId.toLowerCase() !== "pumpfun");
          if (graduated) setLife3(true);
        }).catch(() => {});
    };

    const updateSupply = () => {
      if (!CA) return;
      rpcCall("getTokenSupply", [CA]).then(res => {
        const v = res && res.result && res.result.value;
        if (!v) return;
        const s = parseFloat(v.uiAmountString || v.uiAmount);
        if (isNaN(s)) return;
        setSupply(s.toLocaleString("en-US", { maximumFractionDigits: 0 }));
        const b = TOTAL_SUPPLY - s;
        if (b > 0.5) {
          setBurned(fmtNum(b));
          setBurnedPct("· " + ((b / TOTAL_SUPPLY) * 100).toFixed(2) + "% of supply");
        }
      }).catch(() => {});
    };

    const updateBalance = (wallet, setter) => {
      if (!wallet || wallet.startsWith("{")) return;
      rpcCall("getBalance", [wallet]).then(res => {
        const lam = res && res.result && res.result.value;
        if (lam == null) return;
        setter((lam / 1e9).toLocaleString("en-US", { maximumFractionDigits: 2 }) + " SOL");
      }).catch(() => {});
    };

    const tick = () => {
      updateMarket();
      updateSupply();
      updateBalance(WALLET_ART, setBalArt);
      updateBalance(WALLET_OPS, setBalOps);
      updateBalance(WALLET_TREATS, setBalTreats);
      updateBalance(WALLET_BITE, setBalBite);
    };

    if (CA) {
      tick();
      const intv = setInterval(tick, REFRESH_MS);
      return () => clearInterval(intv);
    }
  }, []);

  const isLive = config.token.contractAddress !== "TBA";
  const lives = config.tokenomics.lives;

  return (
    <div id="tk-page">
      <link href="https://fonts.googleapis.com/css2?family=Lilita+One&family=Nunito:ital,wght@0,400;0,600;0,700;0,800;1,400&family=IBM+Plex+Mono:wght@400;600&display=swap" rel="stylesheet" />
      <header className="bar">
  <div className="bar-in">
    <a className="logo" href="/"><img src="https://www.tubbycatscoin.com/coin.jpg" alt=""  /> $TUBBY</a>
    <nav>
      <a href="/#find">Find $TUBBY</a>
      <a href="/tokenomics" className="active">Tokenomics</a>
      <a href="/#nfts">NFTs</a>
      <a href="/#merch">Merch</a>
      <a href="/#faq">FAQ</a>
      <a className="btn" href="/#find">Buy</a>
    </nav>
  </div>
</header>

<main>

  {/*  ============ HERO + LIVE BOARD ============  */}
  <section className="hero">
    <div className="wrap">
      <span className="kicker">Numbers, but make them cute</span>
      <h1>TUBBYNOMICS</h1>
      <p>No taxes. No team bags. No gimmicks. $TUBBY's whole economy is the protocol fee pump.fun pays coin creators — your tokens are never touched, and this page watches where every bit of it goes, straight from the Solana blockchain.</p>

      <div style={{marginTop: "30px"}}>
        <span className="live-badge" id="liveBadge" className={`live-badge ${isLive ? "on" : ""}`}><span className="pulse"></span><span id="liveBadgeText">{isLive ? "Live — reading the chain" : "Preview — demo data"}</span></span>
        <div className="board">
          <div className="tile"><div className="v" id="lvPrice">{market.price}</div><div className="k">price (usd)</div></div>
          <div className="tile"><div className="v" id="lvMcap">{market.mcap}</div><div className="k">market cap</div></div>
          <div className="tile"><div className="v" id="lvVol">{market.vol}</div><div className="k">24h volume</div></div>
          <div className="tile"><div className="v" id="lvLiq">{market.liq}</div><div className="k">liquidity</div></div>
        </div>
        <p className="board-note" id="boardNote">The board wakes up the second the coin goes live — auto-refreshing right from the chain, no screenshots needed 🐱</p>
      </div>
    </div>
  </section>

  <div className="marquee" aria-hidden="true">
    <div className="marquee-track">
      <span>tubbynomics</span><span>★</span><span>no taxes</span><span>★</span><span>no team bags</span><span>★</span><span>30% back to the project</span><span>★</span><span>on-chain, not on-trust</span><span>★</span>
      <span>tubbynomics</span><span>★</span><span>no taxes</span><span>★</span><span>no team bags</span><span>★</span><span>30% back to the project</span><span>★</span><span>on-chain, not on-trust</span><span>★</span>
    </div>
  </div>

  {/*  ============ SUPPLY ============  */}
  <section>
    <div className="wrap">
      <div className="section-head">
        <span className="kicker">One circle, one color</span>
        <h2>The supply</h2>
        <p>Most tokenomics charts need six colors and a legend. Ours needs one — because 100% of the supply entered the market through the public bonding curve, on day one, at the same price for everyone.</p>
      </div>
      <div className="supply-grid">
        <div className="donut supply-donut">
          <div className="center-label"><b id="supplyLabel">{supply}</b><span>$TUBBY · 100% fair launch</span></div>
        </div>
        <div className="supply-notes">
          <div className="note-line"><span className="ic">🚫</span> 0% presale · 0% team allocation · 0% VC — nobody got tokens before you could.</div>
          <div className="note-line"><span className="ic">🧾</span> 0% tax on transfers — what you trade is what you get, always.</div>
          <div className="note-line"><span className="ic">🔒</span> At graduation, liquidity is created and locked by the protocol itself. Rug lever? Removed at the factory.</div>
          <div className="note-line"><span className="ic">🍫</span> Supply can only ever go <b>down</b> — via public Bite burns. It can never be minted up. Protocol law.</div>
        </div>
      </div>
      <div className="stat-row" style={{marginTop: "34px"}}>
        <div className="stat"><div className="n">1B</div><div className="l">fixed supply, forever</div></div>
        <div className="stat"><div className="n">0%</div><div className="l">insider allocation</div></div>
        <div className="stat"><div className="n">0%</div><div className="l">transfer tax</div></div>
        <div className="stat"><div className="n">100%</div><div className="l">launched on the curve</div></div>
      </div>
    </div>
  </section>

  {/*  ============ FEE ENGINE ============  */}
  <section style={{paddingTop: "0"}}>
    <div className="wrap">
      <div className="section-head">
        <span className="kicker">The treasury with no token bag</span>
        <h2>The fee engine ⚙️</h2>
        <p>pump.fun pays coin creators a dynamic fee on every trade — set by the protocol, paid by the protocol, never deducted from your tokens. It starts high while the coin is a kitten and shrinks as it grows. That fee is $TUBBY's entire treasury: nothing to dump, nothing to unlock, nothing hiding.</p>
      </div>
      <div className="engine">
        <div className="tier">
          <div className="bar-viz" aria-hidden="true"></div>
          <div className="pct">up to 0.95%</div>
          <div className="st">kitten stage</div>
          <div className="d">Small market cap — the fee is at its highest, feeding the project when it needs fuel the most.</div>
        </div>
        <div className="tier">
          <div className="bar-viz" aria-hidden="true"></div>
          <div className="pct">sliding ↓</div>
          <div className="st">growing cat</div>
          <div className="d">As the coin grows, the protocol steps the fee down automatically. Nothing for humans to fiddle with.</div>
        </div>
        <div className="tier">
          <div className="bar-viz" aria-hidden="true"></div>
          <div className="pct">0.05%</div>
          <div className="st">chonk stage</div>
          <div className="d">At full chonk, the fee is near-zero — the coin trades freely while the treasury keeps drip-feeding.</div>
        </div>
      </div>
    </div>
  </section>

  {/*  ============ ALLOCATION ============  */}
  <section className="alloc">
    <div className="wrap">
      <div className="section-head">
        <span className="kicker">On-chain, not on-trust</span>
        <h2>Where every fee goes 🧾</h2>
        <p>Four wallets, one protocol setting. Pump.fun allows splitting fees into up to 10 wallets — so we configured all four directly in the fee sharing when creating the coin. The entire allocation becomes code, not a promise. Balances update live.</p>
      </div>
      <div className="alloc-grid">
        <div className="donut fee-donut">
          <div className="center-label"><b>100%</b><span>of creator fees, allocated on-chain</span></div>
        </div>
        <div className="slices">
          <div className="slice">
            <div className="head"><span className="swatch" style={{background: 'var(--gold)', width: 18, height: 18, borderRadius: 6, border: '2px solid var(--ink)'}}></span><h3>🎨 Art Fund</h3><span className="pct">30%</span></div>
            <p>Flows back to the creator to fund new art, products, merch, and expand the tubby universe.</p>
            <div className="wallet"><span>{config.wallets.art}</span><span className="bal">bal: <b id="balArt">{balArt}</b></span></div>
          </div>
          <div className="slice">
            <div className="head"><span className="swatch" style={{background: 'var(--choco)', width: 18, height: 18, borderRadius: 6, border: '2px solid var(--ink)'}}></span><h3>⚙️ Ops & Team</h3><span className="pct">30%</span></div>
            <p>Funds infrastructure, developers, servers, and the team operating the project day-to-day.</p>
            <div className="wallet"><span>{config.wallets.ops}</span><span className="bal">bal: <b id="balOps">{balOps}</b></span></div>
          </div>
          <div className="slice">
            <div className="head"><span className="swatch" style={{background: 'var(--pink-soft)', width: 18, height: 18, borderRadius: 6, border: '2px solid var(--ink)'}}></span><h3>🎁 Treats</h3><span className="pct">25%</span></div>
            <p>Community rewards, airdrops for active holders, and prizes for art contests.</p>
            <div className="wallet"><span>{config.wallets.treats}</span><span className="bal">bal: <b id="balTreats">{balTreats}</b></span></div>
          </div>
          <div className="slice">
            <div className="head"><span className="swatch" style={{background: 'var(--ink)', width: 18, height: 18, borderRadius: 6, border: '2px solid var(--ink)'}}></span><h3>🔥 The Bite</h3><span className="pct">15%</span></div>
            <p>The deflationary fund. Used exclusively for buyback & burn at every completed milestone.</p>
            <div className="wallet"><span>{config.wallets.bite}</span><span className="bal">bal: <b id="balBite">{balBite}</b></span></div>
          </div>
        </div>
      </div>
      <div className="enforced">
        <span className="ic">🔍</span>
        <span>Don't trust the pie — audit it. The split is visible in the coin's fee configuration, and both wallets are public forever.</span>
        <a className="chip" href="{config.links.feeConfig}" target="_blank" rel="noopener">🧾 View fee config</a>
        <a className="chip" href="{config.links.reports}" target="_blank" rel="noopener">📬 Updates</a>
      </div>
    </div>
  </section>

  {/*  ============ THE BITE ============  */}
  <section>
    <div className="wrap">
      <div className="section-head">
        <span className="kicker">Deflation, but delicious</span>
        <h2>The Bite 🍫</h2>
        <p>Look at the coin. Someone already took a bite — it's chocolate under the gold. That's the mechanic: at quest milestones, the ops wallet buys $TUBBY on the open market and burns it. Each bite makes the coin a little scarcer, forever, with a receipt.</p>
      </div>
      <div className="bite-grid">
        <div className="bite-hero">
          <div className="big">🪙🍫</div>
          <h3>every milestone takes a bite</h3>
          <p>Bites are the only way $TUBBY's supply can ever change — and they only go one direction. No surprise mints, no secret burns: bites happen when the 9 Lives quest says so, and every single one is posted with its transaction.</p>
          <div className="burned">
            <div className="v" id="burnedVal">{burned || "0"}</div>
            <div className="k">$TUBBY bitten out of supply so far <span id="burnedPct">{burnedPct}</span></div>
          </div>
        </div>
        <div className="bite-steps">
          <div className="bite-step"><span className="num">1</span> A share of ops funds accrues for bites — the wallet is public, watch it fill up.</div>
          <div className="bite-step"><span className="num">2</span> A quest milestone unlocks → the wallet market-buys $TUBBY in the open, like anyone else.</div>
          <div className="bite-step"><span className="num">3</span> The tokens go to the burn address — gone from supply, permanently. Chomp.</div>
          <div className="bite-step"><span className="num">4</span> The burn tx is posted to the public bite log. <a className="chip" href="{config.links.burns}" target="_blank" rel="noopener">Bite log 🧾</a></div>
        </div>
      </div>
    </div>
  </section>

  {/*  ============ 9 LIVES ============  */}
  <section style={{paddingTop: "0"}}>
    <div className="wrap">
      <div className="section-head center">
        <span className="kicker">The quest log</span>
        <h2>The 9 Lives quest 🐾</h2>
        <p>Cats get nine lives; so does this coin. Each life unlocks at a milestone nobody can fake — and each unlock is something fun we ship in public, receipts included. This is the roadmap, gamified.</p>
      </div>

      <div className="lives-track" id="livesTrack">
        <div className={`life ${lives[1] || 1 === 1 ? "" : "locked"}`} data-life="1">
          <div className="paw">🐾</div>
          <div className="body">
            <h3>Life 1 · Birth <span className="tag">fair launch</span><span className="state on">unlocked</span></h3>
            <p>The coin goes live on pump.fun. All receipts published: endorsement, fee split, this very page.</p>
          </div>
        </div>
        <div className={`life ${lives[2] ? "" : "locked"}`} data-life="2">
          <div className="paw">🐾</div>
          <div className="body">
            <h3>Life 2 · First Treat <span className="tag">500 holders</span>{lives[2] ? <span className="state on">unlocked</span> : <span className="state off">locked</span>}</h3>
            <p>We buy a floor tubby cats NFT and give it away to a holder. The coin starts feeding the collection it came from 🍬</p>
          </div>
        </div>
        <div className={`life ${lives[3] || life3 ? "" : "locked"}`} data-life="3">
          <div className="paw">🐾</div>
          <div className="body">
            <h3>Life 3 · Graduation <span className="tag">bonding curve completes</span>{lives[3] || life3 ? <span className="state on">unlocked</span> : <span className="state off">locked</span>}</h3>
            <p>The curve fills, liquidity locks itself — and the first Bite 🍫 gets taken to celebrate. Burn tx published. <em>(This one unlocks automatically — the page detects it on-chain.)</em></p>
          </div>
        </div>
        <div className={`life ${lives[4] ? "" : "locked"}`} data-life="4">
          <div className="paw">🐾</div>
          <div className="body">
            <h3>Life 4 · First Commission <span className="tag">25 SOL to the project fund</span>{lives[4] ? <span className="state on">unlocked</span> : <span className="state off">locked</span>}</h3>
            <p>The Project Fund reveals its first commissioned piece: brand-new tubby art, artist credited, funded entirely by trading fees 🎨</p>
          </div>
        </div>
        <div className={`life ${lives[5] ? "" : "locked"}`} data-life="5">
          <div className="paw">🐾</div>
          <div className="body">
            <h3>Life 5 · The Contest <span className="tag">2,500 holders</span>{lives[5] ? <span className="state on">unlocked</span> : <span className="state off">locked</span>}</h3>
            <p>Community art contest — tubbies are CC0, so remix away. Winners rewarded, best entries pinned forever.</p>
          </div>
        </div>
        <div className={`life ${lives[6] ? "" : "locked"}`} data-life="6">
          <div className="paw">🐾</div>
          <div className="body">
            <h3>Life 6 · Fresh Drip <span className="tag">100 SOL to the project fund</span>{lives[6] ? <span className="state on">unlocked</span> : <span className="state off">locked</span>}</h3>
            <p>A brand-new merch drop, designed for the coin era and funded by the Project Fund. Real objects, real world 👕</p>
          </div>
        </div>
        <div className={`life ${lives[7] ? "" : "locked"}`} data-life="7">
          <div className="paw">🐾</div>
          <div className="body">
            <h3>Life 7 · Second Bite <span className="tag">5,000 holders</span>{lives[7] ? <span className="state on">unlocked</span> : <span className="state off">locked</span>}</h3>
            <p>Bite #2 🍫 plus a 1/1 tubby art auction — proceeds flow back into the Project Fund. The flywheel feeds itself.</p>
          </div>
        </div>
        <div className={`life ${lives[8] ? "" : "locked"}`} data-life="8">
          <div className="paw">🐾</div>
          <div className="body">
            <h3>Life 8 · The Grant <span className="tag">250 SOL to the project fund</span>{lives[8] ? <span className="state on">unlocked</span> : <span className="state off">locked</span>}</h3>
            <p>The tubby grant: we finance a community creator's project — animation, game, zine, anything tubbiful. Chosen in public.</p>
          </div>
        </div>
        <div className={`life ${lives[9] ? "" : "locked"}`} data-life="9">
          <div className="paw">🐾</div>
          <div className="body">
            <h3>Life 9 · The Ninth Life <span className="tag">10,000 holders</span>{lives[9] ? <span className="state on">unlocked</span> : <span className="state off">locked</span>}</h3>
            <p>The community votes on a legacy project for the tubby universe — the biggest thing the fund can build. Nine lives, fully lived ✦</p>
          </div>
        </div>
      </div>
      <p className="lives-note">Milestones are things we commit to ship, with receipts — the fun kind of roadmap 🐱</p>
    </div>
  </section>

  {/*  ============ COMPARE ============  */}
  <section style={{paddingTop: "0"}}>
    <div className="wrap">
      <div className="section-head">
        <span className="kicker">Standard kept, standard raised</span>
        <h2>vs. the typical cat coin</h2>
        <p>The cat meta runs on fair launches and fixed supplies — we kept all of that, and added the part most coins skip: a treasury with a public job.</p>
      </div>
      <div className="compare">
        <table>
          <tbody>
            <tr><th></th><th>typical cat coin</th><th>$TUBBY</th></tr>
            <tr><td>Supply & launch</td><td>1B fixed, fair launch</td><td className="yes">1B fixed, 100% on the curve — same standard, kept</td></tr>
            <tr><td>Treasury source</td><td>none, or a quiet team bag</td><td className="yes">protocol creator fees — no bag to dump, ever</td></tr>
            <tr><td>Fee allocation</td><td>undisclosed</td><td className="yes">30/30/25/15 across four public wallets, enforced on-chain</td></tr>
            <tr><td>Deflation</td><td>arbitrary or none</td><td className="yes">milestone Bites 🍫 — every burn with a tx receipt</td></tr>
            <tr><td>What fees build</td><td>—</td><td className="yes">new art, merch & grants for a real CC0 brand</td></tr>
            <tr><td>Live transparency</td><td>screenshots, maybe</td><td className="yes">this page reads the chain itself, on refresh</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  </section>

  {/*  ============ FAQ ============  */}
  <section style={{paddingTop: "0"}}>
    <div className="wrap">
      <div className="section-head">
        <span className="kicker">The lore goes deep, anon</span>
        <h2>Tubbynomics questions</h2>
      </div>
      <details>
        <summary>Why 4 wallets for the fee split?</summary>
        <div className="a">Because we can! Pump.fun allows splitting fees into up to 10 wallets, so we baked the exact allocations (Art, Ops, Treats, Bite) directly into the protocol's fee sharing. You don't have to trust us to move the money — the contract routes it for us automatically. 💗</div>
      </details>
      <details>
        <summary>Why 30% back to the project?</summary>
        <div className="a">Because the coin exists to feed the tubby universe, not the other way around. The Project Fund goes to the collection's creator to make new things — art, products, merch — and the wallet is open, so the community always sees the fuel arriving. A memecoin whose fees build a real creative catalog is a rare cat indeed 🐱</div>
      </details>
      <details>
        <summary>Can the tokenomics ever change?</summary>
        <div className="a">The supply can never increase — that's protocol law, not our promise. The fee split is an on-chain setting: if it ever changed, we'd announce it first and anyone could see it in the fee config. Silent changes are literally impossible. That's the whole point of putting it on-chain ✦</div>
      </details>
      <details>
        <summary>What do Bites actually do?</summary>
        <div className="a">Each Bite buys $TUBBY on the open market and burns it, so the supply gets permanently smaller — that part is pure math, verifiable in the burn tx. What the market does with a scarcer cat is the market's business; our job is taking the bites on schedule and posting the receipts 🍫</div>
      </details>
      <details>
        <summary>How does this page update "live"?</summary>
        <div className="a">No magic, no backend: your browser asks the Solana blockchain and public market APIs directly — price, market cap, volume, wallet balances and burned supply — and refreshes every minute. What you see is what the chain says, not what we typed. On-chain, not on-trust 🔍</div>
      </details>
    </div>
  </section>

</main>

<footer>
  <div className="wrap">
    <p className="kick">We like the tubby cat.</p>
    <h3>Legal Disclaimer</h3>
    <p>
      $TUBBY is a memecoin created purely for entertainment and community fun. It has no intrinsic value and
      should not be viewed as an investment. Nothing on this website constitutes financial or investment
      advice. Please enjoy the project responsibly and have fun!
    </p>
    <p className="fine">
      tubby cats artwork is in the public domain (CC0). $TUBBY creator fees are split 30/70 between the
      project fund and coin operations via pump.fun creator fee sharing; both wallets are published above.
      We will never DM you, never ask for your seed phrase, and never post a contract address anywhere
      before posting it on the home page first.
    </p>
  </div>
</footer>
    </div>
  );
}
