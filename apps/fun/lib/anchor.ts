"use client";

import { AnchorProvider, setProvider, Program } from "@coral-xyz/anchor";
import { Connection, PublicKey } from "@solana/web3.js";
import type { AnchorWallet } from "@solana/wallet-adapter-react";
import { PROGRAM_IDS } from "./constants";

export const RPC_URL =
  process.env.NEXT_PUBLIC_RPC_URL ?? "https://api.devnet.solana.com";

export function getConnection(): Connection {
  return new Connection(RPC_URL, "confirmed");
}

export function getProvider(wallet: AnchorWallet): AnchorProvider {
  const connection = getConnection();
  const provider = new AnchorProvider(connection, wallet, {
    commitment: "confirmed",
    preflightCommitment: "confirmed",
  });
  setProvider(provider);
  return provider;
}

// Lazy IDL imports — bundled by Next.js at build time
let _tokenLaunchIdl: unknown = null;
async function getTokenLaunchIdl() {
  if (!_tokenLaunchIdl) {
    _tokenLaunchIdl = (await import("./idl/token_launch.json")).default;
  }
  return _tokenLaunchIdl;
}

export async function getTokenLaunchProgram(wallet: AnchorWallet) {
  const provider = getProvider(wallet);
  const idl = await getTokenLaunchIdl();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const idlWithAddr = { ...(idl as any), address: PROGRAM_IDS.tokenLaunch };
  return new Program(idlWithAddr, provider);
}

// ── PDA helpers ───────────────────────────────────────────────────────────────

export function slotMetadataPda(mint: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("slot_metadata"), mint.toBuffer()],
    new PublicKey(PROGRAM_IDS.tokenLaunch),
  );
}

export function bondingCurvePda(mint: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("bonding_curve"), mint.toBuffer()],
    new PublicKey(PROGRAM_IDS.tokenLaunch),
  );
}

export function walletCapPda(mint: PublicKey, wallet: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("wallet_cap"), mint.toBuffer(), wallet.toBuffer()],
    new PublicKey(PROGRAM_IDS.tokenLaunch),
  );
}

export function metadataPda(mint: PublicKey): [PublicKey, number] {
  const TOKEN_METADATA_PROGRAM_ID = new PublicKey("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s");
  return PublicKey.findProgramAddressSync(
    [Buffer.from("metadata"), TOKEN_METADATA_PROGRAM_ID.toBuffer(), mint.toBuffer()],
    TOKEN_METADATA_PROGRAM_ID,
  );
}

export function feeVaultPda(mint: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("fee_vault"), mint.toBuffer()],
    new PublicKey(PROGRAM_IDS.tokenLaunch),
  );
}

export function jackpotVaultPda(mint: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("jackpot_vault"), mint.toBuffer()],
    new PublicKey(PROGRAM_IDS.tokenLaunch),
  );
}
