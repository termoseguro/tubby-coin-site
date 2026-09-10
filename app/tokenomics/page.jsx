"use client";
import { useEffect, useState } from "react";
import { config } from "../../lib/config";
import "./tokenomics.css";

// Pre-launch the wallets are "{{WALLET_CARE}}" placeholders. Printing those raw
// on the one page whose entire argument is "do not trust us, audit it" is the
// worst possible place to leak a template token, so they read as a promise of
// what lands at launch instead.
function walletText(w) {
  return !w || w.startsWith("{") ? "published at launch" : w;
}

// The home page has always hidden links that are not filled in yet. This page
// never got the helper, so it shipped four chips pointing at "#" — on the one
// page whose own strip reads "Don't trust the pie — audit it".
const isReal = (u) => Boolean(u) && u !== "#" && u !== "https://x.com/";

export default function Tokenomics() {
  const [market, setMarket] = useState({ price: "—", mcap: "—", vol: "—", liq: "—" });
  const [supply, setSupply] = useState("1,000,000,000");
  const [burned, setBurned] = useState(null);
  const [burnedPct, setBurnedPct] = useState("");
  const [balCare, setBalCare] = useState("—");
  const [balArt, setBalArt] = useState("—");
  const [balOps, setBalOps] = useState("—");
  const [balTreats, setBalTreats] = useState("—");
  const [balBite, setBalBite] = useState("—");
  const [life3, setLife3] = useState(false);

  useEffect(() => {
    const CA = config.token.contractAddress !== "TBA" ? config.token.contractAddress : "";
    const WALLET_CARE = config.wallets.care;
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
      updateBalance(WALLET_CARE, setBalCare);
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
      <header className="bar">
  <div className="bar-in">
    <a className="logo" href="/"><img src="/coin-96.webp" alt="" width={34} height={34} /> $TUBBY</a>
    <nav>
      <a href="/#cares">Tubby Cares</a>
      <a href="/tokenomics" className="active">Tokenomics</a>
      <a href="/game">The Game</a>
      <a href="/#collection">Collection</a>
      <a href="/#faq">FAQ</a>
      <a className="btn" href="/#buy">Buy</a>
    </nav>
  </div>
</header>

<main>

  {/*  ============ HERO + LIVE BOARD ============  */}
  <section className="hero">
    <div className="wrap">
      <span className="kicker">Numbers, but make them cute</span>
      <h1>TUBBYNOMICS</h1>
      <p>No taxes. No team bags. No gimmicks. $TUBBY&apos;s whole economy is the protocol fee pump.fun pays coin creators — your tokens are never touched. {config.feeSplit.care}% of it buys diapers, formula, medicine and food for children&apos;s care homes in Rio de Janeiro, and this page watches where every bit of it goes, straight from the Solana blockchain.</p>

      <div style={{marginTop: "30px"}}>
        <span id="liveBadge" className={`live-badge ${isLive ? "on" : ""}`}><span className="pulse"></span><span id="liveBadgeText">{isLive ? "Live — reading the chain" : "Preview — demo data"}</span></span>
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
      <span>tubbynomics</span><span>★</span><span>no taxes</span><span>★</span><span>no team bags</span><span>★</span><span>{config.feeSplit.care}% to children&apos;s care homes</span><span>★</span><span>goods, never cash</span><span>★</span><span>on-chain, not on-trust</span><span>★</span>
      <span>tubbynomics</span><span>★</span><span>no taxes</span><span>★</span><span>no team bags</span><span>★</span><span>{config.feeSplit.care}% to children&apos;s care homes</span><span>★</span><span>goods, never cash</span><span>★</span><span>on-chain, not on-trust</span><span>★</span>
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
        <p>pump.fun pays coin creators a fee on every trade — set by the protocol, paid by the protocol, never deducted from your tokens. It is flat while the coin is on the bonding curve, peaks just after graduation, then steps down as market cap climbs. That fee is $TUBBY&apos;s entire treasury: nothing to dump, nothing to unlock, nothing hiding.</p>
      </div>
      <div className="engine">
        <div className="tier">
          <div className="bar-viz" aria-hidden="true"></div>
          <div className="pct">0.30%</div>
          <div className="st">on the curve</div>
          <div className="d">Flat on every trade while the coin is still on the bonding curve — and for the first stretch after it graduates, up to 420 SOL market cap.</div>
        </div>
        <div className="tier">
          <div className="bar-viz" aria-hidden="true"></div>
          <div className="pct">0.95%</div>
          <div className="st">the peak</div>
          <div className="d">Between 420 and 1,470 SOL market cap the creator fee hits its highest point on the whole schedule. The treasury fills fastest just after graduation, not at the start.</div>
        </div>
        <div className="tier">
          <div className="bar-viz" aria-hidden="true"></div>
          <div className="pct">0.05%</div>
          <div className="st">full chonk</div>
          <div className="d">From the peak it steps down bracket by bracket, reaching the 0.05% floor above 98,240 SOL. The coin trades cheaply while the treasury keeps drip-feeding.</div>
        </div>
      </div>
      <p className="tier-note">
        These are pump.fun&apos;s numbers, not ours — we cannot set them, change them or opt out, and
        pump.fun can revise the schedule whenever it likes.{" "}
        <a href={config.links.feeSchedule} target="_blank" rel="noopener">
          Read the current fee schedule →
        </a>
      </p>
    </div>
  </section>

  {/*  ============ ALLOCATION ============  */}
  <section className="alloc">
    <div className="wrap">
      <div className="section-head">
        <span className="kicker">On-chain, not on-trust</span>
        <h2>Where every fee goes 🧾</h2>
        <p>Five wallets, one protocol setting. Pump.fun allows splitting fees into up to 10 wallets — so we configured all five directly in the fee sharing when creating the coin. The donation slice is routed by the protocol before we ever touch it: the entire allocation is code, not a promise. Balances update live.</p>
      </div>
      <div className="alloc-grid">
        <div className="donut fee-donut">
          <div className="center-label"><b>100%</b><span>of creator fees, allocated on-chain</span></div>
        </div>
        <div className="slices">
          <div className="slice">
            <div className="head"><span className="swatch" style={{background: 'var(--pink-deep)', width: 18, height: 18, borderRadius: 6, border: '2px solid var(--ink)'}}></span><h3>🧡 Tubby Cares</h3><span className="pct">{config.feeSplit.care}%</span></div>
            <p>Buys diapers, formula, medicine, food and hygiene supplies for children&apos;s care homes in Rio de Janeiro. Goods, never cash — every run published with the institution, its CNPJ, the item list, the funding tx and photos of the supplies.</p>
            <div className="wallet"><span>{walletText(config.wallets.care)}</span><span className="bal">bal: <b id="balCare">{balCare}</b></span></div>
          </div>
          <div className="slice">
            <div className="head"><span className="swatch" style={{background: 'var(--choco)', width: 18, height: 18, borderRadius: 6, border: '2px solid var(--ink)'}}></span><h3>⚙️ Ops &amp; Team</h3><span className="pct">{config.feeSplit.ops}%</span></div>
            <p>Funds infrastructure, developers, servers, and the team operating the project day-to-day.</p>
            <div className="wallet"><span>{walletText(config.wallets.ops)}</span><span className="bal">bal: <b id="balOps">{balOps}</b></span></div>
          </div>
          <div className="slice">
            <div className="head"><span className="swatch" style={{background: 'var(--pink-soft)', width: 18, height: 18, borderRadius: 6, border: '2px solid var(--ink)'}}></span><h3>🎁 Treats</h3><span className="pct">{config.feeSplit.treats}%</span></div>
            <p>The game&apos;s reward pool — the season board, prizes, and community rewards. Rewards out never exceed fees in.</p>
            <div className="wallet"><span>{walletText(config.wallets.treats)}</span><span className="bal">bal: <b id="balTreats">{balTreats}</b></span></div>
          </div>
          <div className="slice">
            <div className="head"><span className="swatch" style={{background: 'var(--ink)', width: 18, height: 18, borderRadius: 6, border: '2px solid var(--ink)'}}></span><h3>🔥 The Bite</h3><span className="pct">{config.feeSplit.bite}%</span></div>
            <p>The deflationary fund. Used exclusively for buyback &amp; burn at every completed milestone.</p>
            <div className="wallet"><span>{walletText(config.wallets.bite)}</span><span className="bal">bal: <b id="balBite">{balBite}</b></span></div>
          </div>
          <div className="slice">
            <div className="head"><span className="swatch" style={{background: 'var(--gold)', width: 18, height: 18, borderRadius: 6, border: '2px solid var(--ink)'}}></span><h3>🎨 Art Fund</h3><span className="pct">{config.feeSplit.art}%</span></div>
            <p>Flows back to the tubby cats brand to fund new art, products and merch for the universe the coin comes from. CC0 forever.</p>
            <div className="wallet"><span>{walletText(config.wallets.art)}</span><span className="bal">bal: <b id="balArt">{balArt}</b></span></div>
          </div>
        </div>
      </div>
      <div className="enforced">
        <span className="ic">🔍</span>
        <span>Don&apos;t trust the pie — audit it. The split is visible in the coin&apos;s fee configuration, and all five wallets are public forever.</span>
        {isReal(config.links.feeConfig) && (
          <a className="chip" href={config.links.feeConfig} target="_blank" rel="noopener">🧾 View fee config</a>
        )}
        {isReal(config.links.deliveryLog) && (
          <a className="chip" href={config.links.deliveryLog} target="_blank" rel="noopener">🧡 Delivery log</a>
        )}
        {isReal(config.links.reports) && (
          <a className="chip" href={config.links.reports} target="_blank" rel="noopener">📬 Updates</a>
        )}
      </div>
    </div>
  </section>

  {/*  ============ THE BITE ============  */}
  <section>
    <div className="wrap">
      <div className="section-head">
        <span className="kicker">Deflation, but delicious</span>
        <h2>The Bite 🍫</h2>
        <p>Look at the coin. Someone already took a bite — it&apos;s chocolate under the gold. That&apos;s the mechanic: at quest milestones, the Bite wallet buys $TUBBY on the open market and burns it. Its {config.feeSplit.bite}% arrives straight from the fee split and is spent on nothing else — ops never touches it. Each bite makes the coin a little scarcer, forever, with a receipt.</p>
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
          <div className="bite-step"><span className="num">1</span> The Bite wallet fills with its {config.feeSplit.bite}% of every creator fee — public, on-chain, watch it fill up.</div>
          <div className="bite-step"><span className="num">2</span> A quest milestone unlocks → the wallet market-buys $TUBBY in the open, like anyone else.</div>
          <div className="bite-step"><span className="num">3</span> The tokens go to the burn address — gone from supply, permanently. Chomp.</div>
          <div className="bite-step"><span className="num">4</span> The burn tx is posted to the public bite log.{isReal(config.links.burns) && (<> <a className="chip" href={config.links.burns} target="_blank" rel="noopener">Bite log 🧾</a></>)}</div>
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
        <p>Cats get nine lives; so does this coin. Each life unlocks on something that costs real money to move — traded volume, a graduation, a delivery that actually happened — never on a number anyone can inflate for the price of gas. Each unlock is something we ship in public, receipts included. This is the roadmap, gamified.</p>
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
            <h3>Life 2 · First Treat <span className="tag">5,000 SOL traded</span>{lives[2] ? <span className="state on">unlocked</span> : <span className="state off">locked</span>}</h3>
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
            <h3>Life 4 · The First Run <span className="tag">{config.milestones[0].sol} SOL in the Cares basket</span>{lives[4] ? <span className="state on">unlocked</span> : <span className="state off">locked</span>}</h3>
            <p>The first Tubby Cares delivery goes out to a children&apos;s care home in Rio — {config.milestones[0].items}, bought with trading fees. Signed receipt, CNPJ, funding tx and photos of every item, all published 🧡</p>
          </div>
        </div>
        <div className={`life ${lives[5] ? "" : "locked"}`} data-life="5">
          <div className="paw">🐾</div>
          <div className="body">
            <h3>Life 5 · The Contest <span className="tag">25,000 SOL traded</span>{lives[5] ? <span className="state on">unlocked</span> : <span className="state off">locked</span>}</h3>
            <p>Community art contest — tubbies are CC0, so remix away. Winners rewarded, best entries pinned forever.</p>
          </div>
        </div>
        <div className={`life ${lives[6] ? "" : "locked"}`} data-life="6">
          <div className="paw">🐾</div>
          <div className="body">
            <h3>Life 6 · Fresh Drip <span className="tag">5 Cares runs delivered</span>{lives[6] ? <span className="state on">unlocked</span> : <span className="state off">locked</span>}</h3>
            <p>A brand-new merch drop, designed for the coin era and funded by the Art Fund. Real objects, real world 👕</p>
          </div>
        </div>
        <div className={`life ${lives[7] ? "" : "locked"}`} data-life="7">
          <div className="paw">🐾</div>
          <div className="body">
            <h3>Life 7 · Second Bite <span className="tag">100,000 SOL traded</span>{lives[7] ? <span className="state on">unlocked</span> : <span className="state off">locked</span>}</h3>
            <p>Bite #2 🍫 plus a 1/1 tubby art auction — proceeds flow back into the Project Fund. The flywheel feeds itself.</p>
          </div>
        </div>
        <div className={`life ${lives[8] ? "" : "locked"}`} data-life="8">
          <div className="paw">🐾</div>
          <div className="body">
            <h3>Life 8 · The Grant <span className="tag">100 SOL to the art fund</span>{lives[8] ? <span className="state on">unlocked</span> : <span className="state off">locked</span>}</h3>
            <p>The tubby grant: we finance a community creator's project — animation, game, zine, anything tubbiful. Chosen in public.</p>
          </div>
        </div>
        <div className={`life ${lives[9] ? "" : "locked"}`} data-life="9">
          <div className="paw">🐾</div>
          <div className="body">
            <h3>Life 9 · The Ninth Life <span className="tag">500,000 SOL traded</span>{lives[9] ? <span className="state on">unlocked</span> : <span className="state off">locked</span>}</h3>
            <p>The community votes on a legacy project for the tubby universe — the biggest thing the fund can build. Nine lives, fully lived ✦</p>
          </div>
        </div>
      </div>
      <p className="lives-note">Volume figures are cumulative traded volume since launch. Nothing here is gated on holder count on purpose: a thousand wallets holding dust costs an attacker almost nothing, and a milestone somebody else can trigger is a milestone that spends our money on their schedule 🐱</p>
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
            <tr><td>Fee allocation</td><td>undisclosed</td><td className="yes">{config.feeSplit.care}/{config.feeSplit.ops}/{config.feeSplit.treats}/{config.feeSplit.bite}/{config.feeSplit.art} across five public wallets, enforced on-chain</td></tr>
            <tr><td>Deflation</td><td>arbitrary or none</td><td className="yes">milestone Bites 🍫 — every burn with a tx receipt</td></tr>
            <tr><td>What fees build</td><td>—</td><td className="yes">supplies for children&apos;s care homes in Rio — plus a game, art and merch</td></tr>
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
        <summary>Why 5 wallets for the fee split?</summary>
        <div className="a">Because we can! Pump.fun allows splitting fees into up to 10 wallets, so we baked the exact allocations (Cares, Ops, Treats, Bite, Art) directly into the protocol&apos;s fee sharing. You don&apos;t have to trust us to move the money — and you especially don&apos;t have to trust us with the donation slice, because the contract routes it there before we ever see it. 💗</div>
      </details>
      <details>
        <summary>Why {config.feeSplit.care}% to children&apos;s care homes?</summary>
        <div className="a">Because a memecoin can afford to be useful. {config.feeSplit.care}% of every creator fee buys diapers, formula, medicine and food for children&apos;s care homes in Rio de Janeiro — in goods, bought and delivered in person, never in cash. Every run is published with the institution, its CNPJ, the item list, the funding transaction and photos of the supplies 🧡</div>
      </details>
      <details>
        <summary>Can the tokenomics ever change?</summary>
        <div className="a">The supply can never increase — that's protocol law, not our promise. The fee split is an on-chain setting: if it ever changed, we'd announce it first and anyone could see it in the fee config. Silent changes are literally impossible. That's the whole point of putting it on-chain ✦</div>
      </details>
      <details>
        <summary>Does buying or playing more increase the donation?</summary>
        <div className="a">No. The donation is {config.feeSplit.care}% of creator fees and nothing else — no shop purchase, no pull, no season pass changes it. The game decides where a run goes and whose name is on the delivery card; it never decides how much. If spending could move the number, every sale in the game would be a charity pitch, and you would never be able to tell the two apart 🧡</div>
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
      tubby cats artwork is in the public domain (CC0). $TUBBY creator fees are routed by pump.fun
      creator fee sharing into five public wallets — {config.feeSplit.care}% Tubby Cares,
      {" "}{config.feeSplit.ops}% operations, {config.feeSplit.treats}% game rewards,
      {" "}{config.feeSplit.bite}% buyback &amp; burn and {config.feeSplit.art}% art fund; all five are
      published above. Tubby Cares donations are made in goods to children&apos;s care homes in Rio de
      Janeiro and are not a tax-deductible contribution by you. We will never DM you, never ask for your
      seed phrase, and never post a contract address anywhere before posting it on the home page first.
    </p>
  </div>
</footer>
    </div>
  );
}
