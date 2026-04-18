/**
 * Pre-graduation bonding curve trading API.
 *
 * Returns unsigned, serialized Solana transactions that any wallet, bot, or
 * trading terminal (Photon, Bullx, Trojan, BonkBot…) can sign and submit.
 * Pattern mirrors pump.fun's /trade-local endpoint.
 */

import {
  Connection,
  PublicKey,
  TransactionInstruction,
  Transaction,
  SystemProgram,
  AccountMeta,
} from "@solana/web3.js";

// ── Constants ─────────────────────────────────────────────────────────────────

const PROGRAM_ID = new PublicKey("5vy9vYy9A6wAy59nRvvpGd5drVwQU1JYqRuSg7xQZDD8");
const TOKEN_PROGRAM_ID = new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");
const ASSOCIATED_TOKEN_PROGRAM_ID = new PublicKey("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJe1bRf");
const SYSVAR_RENT_PUBKEY = new PublicKey("SysvarRent111111111111111111111111111111111");

// Exact discriminators from IDL (sha256("global:<name>")[0..8])
const BUY_DISCRIMINATOR  = Buffer.from([189, 21, 230, 133, 247,   2, 110,  42]);
const SELL_DISCRIMINATOR = Buffer.from([114, 242,  25,  12,  62, 126,  92,   2]);
// Account discriminators
const BONDING_CURVE_DISCRIMINATOR = Buffer.from([252, 234,  66, 111,  20, 145, 209, 189]);

const VIRTUAL_SOL_INIT    = BigInt(30 * 1_000_000_000);
const VIRTUAL_TOKENS_INIT = BigInt("1073000191000000");
const LAMPORTS_PER_SOL    = 1_000_000_000n;

// ── PDA helpers ───────────────────────────────────────────────────────────────

export function slotMetadataPda(mint: PublicKey): PublicKey {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("slot_metadata"), mint.toBuffer()],
    PROGRAM_ID,
  )[0];
}

export function bondingCurvePda(mint: PublicKey): PublicKey {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("bonding_curve"), mint.toBuffer()],
    PROGRAM_ID,
  )[0];
}

export function walletCapPda(mint: PublicKey, wallet: PublicKey): PublicKey {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("wallet_cap"), mint.toBuffer(), wallet.toBuffer()],
    PROGRAM_ID,
  )[0];
}

export function ata(mint: PublicKey, owner: PublicKey): PublicKey {
  return PublicKey.findProgramAddressSync(
    [owner.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), mint.toBuffer()],
    ASSOCIATED_TOKEN_PROGRAM_ID,
  )[0];
}

// ── On-chain state ────────────────────────────────────────────────────────────

export interface BondingCurveState {
  creator: PublicKey;
  virtualSol: bigint;
  virtualTokens: bigint;
  realSol: bigint;
  realTokens: bigint;
  graduated: boolean;
}

/** Parse BondingCurveVault account data (105 bytes). */
function parseBondingCurve(data: Buffer): BondingCurveState {
  // skip 8-byte discriminator, 32-byte mint
  const creator      = new PublicKey(data.subarray(40, 72));
  const virtualSol   = data.readBigUInt64LE(72);
  const virtualTokens = data.readBigUInt64LE(80);
  const realSol      = data.readBigUInt64LE(88);
  const realTokens   = data.readBigUInt64LE(96);
  // bump at 104, graduated not stored here (comes from slot_metadata)
  return { creator, virtualSol, virtualTokens, realSol, realTokens, graduated: false };
}

export async function fetchBondingCurveState(
  connection: Connection,
  mint: PublicKey,
): Promise<BondingCurveState | null> {
  const vault = bondingCurvePda(mint);
  const info = await connection.getAccountInfo(vault);
  if (!info || info.data.length < 105) return null;
  const disc = info.data.subarray(0, 8);
  if (!disc.equals(BONDING_CURVE_DISCRIMINATOR)) return null;
  return parseBondingCurve(Buffer.from(info.data));
}

// ── Bonding curve math ────────────────────────────────────────────────────────

export function calcTokensOut(vs: bigint, vt: bigint, solIn: bigint): bigint {
  return (vt * solIn) / (vs + solIn);
}

export function calcSolOut(vs: bigint, vt: bigint, tokensIn: bigint): bigint {
  return (vs * tokensIn) / (vt + tokensIn);
}

/** Token price in SOL (6-decimal tokens → SOL per 1 whole token). */
export function pricePerToken(vs: bigint, vt: bigint): number {
  // price = virtual_sol / virtual_tokens (both raw), then adjust for decimals
  // token has 6 decimals so 1 token = 1e6 raw units
  return Number(vs) / Number(vt);  // SOL lamports per raw token unit
}

export function mcapSol(vs: bigint, vt: bigint, totalSupply = 1_000_000_000_000_000n): number {
  // price × totalSupply in SOL
  const price = pricePerToken(vs, vt);
  return (price * Number(totalSupply)) / 1e9;  // in SOL
}

// ── Instruction builders ──────────────────────────────────────────────────────

function encodeU64LE(n: bigint): Buffer {
  const b = Buffer.alloc(8);
  b.writeBigUInt64LE(n);
  return b;
}

export function buildBuyInstruction(
  mint: PublicKey,
  buyer: PublicKey,
  creator: PublicKey,
  solAmount: bigint,
  minTokensOut: bigint,
): TransactionInstruction {
  const bondingCurve    = bondingCurvePda(mint);
  const slotMetadata    = slotMetadataPda(mint);
  const walletCap       = walletCapPda(mint, buyer);
  const vaultTokenAcct  = ata(mint, bondingCurve);
  const buyerTokenAcct  = ata(mint, buyer);

  const data = Buffer.concat([
    BUY_DISCRIMINATOR,
    encodeU64LE(solAmount),
    encodeU64LE(minTokensOut),
  ]);

  const keys: AccountMeta[] = [
    { pubkey: buyer,                    isSigner: true,  isWritable: true  },
    { pubkey: mint,                     isSigner: false, isWritable: false },
    { pubkey: slotMetadata,             isSigner: false, isWritable: true  },
    { pubkey: bondingCurve,             isSigner: false, isWritable: true  },
    { pubkey: vaultTokenAcct,           isSigner: false, isWritable: true  },
    { pubkey: walletCap,                isSigner: false, isWritable: true  },
    { pubkey: buyerTokenAcct,           isSigner: false, isWritable: true  },
    { pubkey: creator,                  isSigner: false, isWritable: true  },
    { pubkey: ASSOCIATED_TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    { pubkey: TOKEN_PROGRAM_ID,         isSigner: false, isWritable: false },
    { pubkey: SystemProgram.programId,  isSigner: false, isWritable: false },
  ];

  return new TransactionInstruction({ programId: PROGRAM_ID, keys, data });
}

export function buildSellInstruction(
  mint: PublicKey,
  seller: PublicKey,
  creator: PublicKey,
  tokenAmount: bigint,
  minSolOut: bigint,
): TransactionInstruction {
  const bondingCurve    = bondingCurvePda(mint);
  const slotMetadata    = slotMetadataPda(mint);
  const walletCap       = walletCapPda(mint, seller);
  const vaultTokenAcct  = ata(mint, bondingCurve);
  const sellerTokenAcct = ata(mint, seller);

  const data = Buffer.concat([
    SELL_DISCRIMINATOR,
    encodeU64LE(tokenAmount),
    encodeU64LE(minSolOut),
  ]);

  const keys: AccountMeta[] = [
    { pubkey: seller,                   isSigner: true,  isWritable: true  },
    { pubkey: mint,                     isSigner: false, isWritable: false },
    { pubkey: slotMetadata,             isSigner: false, isWritable: true  },
    { pubkey: bondingCurve,             isSigner: false, isWritable: true  },
    { pubkey: vaultTokenAcct,           isSigner: false, isWritable: true  },
    { pubkey: walletCap,                isSigner: false, isWritable: true  },
    { pubkey: sellerTokenAcct,          isSigner: false, isWritable: true  },
    { pubkey: creator,                  isSigner: false, isWritable: true  },
    { pubkey: TOKEN_PROGRAM_ID,         isSigner: false, isWritable: false },
    { pubkey: SystemProgram.programId,  isSigner: false, isWritable: false },
  ];

  return new TransactionInstruction({ programId: PROGRAM_ID, keys, data });
}

// ── Transaction serializer ────────────────────────────────────────────────────

/**
 * Build an unsigned transaction and return it as base64.
 * The caller (wallet/bot/terminal) signs + submits.
 */
export async function buildUnsignedTx(
  connection: Connection,
  instruction: TransactionInstruction,
  feePayer: PublicKey,
): Promise<string> {
  const { blockhash } = await connection.getLatestBlockhash("confirmed");
  const tx = new Transaction();
  tx.feePayer = feePayer;
  tx.recentBlockhash = blockhash;
  tx.add(instruction);
  // Serialize without requiring all sigs — caller will sign
  return tx.serialize({ requireAllSignatures: false, verifySignatures: false }).toString("base64");
}
