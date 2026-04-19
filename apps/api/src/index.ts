import express, { Request, Response, NextFunction } from "express";
import path from "path";
import { Connection, PublicKey, Transaction, TransactionInstruction, sendAndConfirmTransaction } from "@solana/web3.js";
import { config } from "./config";
import { extractTokenLaunchEvents } from "./decoder";
import { handleGraduation } from "./migration";
import { getAllThemes, getTheme, getGraduatedThemes, setTheme, deriveColors } from "./themeStore";
import type { SlotModel } from "./themeStore";
import { triggerThemeGeneration } from "./slotTheme";
import { getPlayable, credit, debit, transfer, isSeenDeposit, markDepositSeen } from "./balanceStore";
import { getHouseKeypair, getHouseWalletAddress, sendSol, verifyDepositTx } from "./houseWallet";
import { getProfile, createProfile, updateProfile, getProfileByUserId, savePfpFile } from "./profileStore";
import type { HeliusWebhookPayload } from "./types";
import {
  fetchBondingCurveState,
  buildBuyInstruction,
  buildSellInstruction,
  buildUnsignedTx,
  calcTokensOut,
  calcSolOut,
  mcapSol,
  pricePerToken,
} from "./tradingApi";
import { startDistributionCron, FEE_SPLIT } from "./distributionCron";
import { startLpHarvestCron } from "./lpHarvestCron";
import { startHolderDividendCron } from "./holderDividendCron";
import { getAllDividends, getDividend } from "./dividendStore";
import { startMcapWatcher } from "./mcapWatcher";
import { getSolUsdPrice, lamportsToUsdc, usdcToLamports } from "./pythPrice";
import { swapSolToUsdc, USDC_MINT } from "./jupiterSwap";
import { USDC_UNIT, applyWelcomeBonus, recordWagering, getBalance } from "./balanceStore";

const app = express();
app.use(express.json({ limit: "10mb" }));

app.use("/images", express.static(path.resolve(process.cwd(), "data/images")));
app.use("/pfp",    express.static(path.resolve(process.cwd(), "data/pfp")));

const connection = new Connection(config.rpcUrl, "confirmed");

// ── Health ────────────────────────────────────────────────────────────────────

app.get("/health", (_req: Request, res: Response) => {
  res.json({ status: "ok", ts: Date.now() });
});

// ── Theme endpoints ───────────────────────────────────────────────────────────

app.get("/themes", (_req: Request, res: Response) => {
  res.json(getAllThemes());
});

app.get("/themes/graduated", (_req: Request, res: Response) => {
  res.json(getGraduatedThemes());
});

app.get("/themes/:mint", (req: Request, res: Response) => {
  const theme = getTheme(req.params.mint);
  if (!theme) return res.status(404).json({ error: "Theme not found" });
  res.json(theme);
});

app.post("/themes/trigger", async (req: Request, res: Response) => {
  const { mint, tokenName, tokenSymbol } = req.body as Record<string, string>;
  if (!mint || !tokenName || !tokenSymbol) {
    return res.status(400).json({ error: "mint, tokenName, tokenSymbol required" });
  }
  res.json({ status: "generating" });
  triggerThemeGeneration(mint, tokenName, tokenSymbol, false).catch(console.error);
});

// ── Profile endpoints ─────────────────────────────────────────────────────────

app.get("/profile/by-id/:userId", (req: Request, res: Response) => {
  const profile = getProfileByUserId(req.params.userId);
  if (!profile) return res.status(404).json({ error: "User ID not found" });
  res.json(profile);
});

app.get("/profile/:wallet", (req: Request, res: Response) => {
  const profile = getProfile(req.params.wallet);
  if (!profile) return res.status(404).json({ error: "Profile not found" });
  res.json(profile);
});

app.post("/profile", (req: Request, res: Response) => {
  const { wallet, username } = req.body as { wallet: string; username: string };
  if (!wallet || !username) return res.status(400).json({ error: "wallet and username required" });
  if (username.length < 3 || username.length > 20) return res.status(400).json({ error: "Username must be 3–20 chars" });
  if (!/^[a-zA-Z0-9_]+$/.test(username)) return res.status(400).json({ error: "Username: letters, numbers, underscore only" });
  const profile = createProfile(wallet, username);
  res.status(201).json(profile);
});

app.patch("/profile/:wallet", (req: Request, res: Response) => {
  const { wallet } = req.params;
  const { username } = req.body as { username: string };
  if (!username) return res.status(400).json({ error: "username required" });
  if (username.length < 3 || username.length > 20) return res.status(400).json({ error: "Username must be 3–20 chars" });
  if (!/^[a-zA-Z0-9_]+$/.test(username)) return res.status(400).json({ error: "Username: letters, numbers, underscore only" });
  try {
    const profile = updateProfile(wallet, { username });
    res.json(profile);
  } catch (err) { res.status(404).json({ error: (err as Error).message }); }
});

app.post("/profile/:wallet/pfp/upload", (req: Request, res: Response) => {
  const { wallet } = req.params;
  const { base64, ext } = req.body as { base64: string; ext: string };
  if (!base64 || !ext) return res.status(400).json({ error: "base64 and ext required" });
  if (base64.length > 5_000_000) return res.status(413).json({ error: "Image too large (max ~3.5 MB)" });
  if (!getProfile(wallet)) return res.status(404).json({ error: "Create a profile first" });
  try {
    const filename = savePfpFile(wallet, base64, ext);
    const pfpUrl = `${config.serverBaseUrl}/pfp/${filename}`;
    const profile = updateProfile(wallet, { pfpUrl, pfpType: "upload", nftMint: null });
    res.json(profile);
  } catch (err) { res.status(500).json({ error: (err as Error).message }); }
});

app.post("/profile/:wallet/pfp/nft", async (req: Request, res: Response) => {
  const { wallet } = req.params;
  const { mint } = req.body as { mint: string };
  if (!mint) return res.status(400).json({ error: "mint required" });
  if (!getProfile(wallet)) return res.status(404).json({ error: "Create a profile first" });
  try {
    const imageUrl = await fetchNftImage(mint);
    const profile = updateProfile(wallet, { pfpUrl: imageUrl, pfpType: "nft", nftMint: mint });
    res.json(profile);
  } catch (err) { res.status(400).json({ error: (err as Error).message }); }
});

async function fetchNftImage(mintAddress: string): Promise<string> {
  const key = config.heliusApiKey;
  if (!key) throw new Error("Helius API key not configured");
  const res = await fetch(`https://mainnet.helius-rpc.com/?api-key=${key}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: "nft-pfp", method: "getAsset", params: { id: mintAddress } }),
  });
  const json = await res.json() as { result?: { content?: { links?: { image?: string }; files?: { uri?: string; cdn_uri?: string }[]; json_uri?: string } } };
  const content = json.result?.content;
  if (!content) throw new Error("NFT not found");

  const direct = content.links?.image ?? content.files?.[0]?.cdn_uri ?? content.files?.[0]?.uri;
  if (direct) return direct;

  if (content.json_uri) {
    const metaRes = await fetch(content.json_uri, { signal: AbortSignal.timeout(10_000) });
    const meta = await metaRes.json() as { image?: string };
    if (meta.image) return meta.image;
  }
  throw new Error("Could not extract image from NFT metadata");
}

// ── House wallet ──────────────────────────────────────────────────────────────

app.get("/house-wallet", (_req: Request, res: Response) => {
  res.json({ address: getHouseWalletAddress() });
});

// ── Metaplex token metadata JSON ──────────────────────────────────────────────
// Served as the `metadata_uri` during launch_slot so tokens appear in all wallets/DEXes.

app.get("/metadata/:mint", (req: Request, res: Response) => {
  const theme = getTheme(req.params.mint);
  if (!theme) return res.status(404).json({ error: "Token not found" });
  res.setHeader("Cache-Control", "public, max-age=60");
  res.json({
    name: theme.tokenName,
    symbol: theme.tokenSymbol,
    description: `${theme.tokenName} ($${theme.tokenSymbol}) — a slot token on ReelBit. Trade on reelbit.fun`,
    image: theme.heroImageUrl ?? "",
    external_url: `https://reelbit.fun/slot/${req.params.mint}`,
    attributes: [
      { trait_type: "Slot Model", value: theme.slotModel },
      { trait_type: "Platform", value: "ReelBit" },
      { trait_type: "Graduated", value: theme.graduated ? "Yes" : "No" },
    ],
  });
});

// Pre-register a token before launch so /metadata/:mint is ready for the Metaplex URI
app.post("/themes/register", (req: Request, res: Response) => {
  const { mint, tokenName, tokenSymbol, imageUri, description, model } = req.body as {
    mint: string; tokenName: string; tokenSymbol: string;
    imageUri?: string; description?: string; model?: string;
  };
  if (!mint || !tokenName || !tokenSymbol) {
    return res.status(400).json({ error: "mint, tokenName, tokenSymbol required" });
  }
  const existing = getTheme(mint);
  if (existing) return res.json(existing);

  const colors = deriveColors(tokenSymbol);
  const theme = {
    mint,
    tokenName,
    tokenSymbol,
    slotModel: (model ?? "Classic3Reel") as SlotModel,
    graduated: false,
    status: "generating" as const,
    heroImageUrl: imageUri ?? null,
    bgImageUrl: null,
    primaryColor: colors.primary,
    accentColor: colors.accent,
    updatedAt: Date.now(),
  };
  setTheme(theme);
  res.status(201).json(theme);
});

// ── Fee constants ─────────────────────────────────────────────────────────────
// All fees are borne by the user; the platform never absorbs swap or gas costs.

const DEPOSIT_FEE_BPS      = 30;                // 0.30% — covers Jupiter gas + Solana tx fee
const WITHDRAWAL_FEE_USDC  = 100_000;           // $0.10 flat — covers house SOL send tx fee
const TRANSFER_FEE_BPS     = 100;               // 1.00% platform revenue on every transfer

const PLATFORM_REVENUE_KEY = "PLATFORM_REVENUE"; // internal balance store key for platform fees

// ── Balance endpoints ─────────────────────────────────────────────────────────
// All internal balances are in USDC micro-units (1 USDC = 1_000_000).

app.get("/balance/:wallet", (req: Request, res: Response) => {
  const entry = getBalance(req.params.wallet);
  res.json({ wallet: req.params.wallet, ...entry });
});

/** GET /sol-price — live SOL/USD from Pyth (used by wallet modal for conversion display) */
app.get("/sol-price", async (_req: Request, res: Response) => {
  const price = await getSolUsdPrice(connection);
  res.json({ price, mint: USDC_MINT });
});

/**
 * POST /deposit/confirm
 * Body: { txSignature, wallet }
 * 1. Verifies the SOL transfer to house wallet
 * 2. Swaps SOL → USDC via Jupiter
 * 3. Credits USDC balance
 * 4. Applies welcome bonus on first deposit (100% match, max $200, 35× wagering)
 */
app.post("/deposit/confirm", async (req: Request, res: Response) => {
  const { txSignature, wallet } = req.body as { txSignature: string; wallet: string };
  if (!txSignature || !wallet) {
    return res.status(400).json({ error: "txSignature and wallet required" });
  }
  if (isSeenDeposit(txSignature)) {
    return res.status(409).json({ error: "This transaction has already been credited" });
  }
  try {
    const { lamports } = await verifyDepositTx(connection, txSignature);
    markDepositSeen(txSignature);

    // Swap the received SOL to USDC (Jupiter routing fee already embedded in outAmount)
    const usdcSwapped  = await swapSolToUsdc(connection, lamports);

    // Deduct deposit fee (covers Jupiter gas reimbursement + Solana tx cost)
    const depositFee   = Math.floor(usdcSwapped * DEPOSIT_FEE_BPS / 10_000);
    const usdcCredited = usdcSwapped - depositFee;

    // Platform collects the fee
    credit(PLATFORM_REVENUE_KEY, depositFee);
    const entry        = credit(wallet, usdcCredited);

    // Welcome bonus — one-time, first deposit only
    const bonusEntry = applyWelcomeBonus(wallet, usdcCredited);

    res.json({
      deposited:    usdcCredited,
      depositFee,
      balance:      bonusEntry.playable,
      bonus:        bonusEntry.bonus,
      bonusClaimed: bonusEntry.welcomeBonusClaimed && bonusEntry.bonus > 0,
    });
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

/**
 * POST /withdraw
 * Body: { wallet, usdcUnits, destination? }
 * Converts USDC μ-units back to SOL at current Pyth price and sends on-chain.
 */
app.post("/withdraw", async (req: Request, res: Response) => {
  const { wallet, usdcUnits, destination } = req.body as {
    wallet: string;
    usdcUnits: number;
    destination?: string;
  };
  if (!wallet || !usdcUnits) {
    return res.status(400).json({ error: "wallet and usdcUnits required" });
  }
  const to = destination ?? wallet;
  try {
    // Deduct flat withdrawal fee before converting — user pays the house gas cost
    const totalDebit     = usdcUnits + WITHDRAWAL_FEE_USDC;
    const entry          = debit(wallet, totalDebit);
    credit(PLATFORM_REVENUE_KEY, WITHDRAWAL_FEE_USDC);

    const lamports       = await usdcToLamports(connection, usdcUnits);
    const txSignature    = await sendSol(connection, to, lamports);
    res.json({ txSignature, balance: entry.playable, withdrawn: usdcUnits, withdrawalFee: WITHDRAWAL_FEE_USDC });
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

/**
 * POST /transfer
 * Body: { from, toUserId, usdcUnits }
 * Instant internal transfer — no blockchain tx, no gas.
 */
app.post("/transfer", (req: Request, res: Response) => {
  const { from, toUserId, usdcUnits } = req.body as { from: string; toUserId: string; usdcUnits: number };
  if (!from || !toUserId || !usdcUnits) {
    return res.status(400).json({ error: "from, toUserId, usdcUnits required" });
  }
  const recipient = getProfileByUserId(toUserId);
  if (!recipient) return res.status(404).json({ error: `User #${toUserId.replace(/^#/, "")} not found` });
  if (recipient.wallet === from) return res.status(400).json({ error: "Cannot transfer to yourself" });
  try {
    // 1% platform tax deducted from sender before the transfer
    const platformCut  = Math.floor(usdcUnits * TRANSFER_FEE_BPS / 10_000);
    const netTransfer  = usdcUnits - platformCut;

    // Debit full amount from sender, credit net to recipient and fee to platform
    debit(from, usdcUnits);
    credit(recipient.wallet, netTransfer);
    credit(PLATFORM_REVENUE_KEY, platformCut);

    res.json({
      balance:     getPlayable(from),
      transferred: netTransfer,
      transferFee: platformCut,
      recipient:   { userId: recipient.userId, username: recipient.username },
    });
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

// ── Internal endpoints (game-server ↔ api) ────────────────────────────────────

function requireInternal(req: Request, res: Response, next: NextFunction) {
  if (req.headers["x-internal-secret"] !== config.internalSecret) {
    return res.status(403).json({ error: "Forbidden" });
  }
  next();
}

app.post("/internal/debit", requireInternal, (req: Request, res: Response) => {
  const { wallet, usdcUnits } = req.body as { wallet: string; usdcUnits: number };
  try {
    const entry = debit(wallet, usdcUnits);
    recordWagering(wallet, usdcUnits); // track toward bonus wagering requirement
    res.json({ balance: entry.playable, bonus: entry.bonus });
  } catch (err) {
    res.status(402).json({ error: (err as Error).message });
  }
});

app.post("/internal/credit", requireInternal, (req: Request, res: Response) => {
  const { wallet, usdcUnits } = req.body as { wallet: string; usdcUnits: number };
  const entry = credit(wallet, usdcUnits);
  res.json({ balance: entry.playable, bonus: entry.bonus });
});

// Discriminator: sha256("global:pay_jackpot")[0..8] = [162,254,59,123,187,96,225,171]
const PAY_JACKPOT_DISCRIMINATOR = Buffer.from([162, 254, 59, 123, 187, 96, 225, 171]);
const TOKEN_LAUNCH_PROGRAM_ID   = new PublicKey(config.tokenLaunchProgramId);

function buildPayJackpotInstruction(mint: PublicKey, winner: PublicKey): TransactionInstruction {
  const authority = getHouseKeypair().publicKey;

  const [platformConfig] = PublicKey.findProgramAddressSync(
    [Buffer.from("platform_config")],
    TOKEN_LAUNCH_PROGRAM_ID,
  );
  const [jackpotVault] = PublicKey.findProgramAddressSync(
    [Buffer.from("jackpot_vault"), mint.toBuffer()],
    TOKEN_LAUNCH_PROGRAM_ID,
  );

  return new TransactionInstruction({
    programId: TOKEN_LAUNCH_PROGRAM_ID,
    data: PAY_JACKPOT_DISCRIMINATOR,
    keys: [
      { pubkey: authority,      isSigner: true,  isWritable: true  }, // authority
      { pubkey: mint,           isSigner: false, isWritable: false }, // mint
      { pubkey: platformConfig, isSigner: false, isWritable: false }, // platform_config
      { pubkey: jackpotVault,   isSigner: false, isWritable: true  }, // jackpot_vault
      { pubkey: winner,         isSigner: false, isWritable: true  }, // winner
      { pubkey: new PublicKey("11111111111111111111111111111111"), isSigner: false, isWritable: false }, // system_program
    ],
  });
}

app.post("/internal/jackpot-won", requireInternal, async (req: Request, res: Response) => {
  const { wallet, mint: mintStr } = req.body as { wallet: string; mint: string; sessionId: string };
  if (!wallet || !mintStr) {
    return res.status(400).json({ error: "wallet and mint required" });
  }

  let mint: PublicKey;
  let winner: PublicKey;
  try {
    mint   = new PublicKey(mintStr);
    winner = new PublicKey(wallet);
  } catch {
    return res.status(400).json({ error: "Invalid mint or wallet address" });
  }

  try {
    const keypair = getHouseKeypair();
    const ix      = buildPayJackpotInstruction(mint, winner);
    const tx      = new Transaction().add(ix);
    const txSignature = await sendAndConfirmTransaction(connection, tx, [keypair]);
    console.log(`[jackpot] Paid jackpot to ${wallet} for mint ${mintStr} — ${txSignature}`);
    res.json({ txSignature });
  } catch (err) {
    console.error("[jackpot] pay_jackpot failed:", err);
    res.status(500).json({ error: (err as Error).message });
  }
});

// ── Helius webhook ────────────────────────────────────────────────────────────

app.post("/webhooks/helius", async (req: Request, res: Response) => {
  const payloads: HeliusWebhookPayload[] = Array.isArray(req.body) ? req.body : [req.body];
  res.status(200).json({ received: payloads.length });

  for (const payload of payloads) {
    if (payload.transactionError) continue;
    const touchesLaunch = payload.instructions.some(
      (ix) => ix.programId === config.tokenLaunchProgramId,
    );
    if (!touchesLaunch) continue;

    try {
      const events = await extractTokenLaunchEvents(payload, connection);

      if (events.bought) {
        const { mint, solIn, tokensOut, realSol } = events.bought;
        console.log(
          `[buy] ${mint.slice(0, 8)} — ${Number(solIn) / 1e9} SOL → ` +
          `${Number(tokensOut) / 1e6} tokens (vault: ${Number(realSol) / 1e9} SOL)`,
        );
      }

      if (events.graduated) {
        await handleGraduation(events.graduated, connection);
        triggerThemeGeneration(
          events.graduated.mint,
          events.graduated.mint.slice(0, 8),
          "TOKEN",
          true,
        ).catch(console.error);
      }
    } catch (err) {
      console.error("[webhook] Error processing tx:", payload.signature, err);
    }
  }
});

// ── Fee info ──────────────────────────────────────────────────────────────────
// Returns current fee architecture so frontends can display it accurately.

app.get("/fees/info", (_req: Request, res: Response) => {
  res.json({
    prebond: {
      tiers: [
        { progressPct: "0–20",  feeBps: 200, feeDisplay: "2.0%" },
        { progressPct: "20–60", feeBps: 150, feeDisplay: "1.5%" },
        { progressPct: "60–100",feeBps: 100, feeDisplay: "1.0%" },
      ],
      description: "Fee rate decreases as token approaches graduation — rewards the final push",
    },
    postbond: {
      source: "Meteora DLMM dynamic LP fees",
      description: "LP fees harvested every 24h and split via same structure",
    },
    split: FEE_SPLIT,
    distributionInterval: "30 minutes (minimum)",
    distributionThreshold: "0.05 SOL minimum to trigger distribution",
    jackpotExpiry: {
      days: 30,
      rule: "If token does not graduate within 30 days, the 30% jackpot allocation redirects to platform. Creator still receives 25% indefinitely.",
    },
    graduation: {
      threshold: "85 SOL in bonding curve vault",
      platformSponsorship: "Platform tops up jackpot to minimum $3,000 USD value if 30-day window elapsed before graduation",
    },
  });
});

// ── Pre-graduation trading API (pump.fun-compatible) ─────────────────────────
//
// Trading terminals (Photon, Bullx, Trojan, BonkBot) call these endpoints to
// discover tokens and build transactions they sign + submit directly.
//
// GET  /tokens              — list all bonding-curve tokens with price/mcap
// GET  /tokens/:mint        — single token with live on-chain curve state
// POST /tokens/:mint/buy    — returns unsigned base64 tx (caller signs + sends)
// POST /tokens/:mint/sell   — returns unsigned base64 tx (caller signs + sends)

app.get("/tokens", (_req: Request, res: Response) => {
  const themes = getAllThemes().filter((t) => !t.graduated);
  res.json(themes.map((t) => ({
    mint:        t.mint,
    name:        t.tokenName,
    symbol:      t.tokenSymbol,
    model:       t.slotModel,
    image:       t.heroImageUrl ?? "",
    graduated:   t.graduated,
    metadataUri: `${config.serverBaseUrl}/metadata/${t.mint}`,
    program:     config.tokenLaunchProgramId,
  })));
});

app.get("/tokens/:mint", async (req: Request, res: Response) => {
  const { mint: mintStr } = req.params;
  let mint: PublicKey;
  try { mint = new PublicKey(mintStr); } catch { return res.status(400).json({ error: "Invalid mint address" }); }

  const theme = getTheme(mintStr);
  if (!theme) return res.status(404).json({ error: "Token not found" });

  const curve = await fetchBondingCurveState(connection, mint);
  const vs = curve?.virtualSol   ?? BigInt(30 * 1_000_000_000);
  const vt = curve?.virtualTokens ?? BigInt("1073000191000000");
  const rs = curve?.realSol      ?? 0n;

  res.json({
    mint:           mintStr,
    name:           theme.tokenName,
    symbol:         theme.tokenSymbol,
    model:          theme.slotModel,
    image:          theme.heroImageUrl ?? "",
    description:    `${theme.tokenName} ($${theme.tokenSymbol}) — slot token on ReelBit`,
    graduated:      theme.graduated,
    metadataUri:    `${config.serverBaseUrl}/metadata/${mintStr}`,
    program:        config.tokenLaunchProgramId,
    bondingCurve: curve ? {
      creator:       curve.creator.toBase58(),
      virtualSol:    curve.virtualSol.toString(),
      virtualTokens: curve.virtualTokens.toString(),
      realSol:       curve.realSol.toString(),
      realTokens:    curve.realTokens.toString(),
      pricePerTokenSol:  pricePerToken(vs, vt),
      mcapSol:           mcapSol(vs, vt),
      progressPct:       Math.min(100, Math.round(Number(rs) / 85_000_000_000 * 100)),
    } : null,
  });
});

/**
 * Build an unsigned buy transaction.
 * Body: { wallet: string, solAmount: string|number, slippageBps?: number }
 * Returns: { transaction: "<base64>", tokensOut: string, minTokensOut: string }
 */
app.post("/tokens/:mint/buy", async (req: Request, res: Response) => {
  const { mint: mintStr } = req.params;
  const { wallet, solAmount, slippageBps = 100 } = req.body as {
    wallet: string; solAmount: string | number; slippageBps?: number;
  };

  if (!wallet || !solAmount) return res.status(400).json({ error: "wallet and solAmount required" });

  let mint: PublicKey;
  let buyer: PublicKey;
  try { mint = new PublicKey(mintStr); buyer = new PublicKey(wallet); }
  catch { return res.status(400).json({ error: "Invalid mint or wallet address" }); }

  const solLamports = BigInt(Math.round(Number(solAmount)));
  if (solLamports <= 0n) return res.status(400).json({ error: "solAmount must be positive" });

  const curve = await fetchBondingCurveState(connection, mint);
  if (!curve) return res.status(404).json({ error: "Bonding curve not found for this mint" });
  if (curve.graduated) return res.status(400).json({ error: "Token has graduated — trade on DEX" });

  const tokensOut    = calcTokensOut(curve.virtualSol, curve.virtualTokens, solLamports);
  const minTokensOut = (tokensOut * BigInt(10_000 - slippageBps)) / 10_000n;

  const ix = buildBuyInstruction(mint, buyer, curve.creator, solLamports, minTokensOut);
  const transaction = await buildUnsignedTx(connection, ix, buyer);

  res.json({ transaction, tokensOut: tokensOut.toString(), minTokensOut: minTokensOut.toString() });
});

/**
 * Build an unsigned sell transaction.
 * Body: { wallet: string, tokenAmount: string|number, slippageBps?: number }
 * Returns: { transaction: "<base64>", solOut: string, minSolOut: string }
 */
app.post("/tokens/:mint/sell", async (req: Request, res: Response) => {
  const { mint: mintStr } = req.params;
  const { wallet, tokenAmount, slippageBps = 100 } = req.body as {
    wallet: string; tokenAmount: string | number; slippageBps?: number;
  };

  if (!wallet || !tokenAmount) return res.status(400).json({ error: "wallet and tokenAmount required" });

  let mint: PublicKey;
  let seller: PublicKey;
  try { mint = new PublicKey(mintStr); seller = new PublicKey(wallet); }
  catch { return res.status(400).json({ error: "Invalid mint or wallet address" }); }

  const rawTokens = BigInt(Math.round(Number(tokenAmount)));
  if (rawTokens <= 0n) return res.status(400).json({ error: "tokenAmount must be positive" });

  const curve = await fetchBondingCurveState(connection, mint);
  if (!curve) return res.status(404).json({ error: "Bonding curve not found for this mint" });
  if (curve.graduated) return res.status(400).json({ error: "Token has graduated — trade on DEX" });

  const grossSol  = calcSolOut(curve.virtualSol, curve.virtualTokens, rawTokens);
  const creatorFee = (grossSol * 50n) / 10_000n;
  const netSol    = grossSol - creatorFee * 2n;
  const minSolOut = (netSol * BigInt(10_000 - slippageBps)) / 10_000n;

  const ix = buildSellInstruction(mint, seller, curve.creator, rawTokens, minSolOut);
  const transaction = await buildUnsignedTx(connection, ix, seller);

  res.json({ transaction, solOut: netSol.toString(), minSolOut: minSolOut.toString() });
});

// ── Dividend endpoints ────────────────────────────────────────────────────────

app.get("/dividends", (_req: Request, res: Response) => {
  res.json(getAllDividends());
});

app.get("/dividends/:mint", (req: Request, res: Response) => {
  const entry = getDividend(req.params.mint);
  if (!entry) return res.status(404).json({ error: "No dividend record for this mint" });
  res.json({ mint: req.params.mint, ...entry });
});

// ── Error handler ─────────────────────────────────────────────────────────────

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err);
  res.status(500).json({ error: err.message });
});

app.listen(config.port, () => {
  console.log(`[api] ReelBit API running on port ${config.port}`);
  startDistributionCron(connection);
  startLpHarvestCron(connection);
  startHolderDividendCron(connection);
  startMcapWatcher(connection);
});
