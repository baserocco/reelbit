# ReelBit

Two-domain crypto gambling ecosystem on Solana.

- **reelbit.fun** — Slot machine token launchpad (like pump.fun but for slots)
- **reelbit.casino** — Casino where graduated slots go live

## How It Works

Users deploy slot machine tokens on reelbit.fun. Each slot has an SPL token on Solana trading on a Meteora DLMM bonding curve starting at $5k MCap. When it hits $100k MCap it graduates — AI generates the full slot theme and the slot goes live on reelbit.casino. Token holders earn revenue share from both trading fees and casino play forever.

## Key Rules

- Players **never** pay fees. Zero. Revenue = house edge only (96% RTP).
- Slot engine runs **off-chain** (game server). Only deposits/withdrawals/trading on-chain.
- **96% RTP** fixed on all slots.
- **Free deployment** for creators.

## Monorepo Structure

```
reelbit/
├── programs/               # Anchor (Solana) smart contracts
│   ├── token-launch/       # SPL token + DLMM pool creation
│   ├── graduation-detector/# MCap monitor + graduation sequence
│   ├── lp-vault/           # LP position custody
│   ├── harvester/          # Fee claiming + routing
│   ├── distribution/       # 25/25/20/15/15 split
│   ├── shareholder-pool/   # Claimable earnings across all slots
│   ├── jackpot-pool/       # VRF-verified jackpot
│   ├── casino-grr-vault/   # Player deposit custody
│   └── legal-reserve/      # Squads 3/5 multisig reserve
├── apps/
│   ├── fun/                # reelbit.fun (Next.js 14)
│   └── casino/             # reelbit.casino (Next.js 14)
├── packages/
│   ├── shared/             # Shared types, constants, utilities
│   └── ui/                 # Shared UI components
├── backend/
│   ├── game-server/        # Fastify — sessions, balances, RNG
│   ├── ai-pipeline/        # Graduation → themed slot generation
│   └── indexer/            # Helius webhooks → PostgreSQL
└── scripts/                # Devnet setup, deployment helpers
```

## Revenue Split (Trading Fees + Casino GGR — same everywhere)

| Recipient | Share |
|-----------|-------|
| Platform wallet | 25% |
| Creator wallet | 25% |
| Shareholder claimable pool | 20% |
| Jackpot pool | 15% |
| Legal reserve multisig | 15% |

## Build Order (8 Sprints)

| Sprint | Weeks | Focus |
|--------|-------|-------|
| 1 | 1–4 | Token Launch + DLMM + Distribution programs |
| 2 | 3–6 | reelbit.fun frontend |
| 3 | 5–8 | Graduation + AMM migration + all vaults |
| 4 | 7–10 | PixiJS slot engine (3 models) |
| 5 | 9–12 | AI generation pipeline |
| 6 | 11–14 | reelbit.casino |
| 7 | 13–16 | Integration + shareholder dashboard |
| 8 | 15–18 | Security audit + mainnet |

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Blockchain | Solana + Anchor 0.30.x |
| AMM | Meteora DLMM → Dynamic AMM |
| Auth | Privy |
| Frontend | Next.js 14 + Tailwind + Framer Motion |
| Slot Engine | PixiJS (WebGL, off-chain) |
| Backend | Node.js + Fastify |
| Database | PostgreSQL (Supabase) + Redis |
| Indexer | Helius webhooks |
| AI | GPT-4o Vision + Flux/DALL-E 3 |
| RNG | Provably fair + Switchboard VRF |
| Storage | Arweave/Irys + IPFS/Pinata |
| CDN | Cloudflare |
| Support | Claude API |

## Status

**Sprint 1 in progress** — Token Launch Program (Anchor)
