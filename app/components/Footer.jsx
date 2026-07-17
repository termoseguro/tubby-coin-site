import { config } from "../../lib/config";

const isReal = (u) => Boolean(u) && u !== "#" && u !== "https://x.com/";

// shared site footer (home + tokenomics)
export default function Footer() {
  const { links, token, feeSplit } = config;
  return (
    <footer>
      <div className="wrap">
        <div className="footer-tagline">We like the tubby cat.</div>
        <div className="cols">
          <div>
            <h3>Legal Disclaimer</h3>
            <p>
              {token.ticker} is a memecoin created purely for entertainment and community fun.
              It has no intrinsic value and should not be viewed as an investment.
              Nothing on this website constitutes financial or investment advice.
              Please enjoy the project responsibly and have fun!
            </p>
          </div>
          <div>
            <h3>Find the cats</h3>
            <div className="links">
              {isReal(links.coinX) && (
                <a className="chip" href={links.coinX} target="_blank" rel="noopener">𝕏 coin account</a>
              )}
              {isReal(links.brandX) && (
                <a className="chip" href={links.brandX} target="_blank" rel="noopener">𝕏 tubby cats</a>
              )}
              {isReal(links.opensea) && (
                <a className="chip" href={links.opensea} target="_blank" rel="noopener">NFT collection</a>
              )}
              {isReal(links.telegram) && (
                <a className="chip" href={links.telegram} target="_blank" rel="noopener">Telegram</a>
              )}
            </div>
          </div>
        </div>
        <p className="fine">
          tubby cats artwork is in the public domain (CC0). {token.ticker} creator fees are split
          {" "}{feeSplit.art}/{feeSplit.ops} between the project fund and coin operations via pump.fun
          creator fee sharing; both wallets go public in the receipts section at launch. We will never DM you,
          never ask for your seed phrase, and never post a contract address anywhere before posting it
          here first.
        </p>
      </div>
    </footer>
  );
}
