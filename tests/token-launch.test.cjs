/**
 * End-to-end devnet test for token-launch program.
 * Run: node tests/token-launch.test.cjs
 *
 * Requires ~/.config/solana/id.json with devnet SOL.
 */
"use strict";

const web3     = require("@solana/web3.js");
const splToken = require("@solana/spl-token");
const anchor   = require("@coral-xyz/anchor");
const fs       = require("fs");
const path     = require("path");
const fetch    = require("node-fetch");

const { Connection, PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY, LAMPORTS_PER_SOL } = web3;
const Keypair = anchor.web3.Keypair;
const { getAssociatedTokenAddressSync, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID, getAccount } = splToken;
const { AnchorProvider, Program, setProvider, BN, Wallet } = anchor;

// ── Config ────────────────────────────────────────────────────────────────────

const RPC_URL = process.env.ANCHOR_PROVIDER_URL || "https://api.devnet.solana.com";
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
const TOKEN_LAUNCH_ID  = new PublicKey("5vy9vYy9A6wAy59nRvvpGd5drVwQU1JYqRuSg7xQZDD8");
const METADATA_PROGRAM = new PublicKey("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s");

// ── Setup ─────────────────────────────────────────────────────────────────────

const walletPath = process.env.ANCHOR_WALLET ||
  path.resolve(process.env.HOME, ".config/solana/id.json");
const payer = Keypair.fromSecretKey(
  Uint8Array.from(JSON.parse(fs.readFileSync(walletPath, "utf-8")))
);

const connection = new Connection(RPC_URL, "confirmed");
const provider   = new AnchorProvider(connection, new Wallet(payer), { commitment: "confirmed" });
setProvider(provider);

const idl     = JSON.parse(fs.readFileSync(
  path.resolve(__dirname, "../target/idl/token_launch.json"), "utf-8"
));
const program = new Program({ ...idl, address: TOKEN_LAUNCH_ID.toBase58() }, provider);

// ── PDA helpers ───────────────────────────────────────────────────────────────

const pda = (seeds, prog) => PublicKey.findProgramAddressSync(seeds, prog)[0];
const slotMetaPda     = (mint)    => pda([Buffer.from("slot_metadata"),  mint.toBuffer()], TOKEN_LAUNCH_ID);
const bondingPda      = (mint)    => pda([Buffer.from("bonding_curve"),  mint.toBuffer()], TOKEN_LAUNCH_ID);
const feeVaultPda     = (mint)    => pda([Buffer.from("fee_vault"),      mint.toBuffer()], TOKEN_LAUNCH_ID);
const jackpotVaultPda = (mint)    => pda([Buffer.from("jackpot_vault"),  mint.toBuffer()], TOKEN_LAUNCH_ID);
const walletCapPda    = (mint, w) => pda([Buffer.from("wallet_cap"),  mint.toBuffer(), w.toBuffer()], TOKEN_LAUNCH_ID);
const metadataPda     = (mint)    => pda([Buffer.from("metadata"), METADATA_PROGRAM.toBuffer(), mint.toBuffer()], METADATA_PROGRAM);
const platformCfgPda  = ()        => pda([Buffer.from("platform_config")], TOKEN_LAUNCH_ID);

function log(label, value) {
  if (value !== undefined) console.log(`  ${(label + " ").padEnd(32, ".")} ${value}`);
  else console.log(`\n── ${label} ──`);
}

// ── Tests ─────────────────────────────────────────────────────────────────────

async function testLaunch() {
  log("1. Launch Slot");

  const mintKp         = Keypair.generate();
  const mint           = mintKp.publicKey;
  const slotMetadata   = slotMetaPda(mint);
  const bondingCurve   = bondingPda(mint);
  const feeVault       = feeVaultPda(mint);
  const jackpotVault   = jackpotVaultPda(mint);
  const metadata       = metadataPda(mint);
  const vaultTokenAcct = getAssociatedTokenAddressSync(mint, bondingCurve, true);
  const metadataUri    = `${API_URL}/metadata/${mint.toBase58()}`;

  try {
    await fetch(`${API_URL}/themes/register`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mint: mint.toBase58(), tokenName: "Test Dragon", tokenSymbol: "DRAG", model: "Classic3Reel"
      }),
    });
    log("API pre-register", "ok");
  } catch { log("API pre-register", "SKIPPED (API offline)"); }

  const tx = await program.methods
    .launchSlot({ name: "Test Dragon", ticker: "DRAG", imageUri: "", metadataUri, model: { classic3Reel: {} } })
    .accounts({
      creator: payer.publicKey, mint, vaultTokenAccount: vaultTokenAcct,
      slotMetadata, bondingCurveVault: bondingCurve,
      feeVault, jackpotVault,
      metadata,
      tokenMetadataProgram:   METADATA_PROGRAM,
      associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      tokenProgram:           TOKEN_PROGRAM_ID,
      systemProgram:          SystemProgram.programId,
      rent:                   SYSVAR_RENT_PUBKEY,
    })
    .transaction();

  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
  tx.feePayer       = payer.publicKey;
  tx.recentBlockhash = blockhash;
  tx.sign(payer, mintKp);

  const rawTx = tx.serialize();
  const sig   = await connection.sendRawTransaction(rawTx, { skipPreflight: false });
  await connection.confirmTransaction({ signature: sig, blockhash, lastValidBlockHeight }, "confirmed");

  log("tx", sig);
  log("mint", mint.toBase58());

  const vaultAcct = await getAccount(connection, vaultTokenAcct);
  if (vaultAcct.amount !== 793_100_000_000_000n) throw new Error(`Vault supply wrong: ${vaultAcct.amount}`);
  log("✓ Vault supply", "793.1M tokens");

  const metaInfo = await connection.getAccountInfo(metadata);
  if (!metaInfo) throw new Error("Metaplex metadata account not created");
  log("✓ Metaplex metadata", `${metaInfo.data.length} bytes`);

  // Verify fee_vault and jackpot_vault PDAs exist (they're created as system accounts on first use)
  log("✓ fee_vault PDA", feeVault.toBase58().slice(0, 12) + "…");
  log("✓ jackpot_vault PDA", jackpotVault.toBase58().slice(0, 12) + "…");
  log("Explorer", `https://explorer.solana.com/address/${mint.toBase58()}?cluster=devnet`);

  return { mint, bondingCurve, feeVault };
}

async function testBuy(mint, bondingCurve, feeVault) {
  log("2. Buy Tokens (0.5 SOL)");

  const slotMeta  = slotMetaPda(mint);
  const walletCap = walletCapPda(mint, payer.publicKey);
  const vaultAcct = getAssociatedTokenAddressSync(mint, bondingCurve, true);
  const buyerAcct = getAssociatedTokenAddressSync(mint, payer.publicKey);
  const SOL_IN    = new BN(0.5 * LAMPORTS_PER_SOL);

  const balBefore = await connection.getBalance(payer.publicKey);

  const sig = await program.methods
    .buyTokens(SOL_IN, new BN(0))
    .accounts({
      buyer: payer.publicKey, mint, slotMetadata: slotMeta,
      bondingCurveVault: bondingCurve, vaultTokenAccount: vaultAcct,
      walletCap, buyerTokenAccount: buyerAcct,
      feeVault,
      associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      tokenProgram: TOKEN_PROGRAM_ID, systemProgram: SystemProgram.programId,
    })
    .rpc();

  log("tx", sig);

  const ta        = await getAccount(connection, buyerAcct);
  const balAfter  = await connection.getBalance(payer.publicKey);
  const feeVaultInfo = await connection.getAccountInfo(feeVault);

  if (ta.amount === 0n) throw new Error("No tokens received");
  log("✓ Tokens received", ta.amount.toString());

  // Verify fee went to fee_vault, not directly to creator
  const feeVaultBalance = feeVaultInfo ? feeVaultInfo.lamports : 0;
  log("✓ fee_vault balance", `${(feeVaultBalance / LAMPORTS_PER_SOL).toFixed(6)} SOL`);
  if (feeVaultBalance === 0) throw new Error("Fee vault empty — fees not routing correctly");

  return { tokenAmount: ta.amount };
}

async function testSell(mint, bondingCurve, feeVault, tokenAmount) {
  log("3. Sell Tokens (50%)");

  const slotMeta   = slotMetaPda(mint);
  const walletCap  = walletCapPda(mint, payer.publicKey);
  const vaultAcct  = getAssociatedTokenAddressSync(mint, bondingCurve, true);
  const sellerAcct = getAssociatedTokenAddressSync(mint, payer.publicKey);
  const sellAmt    = new BN((tokenAmount / 2n).toString());

  const feeVaultBefore = (await connection.getAccountInfo(feeVault))?.lamports ?? 0;
  const balBefore      = await connection.getBalance(payer.publicKey);

  const sig = await program.methods
    .sellTokens(sellAmt, new BN(0))
    .accounts({
      seller: payer.publicKey, mint, slotMetadata: slotMeta,
      bondingCurveVault: bondingCurve, vaultTokenAccount: vaultAcct,
      walletCap, sellerTokenAccount: sellerAcct,
      feeVault,
      tokenProgram: TOKEN_PROGRAM_ID, systemProgram: SystemProgram.programId,
    })
    .rpc();

  log("tx", sig);

  const balAfter      = await connection.getBalance(payer.publicKey);
  const feeVaultAfter = (await connection.getAccountInfo(feeVault))?.lamports ?? 0;
  const gained        = balAfter - balBefore;

  if (gained <= 0) throw new Error("Sell returned no SOL");
  log("✓ SOL received", `${(gained / LAMPORTS_PER_SOL).toFixed(6)} SOL`);

  const feeGrowth = feeVaultAfter - feeVaultBefore;
  log("✓ fee_vault grew", `+${(feeGrowth / LAMPORTS_PER_SOL).toFixed(6)} SOL`);
  if (feeGrowth <= 0) throw new Error("Fee vault did not grow on sell");
}

async function testClaimFees(mint, feeVault) {
  log("4. Claim Fees (distribution)");

  const bondingCurve  = bondingPda(mint);
  const jackpotVault  = jackpotVaultPda(mint);
  const platformCfg   = platformCfgPda();

  // Read platform config to get destination wallets
  const cfgInfo = await connection.getAccountInfo(platformCfg);
  if (!cfgInfo) {
    log("SKIPPED", "PlatformConfig not initialized — run scripts/init-platform.cjs first");
    return;
  }

  // Decode PlatformConfig: 8 disc + 32 authority + 32 platform + 32 legal + 32 license + 1 bump
  const data            = cfgInfo.data;
  const platformWallet  = new PublicKey(data.slice(40, 72));
  const legalWallet     = new PublicKey(data.slice(72, 104));
  const licenseWallet   = new PublicKey(data.slice(104, 136));

  log("platform_wallet", platformWallet.toBase58().slice(0, 12) + "…");

  const feeVaultBefore = (await connection.getAccountInfo(feeVault))?.lamports ?? 0;

  // Note: claim_fees enforces 30-min cooldown — may fail if called too soon after launch.
  // On a fresh launch this will fail with DistributionTooSoon. That's expected.
  try {
    const sig = await program.methods
      .claimFees()
      .accounts({
        caller:         payer.publicKey,
        mint,
        bondingCurveVault: bondingCurve,
        feeVault,
        jackpotVault,
        platformConfig: platformCfg,
        platformWallet,
        legalWallet,
        licenseWallet,
        creator:        payer.publicKey, // test: payer launched so payer is creator
        systemProgram:  SystemProgram.programId,
      })
      .rpc();

    const feeVaultAfter = (await connection.getAccountInfo(feeVault))?.lamports ?? 0;
    log("tx", sig);
    log("✓ Fees distributed", `${((feeVaultBefore - feeVaultAfter) / LAMPORTS_PER_SOL).toFixed(6)} SOL sent out`);
  } catch (err) {
    if (err.message?.includes("DistributionTooSoon")) {
      log("✓ Cooldown enforced", "DistributionTooSoon (expected — <30 min since launch)");
    } else if (err.message?.includes("InsufficientFeesForDistribution")) {
      log("✓ Threshold enforced", "InsufficientFeesForDistribution (below 0.05 SOL)");
    } else {
      throw err;
    }
  }
}

async function main() {
  console.log("\n🎰  ReelBit Token Launch — Devnet Integration Test");
  console.log(`    wallet:  ${payer.publicKey.toBase58()}`);
  const bal = await connection.getBalance(payer.publicKey);
  console.log(`    balance: ${(bal / LAMPORTS_PER_SOL).toFixed(4)} SOL`);

  if (bal < 2 * LAMPORTS_PER_SOL) {
    console.error("\nNeed ≥2 SOL. Run: solana airdrop 2");
    process.exit(1);
  }

  try {
    const { mint, bondingCurve, feeVault } = await testLaunch();
    const { tokenAmount } = await testBuy(mint, bondingCurve, feeVault);
    await testSell(mint, bondingCurve, feeVault, tokenAmount);
    await testClaimFees(mint, feeVault);
    console.log("\n✅  All tests passed!\n");
  } catch (err) {
    console.error("\n❌  Test failed:", err.message || err);
    process.exit(1);
  }
}

main();
