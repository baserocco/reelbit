/**
 * LP Harvest Cron — runs every 24 hours.
 *
 * For each graduated token with a live Meteora DLMM pool, claims accrued LP
 * fees from the migration authority's position and distributes them with the
 * same 5-way split used by the pre-bond fee vault:
 *
 *   Creator   25%  — paid to the original token creator
 *   Platform  25%  — platform treasury (from PlatformConfig)
 *   Jackpot   30%  — per-token jackpot_vault PDA (feeds the slot machine display)
 *   Legal     10%  — legal/compliance wallet
 *   Licensing 10%  — licensing wallet
 *
 * On devnet this cron starts but finds no pools (graduation skips pool creation),
 * so it safely no-ops.
 */

import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  sendAndConfirmTransaction,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import {
  NATIVE_MINT,
  getAssociatedTokenAddressSync,
  createCloseAccountInstruction,
} from "@solana/spl-token";
import DLMM from "@meteora-ag/dlmm";
import fs from "fs";
import { config } from "./config";
import { getGraduatedWithPool } from "./themeStore";

// ── Constants ─────────────────────────────────────────────────────────────────

const TOKEN_LAUNCH_PROGRAM = new PublicKey(config.tokenLaunchProgramId);
const HARVEST_INTERVAL_MS  = 24 * 60 * 60 * 1_000; // 24 hours

const DLMM_CLUSTER = (config.rpcUrl.includes("mainnet") ? "mainnet-beta" : "devnet") as
  | "mainnet-beta"
  | "devnet";

// 5-way LP fee split (basis points, must sum to 10_000)
const LP_SPLIT = {
  creator:  2_500,
  platform: 2_500,
  jackpot:  3_000,
  legal:    1_000,
  license:  1_000,
} as const;

// ── PDA helpers ───────────────────────────────────────────────────────────────

function jackpotVaultPda(mint: PublicKey): PublicKey {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("jackpot_vault"), mint.toBuffer()],
    TOKEN_LAUNCH_PROGRAM,
  )[0];
}

function platformConfigPda(): PublicKey {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("platform_config")],
    TOKEN_LAUNCH_PROGRAM,
  )[0];
}

// ── Keypair loader ────────────────────────────────────────────────────────────

let _migrationKeypair: Keypair | null = null;

function getMigrationKeypair(): Keypair {
  if (_migrationKeypair) return _migrationKeypair;
  const raw = JSON.parse(fs.readFileSync(config.migrationKeypairPath, "utf-8"));
  _migrationKeypair = Keypair.fromSecretKey(Uint8Array.from(raw));
  return _migrationKeypair;
}

// ── PlatformConfig reader ─────────────────────────────────────────────────────

interface PlatformWallets {
  platform: PublicKey;
  legal:    PublicKey;
  license:  PublicKey;
}

async function readPlatformWallets(connection: Connection): Promise<PlatformWallets | null> {
  const info = await connection.getAccountInfo(platformConfigPda());
  if (!info) return null;
  const d = info.data;
  // Layout: 8-disc, 32-authority, 32-platform, 32-legal, 32-license, 1-bump
  return {
    platform: new PublicKey(d.slice(40, 72)),
    legal:    new PublicKey(d.slice(72, 104)),
    license:  new PublicKey(d.slice(104, 136)),
  };
}

// ── BondingCurveVault reader (for creator) ────────────────────────────────────

async function readCreator(connection: Connection, mint: PublicKey): Promise<PublicKey | null> {
  const [bcvPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("bonding_curve"), mint.toBuffer()],
    TOKEN_LAUNCH_PROGRAM,
  );
  const info = await connection.getAccountInfo(bcvPda);
  if (!info) return null;
  // Layout: 8-disc, 32-mint, 32-creator
  return new PublicKey(info.data.slice(40, 72));
}

// ── Harvest a single pool ─────────────────────────────────────────────────────

async function harvestPool(
  connection: Connection,
  authority: Keypair,
  mintStr: string,
  poolAddress: string,
  wallets: PlatformWallets,
): Promise<void> {
  const mint        = new PublicKey(mintStr);
  const lbPairKey   = new PublicKey(poolAddress);
  const creator     = await readCreator(connection, mint);

  if (!creator) {
    console.log(`[lp-harvest] ${mintStr.slice(0, 8)}… — creator not found, skipping`);
    return;
  }

  const dlmmPool = await DLMM.create(connection, lbPairKey, { cluster: DLMM_CLUSTER });

  // Get all positions held by the migration authority
  const { userPositions } = await dlmmPool.getPositionsByUserAndLbPair(authority.publicKey);
  if (userPositions.length === 0) {
    console.log(`[lp-harvest] ${mintStr.slice(0, 8)}… — no positions found`);
    return;
  }

  let totalSolHarvested = 0;

  // Claim all LP swap fees in one batch call
  const claimTxs = await dlmmPool.claimAllSwapFee({
    owner:     authority.publicKey,
    positions: userPositions,
  });

  const claimTxList = Array.isArray(claimTxs) ? claimTxs : [claimTxs];
  for (const claimTx of claimTxList) {
    await sendAndConfirmTransaction(connection, claimTx, [authority], {
      commitment: "confirmed",
    });
  }

  // After claiming, the authority receives WSOL (and possibly token fees).
  // Unwrap WSOL → SOL for distribution.
  const wsolAta  = getAssociatedTokenAddressSync(NATIVE_MINT, authority.publicKey);
  const wsolInfo = await connection.getAccountInfo(wsolAta);
  if (wsolInfo) {
    const closeTx = new Transaction().add(
      createCloseAccountInstruction(wsolAta, authority.publicKey, authority.publicKey),
    );
    await sendAndConfirmTransaction(connection, closeTx, [authority], { commitment: "confirmed" });
  }

  // Measure SOL gain
  const balBefore = await connection.getBalance(authority.publicKey);

  // Distribute: read current authority balance above a minimum keep amount
  const KEEP_LAMPORTS = Math.floor(0.05 * LAMPORTS_PER_SOL); // keep 0.05 SOL for future tx fees
  const currentBal    = await connection.getBalance(authority.publicKey);
  const distributable = Math.max(0, currentBal - KEEP_LAMPORTS);

  if (distributable < 10_000) {
    console.log(
      `[lp-harvest] ${mintStr.slice(0, 8)}… — ${(distributable / LAMPORTS_PER_SOL).toFixed(6)} SOL (below dust threshold)`,
    );
    return;
  }

  const share = (bps: number) => Math.floor((distributable * bps) / 10_000);
  const creatorShare  = share(LP_SPLIT.creator);
  const platformShare = share(LP_SPLIT.platform);
  const jackpotShare  = share(LP_SPLIT.jackpot);
  const legalShare    = share(LP_SPLIT.legal);
  const licenseShare  = share(LP_SPLIT.license);

  const jackpotVault  = jackpotVaultPda(mint);

  const distTx = new Transaction();
  if (creatorShare > 0)  distTx.add(SystemProgram.transfer({ fromPubkey: authority.publicKey, toPubkey: creator,           lamports: creatorShare }));
  if (platformShare > 0) distTx.add(SystemProgram.transfer({ fromPubkey: authority.publicKey, toPubkey: wallets.platform,  lamports: platformShare }));
  if (jackpotShare > 0)  distTx.add(SystemProgram.transfer({ fromPubkey: authority.publicKey, toPubkey: jackpotVault,      lamports: jackpotShare }));
  if (legalShare > 0)    distTx.add(SystemProgram.transfer({ fromPubkey: authority.publicKey, toPubkey: wallets.legal,     lamports: legalShare }));
  if (licenseShare > 0)  distTx.add(SystemProgram.transfer({ fromPubkey: authority.publicKey, toPubkey: wallets.license,   lamports: licenseShare }));

  if (distTx.instructions.length > 0) {
    await sendAndConfirmTransaction(connection, distTx, [authority], { commitment: "confirmed" });
    totalSolHarvested = distributable;
  }

  const fmtSol = (n: number) => (n / LAMPORTS_PER_SOL).toFixed(6);
  console.log(
    `[lp-harvest] ✅ ${mintStr.slice(0, 8)}… — distributed ${fmtSol(totalSolHarvested)} SOL ` +
    `(creator ${fmtSol(creatorShare)} / platform ${fmtSol(platformShare)} / jackpot ${fmtSol(jackpotShare)})`,
  );
}

// ── Harvest run ───────────────────────────────────────────────────────────────

async function runHarvest(connection: Connection): Promise<void> {
  const authority = getMigrationKeypair();
  const wallets   = await readPlatformWallets(connection);

  if (!wallets) {
    console.log("[lp-harvest] PlatformConfig not found — skipping harvest");
    return;
  }

  const graduatedPools = getGraduatedWithPool();

  if (graduatedPools.length === 0) {
    console.log("[lp-harvest] No graduated pools yet");
    return;
  }

  console.log(`\n[lp-harvest] ── Running harvest: ${graduatedPools.length} pool(s) ──`);

  for (const theme of graduatedPools) {
    try {
      await harvestPool(
        connection,
        authority,
        theme.mint,
        theme.poolAddress!,
        wallets,
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[lp-harvest] ❌ ${theme.mint.slice(0, 8)}… failed: ${msg}`);
    }
  }
}

// ── Cron starter ──────────────────────────────────────────────────────────────

export function startLpHarvestCron(connection: Connection): void {
  // Initial harvest after 5 minutes (allow server to fully start)
  setTimeout(() => runHarvest(connection).catch(console.error), 5 * 60 * 1_000);

  // Then every 24 hours
  setInterval(() => runHarvest(connection).catch(console.error), HARVEST_INTERVAL_MS);

  console.log("[lp-harvest] LP harvest cron started (24h interval)");
}
