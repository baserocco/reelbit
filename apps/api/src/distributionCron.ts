/**
 * Off-chain fee distribution service.
 *
 * Runs every 30 minutes. For each active (non-graduated) bonding curve token:
 *   1. Reads the fee_vault balance on-chain
 *   2. Skips if below 0.05 SOL threshold
 *   3. Builds + signs + sends a claim_fees transaction
 *   4. Emits a log for monitoring
 *
 * Post-graduation: DLMM LP fee harvesting is handled separately (sprint 4).
 * Top-100 holder dividends run on a 24h cadence from holderDividendCron.ts.
 *
 * Environment vars required:
 *   DISTRIBUTION_KEYPAIR_PATH  — bot keypair that pays gas (not signer for fees)
 *   PLATFORM_WALLET            — must match PlatformConfig on-chain
 *   LEGAL_WALLET               — must match PlatformConfig on-chain
 *   LICENSE_WALLET             — must match PlatformConfig on-chain
 */

import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  SystemProgram,
  TransactionInstruction,
  AccountMeta,
} from "@solana/web3.js";
import fs from "fs";
import path from "path";
import { getAllThemes } from "./themeStore";
import { config } from "./config";

// ── Config ────────────────────────────────────────────────────────────────────

const PROGRAM_ID = new PublicKey(config.tokenLaunchProgramId);
const DISTRIBUTION_INTERVAL_MS = 30 * 60 * 1_000; // 30 minutes

// Fee split (must mirror on-chain constants)
export const FEE_SPLIT = {
  creator:   0.25,
  platform:  0.25,
  jackpot:   0.30,
  legal:     0.10,
  licensing: 0.10,
} as const;

// ── Discriminator ─────────────────────────────────────────────────────────────
// Taken directly from target/idl/token_launch.json — authoritative source.

const CLAIM_FEES_DISCRIMINATOR        = Buffer.from([82, 251, 233, 156, 12, 52, 184, 202]);
const INITIALIZE_PLATFORM_DISCRIMINATOR = Buffer.from([119, 201, 101, 45, 75, 122, 89, 3]);

// ── PDA helpers ───────────────────────────────────────────────────────────────

function pda(seeds: Buffer[], programId: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(seeds, programId);
}

function bondingCurvePda(mint: PublicKey)  { return pda([Buffer.from("bonding_curve"), mint.toBuffer()], PROGRAM_ID); }
function feeVaultPda(mint: PublicKey)      { return pda([Buffer.from("fee_vault"), mint.toBuffer()], PROGRAM_ID); }
function jackpotVaultPda(mint: PublicKey)  { return pda([Buffer.from("jackpot_vault"), mint.toBuffer()], PROGRAM_ID); }
function platformConfigPda()               { return pda([Buffer.from("platform_config")], PROGRAM_ID); }

// ── Keypair loading ───────────────────────────────────────────────────────────

function loadKeypair(envKey: string, fallback: string): Keypair {
  const keyPath = process.env[envKey] ?? path.resolve(process.env.HOME ?? "~", fallback);
  const raw = JSON.parse(fs.readFileSync(keyPath, "utf-8"));
  return Keypair.fromSecretKey(Uint8Array.from(raw));
}

// ── BondingCurveVault parser ──────────────────────────────────────────────────
// Matches on-chain struct layout: 8 disc + 32 mint + 32 creator + 8×5 u64 + 8+8+8 timestamps + 1 bump

interface VaultState {
  creator:              PublicKey;
  launchedAt:           bigint;
  lastFeeDistribution:  bigint;
  realSol:              bigint;
}

const BONDING_CURVE_DISCRIMINATOR = Buffer.from([252, 234, 66, 111, 20, 145, 209, 189]);

function parseBondingCurveVault(data: Buffer): VaultState | null {
  if (data.length < 130) return null;
  if (!data.subarray(0, 8).equals(BONDING_CURVE_DISCRIMINATOR)) return null;
  // offset 8: mint (32), offset 40: creator (32)
  const creator             = new PublicKey(data.subarray(40, 72));
  // offset 72: virtual_sol, 80: virtual_tokens, 88: real_sol, 96: real_tokens, 104: launched_at, 112: last_fee_distribution, 120: total_fees_accumulated, 128: bump
  const realSol             = data.readBigUInt64LE(88);
  const launchedAt          = data.readBigInt64LE(104);
  const lastFeeDistribution = data.readBigInt64LE(112);
  return { creator, launchedAt, lastFeeDistribution, realSol };
}

// ── Instruction builder ───────────────────────────────────────────────────────

function buildClaimFeesInstruction(
  mint: PublicKey,
  caller: PublicKey,
  creator: PublicKey,
  platformWallet: PublicKey,
  legalWallet: PublicKey,
  licenseWallet: PublicKey,
): TransactionInstruction {
  const [bondingCurve]  = bondingCurvePda(mint);
  const [feeVault]      = feeVaultPda(mint);
  const [jackpotVault]  = jackpotVaultPda(mint);
  const [platformConfig] = platformConfigPda();

  const keys: AccountMeta[] = [
    { pubkey: caller,          isSigner: true,  isWritable: true  },
    { pubkey: mint,            isSigner: false, isWritable: false },
    { pubkey: bondingCurve,    isSigner: false, isWritable: true  },
    { pubkey: feeVault,        isSigner: false, isWritable: true  },
    { pubkey: jackpotVault,    isSigner: false, isWritable: true  },
    { pubkey: platformConfig,  isSigner: false, isWritable: false },
    { pubkey: platformWallet,  isSigner: false, isWritable: true  },
    { pubkey: legalWallet,     isSigner: false, isWritable: true  },
    { pubkey: licenseWallet,   isSigner: false, isWritable: true  },
    { pubkey: creator,         isSigner: false, isWritable: true  },
    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
  ];

  return new TransactionInstruction({
    programId: PROGRAM_ID,
    keys,
    data: CLAIM_FEES_DISCRIMINATOR,
  });
}

// ── Main distribution loop ────────────────────────────────────────────────────

const MIN_FEE_VAULT_LAMPORTS = 50_000_000; // 0.05 SOL — mirrors on-chain constant
const THIRTY_MIN_SECS = 30 * 60;

export async function runDistributionRound(connection: Connection): Promise<void> {
  const botKeypair     = loadKeypair("DISTRIBUTION_KEYPAIR_PATH", ".config/solana/id.json");
  const platformWallet = new PublicKey(process.env.PLATFORM_WALLET ?? botKeypair.publicKey.toBase58());
  const legalWallet    = new PublicKey(process.env.LEGAL_WALLET    ?? botKeypair.publicKey.toBase58());
  const licenseWallet  = new PublicKey(process.env.LICENSE_WALLET  ?? botKeypair.publicKey.toBase58());

  const themes = getAllThemes().filter((t) => !t.graduated);
  if (themes.length === 0) return;

  const nowSecs = Math.floor(Date.now() / 1_000);

  for (const theme of themes) {
    let mint: PublicKey;
    try { mint = new PublicKey(theme.mint); } catch { continue; }

    try {
      const [feeVaultPk] = feeVaultPda(mint);
      const [bondingCurvePk] = bondingCurvePda(mint);

      const [feeInfo, vaultInfo] = await Promise.all([
        connection.getAccountInfo(feeVaultPk),
        connection.getAccountInfo(bondingCurvePk),
      ]);

      // Skip if no fee vault or not enough accumulated
      if (!feeInfo || feeInfo.lamports < MIN_FEE_VAULT_LAMPORTS) continue;

      // Parse vault state to check cooldown
      if (!vaultInfo) continue;
      const vaultState = parseBondingCurveVault(Buffer.from(vaultInfo.data));
      if (!vaultState) continue;

      const secondsSinceLastDist = nowSecs - Number(vaultState.lastFeeDistribution);
      if (secondsSinceLastDist < THIRTY_MIN_SECS) continue;

      const ix = buildClaimFeesInstruction(
        mint,
        botKeypair.publicKey,
        vaultState.creator,
        platformWallet,
        legalWallet,
        licenseWallet,
      );

      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash("confirmed");
      const tx = new Transaction();
      tx.feePayer = botKeypair.publicKey;
      tx.recentBlockhash = blockhash;
      tx.add(ix);

      const sig = await connection.sendTransaction(tx, [botKeypair], {
        skipPreflight: false,
        preflightCommitment: "confirmed",
      });
      await connection.confirmTransaction({ signature: sig, blockhash, lastValidBlockHeight }, "confirmed");

      const jackpotExpired = (nowSecs - Number(vaultState.launchedAt)) > (30 * 24 * 60 * 60);
      const feeTotal = feeInfo.lamports - 890_880; // minus rent-exempt floor
      console.log(
        `[dist] ${theme.tokenSymbol} (${theme.mint.slice(0, 8)}) — ` +
        `${(feeTotal / 1e9).toFixed(4)} SOL distributed` +
        (jackpotExpired ? " [jackpot → platform: 30d expired]" : ""),
      );
    } catch (err) {
      console.error(`[dist] Error distributing fees for ${theme.mint.slice(0, 8)}:`, (err as Error).message);
    }
  }
}

// ── Cron starter ──────────────────────────────────────────────────────────────

export function startDistributionCron(connection: Connection): void {
  const run = () => runDistributionRound(connection).catch(console.error);

  // Initial run after 5 min (let the API fully start first)
  setTimeout(run, 5 * 60 * 1_000);
  setInterval(run, DISTRIBUTION_INTERVAL_MS);

  console.log("[dist] Fee distribution cron started (30-min interval, 5-min initial delay)");
}
