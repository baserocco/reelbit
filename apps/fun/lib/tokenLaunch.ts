"use client";

import {
  PublicKey,
  LAMPORTS_PER_SOL,
  SystemProgram,
  Keypair,
  SYSVAR_RENT_PUBKEY,
} from "@solana/web3.js";
import {
  getAssociatedTokenAddressSync,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import type { AnchorWallet } from "@solana/wallet-adapter-react";
import BN from "bn.js";
import {
  getTokenLaunchProgram,
  getConnection,
  slotMetadataPda,
  bondingCurvePda,
  walletCapPda,
  metadataPda,
  feeVaultPda,
  jackpotVaultPda,
} from "./anchor";

const TOKEN_METADATA_PROGRAM_ID = new PublicKey("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s");
const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

// ── Bonding curve math (mirrors Rust x*y=k) ───────────────────────────────────

const VIRTUAL_SOL    = BigInt(30 * LAMPORTS_PER_SOL);
const VIRTUAL_TOKENS = BigInt("1073000191000000");
const GRADUATION_LAMPORTS = BigInt(85 * LAMPORTS_PER_SOL);

/** Mirrors on-chain fee_bps() — dynamic fee rate based on graduation progress. */
function progressFeeBps(realSol: bigint): bigint {
  const pct = (realSol * 100n) / GRADUATION_LAMPORTS;
  if (pct < 20n) return 200n;
  if (pct < 60n) return 150n;
  return 100n;
}

export function calcTokensOut(
  virtualSol: bigint,
  virtualTokens: bigint,
  solIn: bigint,
): bigint {
  return (virtualTokens * solIn) / (virtualSol + solIn);
}

export function calcSolOut(
  virtualSol: bigint,
  virtualTokens: bigint,
  tokensIn: bigint,
): bigint {
  return (virtualSol * tokensIn) / (virtualTokens + tokensIn);
}

export function estimateTokensForSol(solLamports: bigint): bigint {
  return calcTokensOut(VIRTUAL_SOL, VIRTUAL_TOKENS, solLamports);
}

export function estimateSolForTokens(tokens: bigint): bigint {
  return calcSolOut(VIRTUAL_SOL, VIRTUAL_TOKENS, tokens);
}

// ── On-chain state fetcher ────────────────────────────────────────────────────

export interface BondingCurveState {
  mint: string;
  creator: string;
  virtualSol: bigint;
  virtualTokens: bigint;
  realSol: bigint;
  realTokens: bigint;
}

type AnchorAccountRecord = Record<string, { fetch: (key: PublicKey) => Promise<Record<string, unknown>> }>;
type AnchorMethodRecord = Record<string, (...args: unknown[]) => { accounts: (a: unknown) => { rpc: () => Promise<string> } }>;

export async function fetchBondingCurve(
  wallet: AnchorWallet,
  mint: PublicKey,
): Promise<BondingCurveState | null> {
  try {
    const program = await getTokenLaunchProgram(wallet);
    const [vaultPda] = bondingCurvePda(mint);
    const accounts = program.account as unknown as AnchorAccountRecord;
    const data = await accounts.bondingCurveVault.fetch(vaultPda);
    return {
      mint: (data.mint as PublicKey).toBase58(),
      creator: (data.creator as PublicKey).toBase58(),
      virtualSol: BigInt((data.virtualSol as BN).toString()),
      virtualTokens: BigInt((data.virtualTokens as BN).toString()),
      realSol: BigInt((data.realSol as BN).toString()),
      realTokens: BigInt((data.realTokens as BN).toString()),
    };
  } catch {
    return null;
  }
}

// ── Transactions ──────────────────────────────────────────────────────────────

export interface BuyResult {
  signature: string;
  tokensOut: bigint;
}

export async function buyTokens(
  wallet: AnchorWallet,
  mint: PublicKey,
  solLamports: bigint,
  slippageBps: number = 100,
): Promise<BuyResult> {
  const program = await getTokenLaunchProgram(wallet);

  const [slotMetadata] = slotMetadataPda(mint);
  const [bondingCurve] = bondingCurvePda(mint);
  const [walletCap]   = walletCapPda(mint, wallet.publicKey);
  const [feeVault]    = feeVaultPda(mint);

  const curveState = await fetchBondingCurve(wallet, mint);
  const vs = curveState?.virtualSol ?? VIRTUAL_SOL;
  const vt = curveState?.virtualTokens ?? VIRTUAL_TOKENS;

  // Apply dynamic fee to estimate tokens received on net trading SOL
  const feeBps = progressFeeBps(curveState?.realSol ?? 0n);
  const tradingSol = (solLamports * (BigInt(10_000) - feeBps)) / BigInt(10_000);
  const tokensOut = calcTokensOut(vs, vt, tradingSol);
  const minTokensOut = (tokensOut * BigInt(10_000 - slippageBps)) / BigInt(10_000);

  const vaultTokenAccount = getAssociatedTokenAddressSync(mint, bondingCurve, true);
  const buyerTokenAccount = getAssociatedTokenAddressSync(mint, wallet.publicKey);

  const methods = program.methods as unknown as AnchorMethodRecord;
  const signature = await methods
    .buyTokens(new BN(solLamports.toString()) as unknown as string, new BN(minTokensOut.toString()) as unknown as string)
    .accounts({
      buyer: wallet.publicKey,
      mint,
      slotMetadata,
      bondingCurveVault: bondingCurve,
      vaultTokenAccount,
      walletCap,
      buyerTokenAccount,
      feeVault,
      associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      tokenProgram: TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    })
    .rpc();

  return { signature, tokensOut };
}

export interface SellResult {
  signature: string;
  solOut: bigint;
}

export async function sellTokens(
  wallet: AnchorWallet,
  mint: PublicKey,
  tokenAmount: bigint,
  slippageBps: number = 100,
): Promise<SellResult> {
  const program = await getTokenLaunchProgram(wallet);

  const [slotMetadata] = slotMetadataPda(mint);
  const [bondingCurve] = bondingCurvePda(mint);
  const [walletCap]   = walletCapPda(mint, wallet.publicKey);
  const [feeVault]    = feeVaultPda(mint);

  const curveState = await fetchBondingCurve(wallet, mint);
  const vs = curveState?.virtualSol ?? VIRTUAL_SOL;
  const vt = curveState?.virtualTokens ?? VIRTUAL_TOKENS;

  const grossSol  = calcSolOut(vs, vt, tokenAmount);
  const feeBps    = progressFeeBps(curveState?.realSol ?? 0n);
  const feeAmount = (grossSol * feeBps) / BigInt(10_000);
  const netSol    = grossSol - feeAmount;
  const minSolOut = (netSol * BigInt(10_000 - slippageBps)) / BigInt(10_000);

  const vaultTokenAccount  = getAssociatedTokenAddressSync(mint, bondingCurve, true);
  const sellerTokenAccount = getAssociatedTokenAddressSync(mint, wallet.publicKey);

  const methods = program.methods as unknown as AnchorMethodRecord;
  const signature = await methods
    .sellTokens(new BN(tokenAmount.toString()) as unknown as string, new BN(minSolOut.toString()) as unknown as string)
    .accounts({
      seller: wallet.publicKey,
      mint,
      slotMetadata,
      bondingCurveVault: bondingCurve,
      vaultTokenAccount,
      walletCap,
      sellerTokenAccount,
      feeVault,
      tokenProgram: TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    })
    .rpc();

  return { signature, solOut: netSol };
}

// ── Launch ────────────────────────────────────────────────────────────────────

export interface LaunchParams {
  name: string;
  ticker: string;
  imageUri: string;
  description: string;
  model: "Classic3Reel" | "Standard5Reel" | "FiveReelFreeSpins";
}

export interface LaunchResult {
  mint: string;
  signature: string;
  metadataUri: string;
}

type LaunchMethodRecord = Record<string, (p: unknown) => { accounts: (a: unknown) => { transaction: () => Promise<import("@solana/web3.js").Transaction> } }>;

export async function launchSlot(
  wallet: AnchorWallet,
  params: LaunchParams,
): Promise<LaunchResult> {
  const mintKeypair = Keypair.generate();
  const mint = mintKeypair.publicKey;

  // Register the token in the API so /metadata/:mint serves valid JSON
  const metadataUri = `${API}/metadata/${mint.toBase58()}`;
  await fetch(`${API}/themes/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      mint: mint.toBase58(),
      tokenName: params.name,
      tokenSymbol: params.ticker,
      imageUri: params.imageUri,
      description: params.description,
      model: params.model,
    }),
  });

  const program = await getTokenLaunchProgram(wallet);
  const connection = getConnection();
  const [slotMetadata]    = slotMetadataPda(mint);
  const [bondingCurve]    = bondingCurvePda(mint);
  const [metadata]        = metadataPda(mint);
  const [feeVault]        = feeVaultPda(mint);
  const [jackpotVault]    = jackpotVaultPda(mint);
  const vaultTokenAccount = getAssociatedTokenAddressSync(mint, bondingCurve, true);

  const methods = program.methods as unknown as LaunchMethodRecord;
  const tx = await methods
    .launchSlot({
      name:        params.name,
      ticker:      params.ticker,
      imageUri:    params.imageUri,
      metadataUri,
      model:       { [params.model]: {} },
    })
    .accounts({
      creator:                wallet.publicKey,
      mint,
      vaultTokenAccount,
      slotMetadata,
      bondingCurveVault:      bondingCurve,
      feeVault,
      jackpotVault,
      metadata,
      tokenMetadataProgram:   TOKEN_METADATA_PROGRAM_ID,
      associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      tokenProgram:           TOKEN_PROGRAM_ID,
      systemProgram:          SystemProgram.programId,
      rent:                   SYSVAR_RENT_PUBKEY,
    })
    .transaction();

  // Anchor 0.32.1 .signers() doesn't propagate with 1.0.0 IDL — sign manually
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
  tx.feePayer       = wallet.publicKey;
  tx.recentBlockhash = blockhash;

  // Wallet signs for creator; mintKeypair signs for the new mint account
  const signed = await wallet.signTransaction(tx);
  signed.partialSign(mintKeypair);

  const rawTx = signed.serialize();
  const signature = await connection.sendRawTransaction(rawTx);
  await connection.confirmTransaction({ signature, blockhash, lastValidBlockHeight }, "confirmed");

  return { mint: mint.toBase58(), signature, metadataUri };
}
