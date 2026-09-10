import { Lilita_One, Nunito, IBM_Plex_Mono } from "next/font/google";

/**
 * The tokenomics page kept its own typography, and it used to pull it from
 * fonts.googleapis.com with a <link> inside the component. The CSP in
 * middleware.js only allows `style-src 'self' 'unsafe-inline'`, so that
 * stylesheet was blocked on every load and the whole page silently rendered in
 * the browser's fallback face — the design was never actually being seen.
 *
 * Self-hosting through next/font fixes it without opening a hole in the CSP,
 * and removes a render-blocking third-party request while it is at it.
 */
const lilita = Lilita_One({
  weight: "400",
  subsets: ["latin"],
  variable: "--tk-display",
  display: "swap",
});
const nunito = Nunito({
  weight: ["400", "600", "700", "800"],
  style: ["normal", "italic"],
  subsets: ["latin"],
  variable: "--tk-body",
  display: "swap",
});
const plexMono = IBM_Plex_Mono({
  weight: ["400", "600"],
  subsets: ["latin"],
  variable: "--tk-mono",
  display: "swap",
});

export const metadata = {
  title: "Tubbynomics — where every $TUBBY fee goes",
  description:
    "Five public wallets, one protocol setting. 20% of every creator fee buys supplies for children's care homes in Rio de Janeiro. Read live from the Solana blockchain.",
};

export default function TokenomicsLayout({ children }) {
  return (
    <div className={`${lilita.variable} ${nunito.variable} ${plexMono.variable}`}>{children}</div>
  );
}
