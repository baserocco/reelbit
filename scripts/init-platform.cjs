/**
 * One-time setup: initialize PlatformConfig PDA on-chain.
 * Run: node scripts/init-platform.cjs
 *
 * Reads wallet addresses from env or falls back to the deployer wallet for devnet.
 */
"use strict";

const web3   = require("@solana/web3.js");
const anchor = require("@coral-xyz/anchor");
const fs     = require("fs");
const path   = require("path");

const { Connection, PublicKey, SystemProgram } = web3;
const { AnchorProvider, Program, Wallet, BN }  = anchor;

const RPC_URL    = process.env.ANCHOR_PROVIDER_URL || "https://api.devnet.solana.com";
const PROGRAM_ID = new PublicKey("5vy9vYy9A6wAy59nRvvpGd5drVwQU1JYqRuSg7xQZDD8");

const walletPath = process.env.ANCHOR_WALLET ||
  path.resolve(process.env.HOME, ".config/solana/id.json");
const payer = anchor.web3.Keypair.fromSecretKey(
  Uint8Array.from(JSON.parse(fs.readFileSync(walletPath, "utf-8")))
);

const connection = new Connection(RPC_URL, "confirmed");
const provider   = new AnchorProvider(connection, new Wallet(payer), { commitment: "confirmed" });
anchor.setProvider(provider);

const idl     = JSON.parse(fs.readFileSync(
  path.resolve(__dirname, "../target/idl/token_launch.json"), "utf-8"
));
const program = new Program({ ...idl, address: PROGRAM_ID.toBase58() }, provider);

// ── Destination wallets ───────────────────────────────────────────────────────
// On devnet, default all to the deployer wallet so fees are recoverable.
// In production: set PLATFORM_WALLET, LEGAL_WALLET, LICENSE_WALLET env vars.

const platformWallet = new PublicKey(process.env.PLATFORM_WALLET || payer.publicKey.toBase58());
const legalWallet    = new PublicKey(process.env.LEGAL_WALLET    || payer.publicKey.toBase58());
const licenseWallet  = new PublicKey(process.env.LICENSE_WALLET  || payer.publicKey.toBase58());

const [platformConfig] = PublicKey.findProgramAddressSync(
  [Buffer.from("platform_config")],
  PROGRAM_ID,
);

async function main() {
  console.log("\n🎰  ReelBit — Initialize Platform Config");
  console.log(`    authority:       ${payer.publicKey.toBase58()}`);
  console.log(`    platform_wallet: ${platformWallet.toBase58()}`);
  console.log(`    legal_wallet:    ${legalWallet.toBase58()}`);
  console.log(`    license_wallet:  ${licenseWallet.toBase58()}`);
  console.log(`    platform_config: ${platformConfig.toBase58()}`);

  // Check if already initialized
  const existing = await connection.getAccountInfo(platformConfig);
  if (existing) {
    console.log("\n✅  PlatformConfig already initialized — nothing to do.");
    return;
  }

  const sig = await program.methods
    .initializePlatform({
      platformWallet,
      legalWallet,
      licenseWallet,
    })
    .accounts({
      authority:      payer.publicKey,
      platformConfig,
      systemProgram:  SystemProgram.programId,
    })
    .rpc();

  console.log(`\n✅  PlatformConfig initialized!`);
  console.log(`    tx: ${sig}`);
  console.log(`    https://explorer.solana.com/tx/${sig}?cluster=devnet`);
}

main().catch((err) => {
  console.error("\n❌  Error:", err.message || err);
  process.exit(1);
});
