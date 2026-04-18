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
  TOKEN_PROGRAM_ID,
  NATIVE_MINT,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAssociatedTokenAddressSync,
  getOrCreateAssociatedTokenAccount,
  createSyncNativeInstruction,
  createCloseAccountInstruction,
} from "@solana/spl-token";
import DLMM, { StrategyType, ActivationType } from "@meteora-ag/dlmm";
import { BN } from "@coral-xyz/anchor";
import fs from "fs";
import path from "path";
import { config } from "./config";
import { recordPoolAddress } from "./themeStore";
import type { SlotGraduatedEvent } from "./types";

// ── Constants ─────────────────────────────────────────────────────────────────

const TOKEN_LAUNCH_PROGRAM = new PublicKey(config.tokenLaunchProgramId);

// Bin step 100 = 1% per bin — suits high-volatility meme coins.
// Liquidity placed across 200 bins centred on the graduation price.
const BIN_STEP       = 100;
const BINS_EACH_SIDE = 100;

const DLMM_CLUSTER = (config.rpcUrl.includes("mainnet") ? "mainnet-beta" : "devnet") as
  | "mainnet-beta"
  | "devnet";

// ── IDL discriminator helper ──────────────────────────────────────────────────

function loadIdlDiscriminator(instructionName: string): Buffer {
  const idlPath = path.resolve(__dirname, "../../../target/idl/token_launch.json");
  if (!fs.existsSync(idlPath)) {
    throw new Error(`IDL not found at ${idlPath} — run anchor build first`);
  }
  const idl = JSON.parse(fs.readFileSync(idlPath, "utf-8")) as {
    instructions: Array<{ name: string; discriminator: number[] }>;
  };
  const ix = idl.instructions.find((i) => i.name === instructionName);
  if (!ix) throw new Error(`Instruction "${instructionName}" not found in IDL`);
  return Buffer.from(ix.discriminator);
}

// ── PDA helpers ───────────────────────────────────────────────────────────────

function slotMetadataPda(mint: PublicKey) {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("slot_metadata"), mint.toBuffer()],
    TOKEN_LAUNCH_PROGRAM,
  )[0];
}

function bondingCurvePda(mint: PublicKey) {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("bonding_curve"), mint.toBuffer()],
    TOKEN_LAUNCH_PROGRAM,
  )[0];
}

function platformConfigPda() {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("platform_config")],
    TOKEN_LAUNCH_PROGRAM,
  )[0];
}

// ── Wallet loader ─────────────────────────────────────────────────────────────

let _migrationKeypair: Keypair | null = null;

function getMigrationKeypair(): Keypair {
  if (_migrationKeypair) return _migrationKeypair;
  const raw = JSON.parse(fs.readFileSync(config.migrationKeypairPath, "utf-8"));
  _migrationKeypair = Keypair.fromSecretKey(Uint8Array.from(raw));
  return _migrationKeypair;
}

// ── Phase 1: drain vault assets on-chain ─────────────────────────────────────

/**
 * Calls migrate_to_amm on the token-launch program.
 * - Transfers remaining bonding curve tokens to authority ATA
 * - Mints 206.9M LP reserve tokens to authority ATA
 * - Drains vault SOL (minus rent) to authority
 *
 * pool_address is passed as a parameter and recorded in the on-chain event;
 * we use the real pool address computed in Phase 3 by calling this instruction
 * with a placeholder first, then the final address is captured in the event log.
 */
async function drainVaultAssets(
  connection: Connection,
  authority: Keypair,
  mint: PublicKey,
  poolAddress: PublicKey,
): Promise<{ solLamports: number; tokenUnits: bigint }> {
  const slotMetadata          = slotMetadataPda(mint);
  const bondingCurve          = bondingCurvePda(mint);
  const platformConfig        = platformConfigPda();
  const vaultTokenAccount     = getAssociatedTokenAddressSync(mint, bondingCurve, true);
  const authorityTokenAccount = getAssociatedTokenAddressSync(mint, authority.publicKey);

  const migrateDisc = loadIdlDiscriminator("migrate_to_amm");
  // Instruction data: 8-byte discriminator + 32-byte pool address pubkey
  const data = Buffer.concat([migrateDisc, poolAddress.toBuffer()]);

  const ix = {
    programId: TOKEN_LAUNCH_PROGRAM,
    keys: [
      { pubkey: authority.publicKey,        isSigner: true,  isWritable: true },
      { pubkey: mint,                        isSigner: false, isWritable: false },
      { pubkey: slotMetadata,                isSigner: false, isWritable: true },
      { pubkey: bondingCurve,                isSigner: false, isWritable: true },
      { pubkey: vaultTokenAccount,           isSigner: false, isWritable: true },
      { pubkey: authorityTokenAccount,       isSigner: false, isWritable: true },
      { pubkey: platformConfig,              isSigner: false, isWritable: false },
      { pubkey: ASSOCIATED_TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: TOKEN_PROGRAM_ID,            isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId,     isSigner: false, isWritable: false },
    ],
    data,
  };

  const balBefore = await connection.getBalance(authority.publicKey);
  const tokenAcctBefore = await connection
    .getTokenAccountBalance(authorityTokenAccount)
    .catch(() => ({ value: { amount: "0" } }));

  const tx  = new Transaction().add(ix);
  const sig = await sendAndConfirmTransaction(connection, tx, [authority], {
    commitment: "confirmed",
  });
  console.log(`[migration] migrate_to_amm tx: ${sig}`);

  const balAfter    = await connection.getBalance(authority.publicKey);
  const tokenAfter  = await connection.getTokenAccountBalance(authorityTokenAccount);

  const solReceived   = Math.max(0, balAfter - balBefore);
  const tokenReceived =
    BigInt(tokenAfter.value.amount) - BigInt(tokenAcctBefore.value.amount);

  console.log(`[migration] SOL received:    ${(solReceived / LAMPORTS_PER_SOL).toFixed(4)} SOL`);
  console.log(
    `[migration] Tokens received: ${(Number(tokenReceived) / 1e6).toLocaleString()}`,
  );

  return { solLamports: solReceived, tokenUnits: tokenReceived };
}

// ── Phase 2: wrap SOL → WSOL ─────────────────────────────────────────────────

async function wrapSol(
  connection: Connection,
  authority: Keypair,
  lamports: number,
): Promise<PublicKey> {
  const wsolAta = await getOrCreateAssociatedTokenAccount(
    connection,
    authority,
    NATIVE_MINT,
    authority.publicKey,
  );

  const tx = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: authority.publicKey,
      toPubkey:   wsolAta.address,
      lamports,
    }),
    createSyncNativeInstruction(wsolAta.address),
  );
  await sendAndConfirmTransaction(connection, tx, [authority], { commitment: "confirmed" });
  console.log(`[migration] Wrapped ${(lamports / LAMPORTS_PER_SOL).toFixed(4)} SOL → WSOL`);
  return wsolAta.address;
}

// ── Phase 3: create + seed Meteora DLMM pool ─────────────────────────────────

async function createAndSeedDlmmPool(
  connection: Connection,
  authority: Keypair,
  mint: PublicKey,
  tokenUnits: bigint,
  wsolLamports: number,
): Promise<PublicKey> {
  // DLMM requires tokenX < tokenY by pubkey (lexicographic).
  const wsolMint = NATIVE_MINT;
  const isTokenXOurToken =
    mint.toBuffer().compare(wsolMint.toBuffer()) < 0;
  const [tokenX, tokenY] = isTokenXOurToken
    ? [mint, wsolMint]
    : [wsolMint, mint];

  // Compute active bin ID from the graduation price.
  // DLMM price is defined as "amount of Y per unit of X" in the base-unit decimal space.
  // TOKEN = 6 decimals, WSOL = 9 decimals.
  //   if X=TOKEN, Y=WSOL: price = wsolLamports / tokenUnits_raw * 1e3  (adjust for dec diff)
  //   if X=WSOL,  Y=TOKEN: price = tokenUnits_raw / wsolLamports * 1e-3
  const rawPrice = isTokenXOurToken
    ? (wsolLamports / Number(tokenUnits)) * 1e3
    : (Number(tokenUnits) / wsolLamports) * 1e-3;

  const logBase = Math.log(1 + BIN_STEP / 10_000);
  const activeId = Math.round(Math.log(rawPrice) / logBase);
  const minBinId = activeId - BINS_EACH_SIDE;
  const maxBinId = activeId + BINS_EACH_SIDE;

  console.log(
    `[migration] Pair: ${tokenX.toBase58().slice(0, 8)}…/${tokenY.toBase58().slice(0, 8)}…  price=${rawPrice.toExponential(3)}  activeId=${activeId}`,
  );

  // Create pool — signature: (connection, binStep, tokenX, tokenY, activeId,
  //   feeBps, activationType, hasAlphaVault, creatorKey, activationPoint?, creatorPoolOnOffControl?, opt?)
  const createPoolTxs = await DLMM.createCustomizablePermissionlessLbPair(
    connection,
    new BN(BIN_STEP),
    tokenX,
    tokenY,
    new BN(activeId),
    new BN(25),              // feeBps = 25 bps (0.25% LP fee)
    ActivationType.Slot,     // activationType: activate by slot
    false,                   // hasAlphaVault
    authority.publicKey,
    undefined,               // activationPoint (immediate)
    false,                   // creatorPoolOnOffControl
    { cluster: DLMM_CLUSTER },
  );

  const poolTxList = Array.isArray(createPoolTxs) ? createPoolTxs : [createPoolTxs];
  let lbPairAddress: PublicKey | null = null;

  for (const poolTx of poolTxList) {
    const sig = await sendAndConfirmTransaction(connection, poolTx, [authority], {
      commitment: "confirmed",
    });
    console.log(`[migration] Pool creation tx: ${sig}`);
    // The LB pair account is the first writable non-signer in the init instruction
    if (!lbPairAddress && poolTx.instructions.length > 0) {
      const mainIx = poolTx.instructions[poolTx.instructions.length - 1];
      const firstWritable = mainIx.keys.find(
        (k: { pubkey: PublicKey; isSigner: boolean; isWritable: boolean }) =>
          k.isWritable && !k.isSigner,
      );
      if (firstWritable) lbPairAddress = firstWritable.pubkey;
    }
  }

  if (!lbPairAddress) {
    throw new Error("Could not determine LB pair address from pool creation transactions");
  }

  console.log(`[migration] DLMM pool: ${lbPairAddress.toBase58()}`);

  // Seed liquidity
  const dlmmPool = await DLMM.create(connection, lbPairAddress, { cluster: DLMM_CLUSTER });
  const positionKp = Keypair.generate();

  const [totalXAmount, totalYAmount] = isTokenXOurToken
    ? [new BN(tokenUnits.toString()), new BN(wsolLamports)]
    : [new BN(wsolLamports), new BN(tokenUnits.toString())];

  const addLiqTxs = await dlmmPool.addLiquidityByStrategy({
    positionPubKey: positionKp.publicKey,
    user:           authority.publicKey,
    totalXAmount,
    totalYAmount,
    strategy: { maxBinId, minBinId, strategyType: StrategyType.Spot },
  });

  const liqTxList = Array.isArray(addLiqTxs) ? addLiqTxs : [addLiqTxs];
  for (const liqTx of liqTxList) {
    const sig = await sendAndConfirmTransaction(connection, liqTx, [authority, positionKp], {
      commitment: "confirmed",
    });
    console.log(`[migration] Add liquidity tx: ${sig}`);
  }

  console.log(
    `[migration] ✅ Seeded ${(Number(tokenUnits) / 1e6).toLocaleString()} tokens + ${(wsolLamports / LAMPORTS_PER_SOL).toFixed(4)} SOL`,
  );

  // Close any WSOL dust
  const wsolAta = getAssociatedTokenAddressSync(NATIVE_MINT, authority.publicKey);
  const wsolInfo = await connection.getAccountInfo(wsolAta);
  if (wsolInfo) {
    const closeTx = new Transaction().add(
      createCloseAccountInstruction(wsolAta, authority.publicKey, authority.publicKey),
    );
    await sendAndConfirmTransaction(connection, closeTx, [authority], { commitment: "confirmed" });
  }

  return lbPairAddress;
}

// ── Main graduation handler ───────────────────────────────────────────────────

/**
 * Called after a SlotGraduated event is confirmed on-chain.
 *
 * Flow:
 *   1. Call migrate_to_amm (Rust) — drains vault SOL + tokens to migration authority
 *   2. Wrap SOL → WSOL
 *   3. Create Meteora DLMM TOKEN/WSOL pool
 *   4. Seed pool with all assets
 *
 * On devnet: steps 1 is executed; steps 2–4 are skipped with a log note,
 * because Meteora devnet infrastructure has limited pool support.
 */
export async function handleGraduation(
  event: SlotGraduatedEvent,
  connection: Connection,
): Promise<void> {
  const authority = getMigrationKeypair();
  const mint      = new PublicKey(event.mint);

  console.log(`\n[migration] ── Graduation: ${event.mint.slice(0, 8)}… ──`);
  console.log(`[migration] Creator: ${event.creator}`);
  console.log(
    `[migration] Real SOL: ${(Number(event.realSol) / LAMPORTS_PER_SOL).toFixed(4)}`,
  );

  // Use a placeholder pool address for the on-chain call; the real pool address
  // is logged below after creation. A future upgrade can add an updatePool instruction.
  const poolPlaceholder = PublicKey.default;

  let solLamports: number;
  let tokenUnits: bigint;

  try {
    ({ solLamports, tokenUnits } = await drainVaultAssets(
      connection,
      authority,
      mint,
      poolPlaceholder,
    ));
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[migration] ❌ migrate_to_amm failed: ${msg}`);
    return;
  }

  if (DLMM_CLUSTER === "devnet") {
    console.log(
      `[migration] ⚠️  Devnet — skipping DLMM pool creation (Meteora devnet has limited support)`,
    );
    console.log(
      `[migration]    Assets held by authority: ${authority.publicKey.toBase58()}`,
    );
    return;
  }

  // Keep 0.1 SOL for transaction fees; the rest goes into the pool
  const SOL_FEE_RESERVE = Math.floor(0.1 * LAMPORTS_PER_SOL);
  const wsolLamports    = Math.max(0, solLamports - SOL_FEE_RESERVE);

  if (wsolLamports <= 0 || tokenUnits <= 0n) {
    console.error(
      `[migration] ❌ Insufficient assets: ${wsolLamports} lamports, ${tokenUnits} tokens`,
    );
    return;
  }

  try {
    await wrapSol(connection, authority, wsolLamports);
  } catch (err: unknown) {
    console.error(
      `[migration] ❌ WSOL wrap failed: ${err instanceof Error ? err.message : err}`,
    );
    return;
  }

  try {
    const poolAddress = await createAndSeedDlmmPool(
      connection,
      authority,
      mint,
      tokenUnits,
      wsolLamports,
    );

    recordPoolAddress(event.mint, poolAddress.toBase58());

    console.log(`\n[migration] ✅ Migration complete!`);
    console.log(`[migration]    mint:         ${event.mint}`);
    console.log(`[migration]    pool:         ${poolAddress.toBase58()}`);
    console.log(`[migration]    meteora:      https://app.meteora.ag/dlmm/${poolAddress.toBase58()}`);
  } catch (err: unknown) {
    console.error(
      `[migration] ❌ DLMM pool creation failed: ${err instanceof Error ? err.message : err}`,
    );
  }
}
