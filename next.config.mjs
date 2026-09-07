/** @type {import('next').NextConfig} */
const nextConfig = {
  // A production build normally writes into the SAME .next the dev server is
  // serving from, which silently deletes the chunks that server has already
  // handed to the browser. The page then 404s every chunk on the next reload
  // and hangs on "Waking the cats" — it looks exactly like a code bug and is
  // not one. So: `npm run check` builds into .next-check instead, and the dev
  // server is never disturbed.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  reactStrictMode: true,
  images: {
    // Allow remote tubby art (OpenSea CDN / IPFS gateways) if you ever swap
    // local slots for hotlinked collection images. Local /public art needs nothing here.
    remotePatterns: [
      { protocol: "https", hostname: "**.seadn.io" },
      { protocol: "https", hostname: "**.ipfs.nftstorage.link" },
      { protocol: "https", hostname: "ipfs.io" },
    ],
  },
};

export default nextConfig;
