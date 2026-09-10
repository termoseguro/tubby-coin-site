import { config, deliveredSol } from "../../lib/config";
import { BuyProvider } from "../components/BuyModal";
import DriveClips from "../components/DriveClips";
import ScrollFX from "../components/ScrollFX";
import NavBar from "../components/NavBar";
import Footer from "../components/Footer";

// The delivery log.
//
// This page exists because the site was already promising it. Both the receipts
// card and /tokenomics commit, in prose, to publishing every run — and
// `links.deliveryLog` pointed at "#", so the promise had nowhere to land. A
// commitment with no destination is the one thing tubby-cares.md §5 says a run
// may never be.
//
// It is deliberately honest when empty: no runs yet is a true and fine thing to
// say before launch, and far better than a page that does not exist.

export const metadata = {
  title: "Delivery log — Tubby Cares",
  description:
    "Every Tubby Cares run, published with the institution, its CNPJ, the full item list, the transaction that funded it and photos of the supplies.",
};

const isReal = (u) => Boolean(u) && u !== "#";

export default function CaresPage() {
  const { care, token, feeSplit, links } = config;
  const runs = care.deliveries || [];
  const delivered = deliveredSol();

  return (
    <BuyProvider>
      <ScrollFX />
      <NavBar ticker={token.ticker} />

      <main>
        <section className="sec brand" style={{ paddingBottom: 60 }}>
          <div className="wrap">
            <div className="sec-head">
              <span className="super">🧡 tubby cares</span>
              <h2>The delivery log</h2>
              <p>
                {feeSplit.care}% of every creator fee buys supplies for {care.cause}. This is where
                each run gets published — the institution and its CNPJ, everything that was bought,
                the transaction that paid for it, and photos of the goods.
              </p>
            </div>

            {/* ---- what has actually gone out ---- */}
            <div className="fund reveal" style={{ maxWidth: 620, margin: "0 auto" }}>
              <div className="amount">
                {runs.length}
                <span className="unit">{runs.length === 1 ? "run" : "runs"}</span>
              </div>
              <div className="cap">
                {runs.length === 0
                  ? "delivered so far — the first goes out after launch"
                  : `${delivered.toFixed(2)} SOL turned into supplies`}
              </div>
            </div>

            {runs.length === 0 ? (
              <div className="card reveal" style={{ maxWidth: 720, margin: "34px auto 0" }}>
                <h3>Nothing to show yet, and that is the honest answer</h3>
                <p>
                  {token.ticker} has not launched, so no creator fee exists and the Cares wallet has
                  never held anything. The first run goes out once it does — and when it does, it
                  appears here with every receipt below attached to it. If this page is still empty
                  a month after the coin is trading, that is a fair thing to hold against us.
                </p>
              </div>
            ) : (
              <div className="receipt-grid" style={{ marginTop: 34 }}>
                {runs.map((r) => (
                  <div className="card receipt reveal" key={r.tx || r.date}>
                    <span className="stamp">delivered</span>
                    <h3>{r.date}</h3>
                    <div className="drive-meta">
                      <span>📍 {r.org}</span>
                      {r.cnpj && <span>🧾 CNPJ {r.cnpj}</span>}
                      {r.sol != null && <span>◎ {Number(r.sol).toFixed(2)} SOL</span>}
                    </div>
                    <p>{r.items}</p>
                    {r.photos && r.photos.length > 0 && (
                      <div className="drive-gallery">
                        {r.photos.map((src, i) => (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={src} alt="Supplies delivered" key={i} loading="lazy" />
                        ))}
                      </div>
                    )}
                    {r.tx && (
                      <div className="links">
                        <a
                          className="chip"
                          href={`https://solscan.io/tx/${r.tx}`}
                          target="_blank"
                          rel="noopener"
                        >
                          Funding transaction
                        </a>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* ---- the standard, stated before there is anything to judge ---- */}
        <section className="sec light">
          <div className="wrap">
            <div className="sec-head">
              <span className="super">the standard</span>
              <h2>What every run publishes</h2>
              <p>
                All six, or it is not published as a run. Stating this before the first delivery is
                the point — it is easy to promise receipts once you have already chosen which ones
                to show.
              </p>
            </div>
            <div className="steps">
              <div className="card step-card reveal" data-i="0">
                <h3>Who received it</h3>
                <p>The institution by name, with its CNPJ, so anyone can look it up.</p>
              </div>
              <div className="card step-card reveal" data-i="1">
                <h3>What was bought</h3>
                <p>The full item list with quantities — counted after the fact, never promised before it.</p>
              </div>
              <div className="card step-card reveal" data-i="2">
                <h3>What paid for it</h3>
                <p>The transaction out of the public Cares wallet, and the amount.</p>
              </div>
              <div className="card step-card reveal" data-i="3">
                <h3>Photos of the goods</h3>
                <p>
                  Stacked, counted, at the door. Never a child&apos;s face — and where a child
                  appears at all, only with the institution&apos;s written permission.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ---- what happened before any of this had a token ---- */}
        {care.drives && care.drives.length > 0 && (
          <section className="sec cream">
            <div className="wrap">
              <div className="sec-head">
                <span className="super">📸 before the coin</span>
                <h2>Drives we ran with our own money</h2>
                <p>
                  No token, nothing to sell, nobody watching. The coin does not start the cause — it
                  funds the part we could never afford.
                </p>
              </div>

              {care.drives.map((d) => (
                <div className="drive reveal" key={d.title}>
                  <div className="drive-shot">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={d.photos[0]} alt={d.items} loading="lazy" />
                  </div>
                  <div className="drive-body">
                    <h3>{d.title}</h3>
                    <div className="drive-meta">
                      <span>🗓️ {d.when}</span>
                      <span>📍 {d.org}</span>
                      <span>📦 {d.items}</span>
                    </div>
                    <p>{d.note}</p>
                    {d.orgWhat && (
                      <p className="drive-org">
                        {d.orgUrl ? (
                          <a href={d.orgUrl} target="_blank" rel="noopener">
                            {d.org}
                          </a>
                        ) : (
                          d.org
                        )}{" "}
                        is {d.orgWhat}.
                      </p>
                    )}
                    <div className="drive-media">
                      {d.photos.slice(1).map((src, i) => (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={src} alt="Supplies bought for the drive" key={i} loading="lazy" />
                      ))}
                      <DriveClips clips={d.clips} />
                    </div>
                    {care.publishPeoplePhotos && d.people && d.people.length > 0 && (
                      <div className="drive-gallery">
                        {d.people.map((src, i) => (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={src}
                            alt="A child at the centre with one of the plush cats"
                            key={i}
                            loading="lazy"
                          />
                        ))}
                      </div>
                    )}
                    {d.authorisation && (
                      <p className="drive-org" style={{ marginTop: 14 }}>
                        {d.authorisation}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="sec plum" style={{ paddingTop: 60, paddingBottom: 60 }}>
          <div className="wrap" style={{ textAlign: "center" }}>
            <a className="btn" href="/#cares">
              Back to Tubby Cares
            </a>
            {isReal(links.feeConfig) && (
              <a
                className="btn ghost"
                href={links.feeConfig}
                target="_blank"
                rel="noopener"
                style={{ marginLeft: 14 }}
              >
                Inspect the fee split
              </a>
            )}
          </div>
        </section>
      </main>

      <Footer />
    </BuyProvider>
  );
}
