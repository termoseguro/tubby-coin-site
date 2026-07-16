# $TUBBY — Tubby Cats Coin (Next.js)

Community coin site for the tubby cats universe on Solana. Built with Next.js (App Router).
Ships with **live on-chain art-fund data**, a **gamified milestone bar**, a scroll-driven
**"unwrapping coin"** hero, and animated **tubby-art side rails**.

## Run it

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # production build
```

## Everything you edit lives in ONE file: `lib/config.js`

| What | Field | Notes |
|------|-------|-------|
| Go live | `live: true` | flips buy buttons + CA copy on |
| Contract address | `token.contractAddress` | keep `"TBA"` until launch minute |
| Buy routes | `links.pump`, `links.jupiter` | auto-append the CA when live |
| Fee wallets shown on site | `wallets.art`, `wallets.ops` | display only |
| **Live art-fund counter** | `liveData.rpcUrl` + `liveData.artWallet` | paste a Helius/QuickNode RPC url + the art wallet address, then set `live:true` |
| Demo number (pre-launch) | `liveData.demoFundedSol` | shown until live data is wired |
| Milestones (progress bar) | `milestones[]` | cumulative SOL targets |
| Side-rail + bg art | `art[]` | drop images in `/public/art` and list paths, or paste OpenSea/IPFS URLs |

### Wiring live data (no backend needed)
Solana RPCs allow browser reads via CORS. Just:
1. `liveData.rpcUrl = "https://mainnet.helius-rpc.com/?api-key=YOUR_KEY"`
2. `liveData.artWallet = "<the art fund Solana address>"`
3. `live = true`

The counter reads `getBalance` on that wallet every `refreshMs` and eases the number up.

## Deploy (Vercel)
Push to a git repo and import in Vercel, or run `vercel` from this folder. No env vars required —
config is in `lib/config.js`.

## Assets
- `public/coin.jpg` — the gold/chocolate tubby coin (the "unwrap" hero art).
- `public/art/` — drop tubby cats NFT images here for the side rails + background.
