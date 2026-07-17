import "./globals.css";
import { Inter_Tight, Inconsolata } from "next/font/google";

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

export const metadata = {
  metadataBase: new URL("https://tubbycatscoin.com"),
  title: "$TUBBY — Tubby Cats Coin",
  description:
    "$TUBBY is the community coin of the tubby cats universe on Solana. Fair launch, hand-crafted cat art, and creator fees flowing back into the project. Made by the community, for the community.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "$TUBBY — Tubby Cats Coin",
    description:
      "The community coin of the tubby cats universe on Solana. Made by the community, for the community.",
    url: "https://tubbycatscoin.com",
    siteName: "Tubby Cats Coin",
    images: [{ url: "/og.jpg", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "$TUBBY — Tubby Cats Coin",
    description:
      "The community coin of the tubby cats universe on Solana. Made by the community, for the community.",
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
    <html lang="en" className={`${interTight.variable} ${inconsolata.variable}`}>
      <body>{children}</body>
    </html>
  );
}
