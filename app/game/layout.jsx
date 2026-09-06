import { Baloo_2 } from "next/font/google";

// Inter Tight is a fine UI face and completely wrong for a cat town — it reads
// corporate. Baloo 2 is round, chunky and warm, which is what "fofinho" means
// in type. Scoped to /game so the rest of the site keeps its own voice.
const baloo = Baloo_2({
  weight: ["400", "500", "600", "700", "800"],
  subsets: ["latin"],
  variable: "--font-game",
  display: "swap",
});

export const metadata = {
  title: "Tubby Town — prototype",
  // Test page: keep it out of Google until the loop is locked.
  robots: { index: false, follow: false },
};

export default function GameLayout({ children }) {
  return <div className={baloo.variable}>{children}</div>;
}
