import "./globals.css";
import { Inter_Tight, Inconsolata, Baloo_2 } from "next/font/google";

const interTight = Inter_Tight({
  weight: ["400", "500", "600", "700", "800", "900"],
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});
const inconsolata = Inconsolata({
  weight: ["400", "700"],
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});
// the display face for headings — the same one Tubby Town uses, so the site and
// the game read as one project rather than two
const baloo = Baloo_2({
  weight: ["600", "700", "800"],
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

export const metadata = {
  metadataBase: new URL("https://tubbycatscoin.com"),
  title: "$TUBBY — Tubby Cats Coin",
  description:
    "$TUBBY is the community coin of the tubby cats universe on Solana. Fair launch, 20,000 CC0 cats, and 20% of every creator fee buying food, medicine and supplies for children's shelters in Rio de Janeiro.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "$TUBBY — a memecoin that buys diapers",
    description:
      "20% of every creator fee buys food, medicine and supplies for children's shelters in Rio de Janeiro. Goods, never cash — every delivery published with receipts.",
    url: "https://tubbycatscoin.com",
    siteName: "Tubby Cats Coin",
    images: [{ url: "/og.jpg", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "$TUBBY — a memecoin that buys diapers",
    description:
      "20% of every creator fee buys food, medicine and supplies for children's shelters in Rio de Janeiro. Goods, never cash — every delivery published with receipts.",
    images: ["/og.jpg"],
  },
};

export const viewport = {
  themeColor: "#fe80c0",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${interTight.variable} ${inconsolata.variable} ${baloo.variable}`}>
      <body>{children}</body>
    </html>
  );
}
