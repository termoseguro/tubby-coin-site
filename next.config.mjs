/** @type {import('next').NextConfig} */
const nextConfig = {
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
