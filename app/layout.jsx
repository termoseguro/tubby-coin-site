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
  metadataBase: new URL("https://tubbycoin.example"),
  title: "$TUBBY — Tubby Cats Coin",
  description:
    "$TUBBY is the community coin of the tubby cats universe on Solana. No presale, no team allocation, 30% of creator fees flow back to the project. High-risk asset — read the receipts.",
  openGraph: {
    title: "$TUBBY — Tubby Cats Coin",
    description:
      "The community coin of the tubby cats universe on Solana. 30% of creator fees flow back to the project.",
    images: ["/coin.jpg"],
  },
};

export const viewport = {
  themeColor: "#FF4FA3",
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
