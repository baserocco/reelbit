/**
 * Holder Dividend Cron — runs every 24 hours.
 *
 * For each graduated token that has accumulated dividend lamports (funded by 10%
 * of LP harvest fees), fetches the current top-100 holders via Helius DAS and
 * distributes SOL proportionally to their token balance.
 *
 * Flow per mint:
 *   1. Check accumulated > MIN_DIVIDEND_LAMPORTS
 *   2. Fetch holder snapshot from Helius DAS getTokenAccounts
 *   3. Sort by balance DESC, take top-100
 *   4. Compute each holder's share = their_balance / sum_of_top100_balances
 *   5. Send proportional SOL in batches of MAX_TRANSFERS_PER_TX wallets
 *   6. Record distribution in dividendStore
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
import fs from "fs";
import path from "path";
import { config } from "./config";
import { getAllDividends, addDividend, recordDistribution } from "./dividendStore";
import { getGraduatedWithPool } from "./themeStore";

// ── Config ────────────────────────────────────────────────────────────────────

const DIVIDEND_INTERVAL_MS     = 24 * 60 * 60 * 1_000;  // 24 hours
const MIN_DIVIDEND_LAMPORTS    = 10_000_000;              // 0.01 SOL minimum before distributing
const MAX_HOLDERS              = 100;                     // top-N holders to include
const MAX_TRANSFERS_PER_TX     = 20;                      // wallets per transaction (safe batch size)
const MIN_HOLDER_SHARE_LAMPORTS = 1_000;                  // dust filter — skip if share < 0.000001 SOL

// Helius DAS endpoint (mainnet or devnet depending on RPC config)
const HELIUS_DAS_URL = config.rpcUrl.includes("mainnet")
  ? `https://mainnet.helius-rpc.com/?api-key=${config.heliusApiKey}`
  : `https://devnet.helius-rpc.com/?api-key=${config.heliusApiKey}`;

// ── Types ─────────────────────────────────────────────────────────────────────

interface TokenAccountResult {
  address: string;
  mint:    string;
  owner:   string;
  amount:  string; // raw token units as string (6 decimals)
}

interface DasGetTokenAccountsResponse {
  result?: {
    total:          number;
    limit:          number;
    page:           number;
    token_accounts: TokenAccountResult[];
  };
  error?: { code: number; message: string };
}

// ── Keypair loader ────────────────────────────────────────────────────────────

let _authorityKeypair: Keypair | null = null;

function getAuthority(): Keypair {
  if (_authorityKeypair) return _authorityKeypair;
  const raw = JSON.parse(fs.readFileSync(config.migrationKeypairPath, "utf-8"));
  _authorityKeypair = Keypair.fromSecretKey(Uint8Array.from(raw));
  return _authorityKeypair;
}

// ── Helius DAS: top-100 holders ───────────────────────────────────────────────

/**
 * Fetches token accounts for a mint, paginates until we have enough to determine
 * the top MAX_HOLDERS, then returns them sorted by balance descending.
 *
 * Helius getTokenAccounts returns up to 1000 per page, sorted by balance by default.
 * We fetch page 1 (limit 100) — since it's sorted, page 1 = top 100 holders.
 */
async function fetchTopHolders(
  mint: string,
): Promise<Array<{ owner: string; rawAmount: bigint }>> {
  if (!config.heliusApiKey) {
    console.warn("[dividend] HELIUS_API_KEY not set — cannot fetch holders");
    return [];
  }

  const body = {
    jsonrpc: "2.0",
    id:      "holder-snapshot",
    method:  "getTokenAccounts",
    params:  {
      mint,
      limit:   MAX_HOLDERS,
      page:    1,
      options: { showZeroBalance: false },
    },
  };

  const res = await fetch(HELIUS_DAS_URL, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify(body),
  });

  if (!res.ok) {
    throw new Error(`Helius DAS HTTP ${res.status}: ${await res.text()}`);
  }

  const data = (await res.json()) as DasGetTokenAccountsResponse;

  if (data.error) {
    throw new Error(`Helius DAS error ${data.error.code}: ${data.error.message}`);
  }

  if (!data.result?.token_accounts?.length) return [];

  // Sort by amount descending (API may not guarantee order across pagination)
  const accounts = data.result.token_accounts
    .filter((a) => BigInt(a.amount) > 0n)
    .sort((a, b) => (BigInt(b.amount) > BigInt(a.amount) ? 1 : -1))
    .slice(0, MAX_HOLDERS);

  return accounts.map((a) => ({ owner: a.owner, rawAmount: BigInt(a.amount) }));
}

// ── Distribution ──────────────────────────────────────────────────────────────

async function distributeToHolders(
  connection: Connection,
  authority:  Keypair,
  mint:       string,
  lamports:   number,
): Promise<number> {
  const holders = await fetchTopHolders(mint);

  if (holders.length === 0) {
    console.log(`[dividend] ${mint.slice(0, 8)}… — no holders found`);
    return 0;
  }

  // Total balance held by top-N for proportional calculation
  const totalRaw = holders.reduce((sum, h) => sum + h.rawAmount, 0n);
  if (totalRaw === 0n) return 0;

  // Compute each holder's share
  const shares: Array<{ owner: PublicKey; lamports: number }> = [];
  for (const h of holders) {
    const share = Number((BigInt(lamports) * h.rawAmount) / totalRaw);
    if (share >= MIN_HOLDER_SHARE_LAMPORTS) {
      shares.push({ owner: new PublicKey(h.owner), lamports: share });
    }
  }

  if (shares.length === 0) {
    console.log(`[dividend] ${mint.slice(0, 8)}… — all shares below dust threshold`);
    return 0;
  }

  const totalToSend = shares.reduce((s, h) => s + h.lamports, 0);

  // Verify authority has enough balance
  const authorityBal = await connection.getBalance(authority.publicKey);
  const KEEP = Math.floor(0.05 * LAMPORTS_PER_SOL); // keep 0.05 SOL for fees
  if (authorityBal - totalToSend < KEEP) {
    console.warn(
      `[dividend] ${mint.slice(0, 8)}… — insufficient authority balance ` +
      `(have ${(authorityBal / LAMPORTS_PER_SOL).toFixed(4)}, need ${(totalToSend / LAMPORTS_PER_SOL).toFixed(4)})`,
    );
    return 0;
  }

  // Send in batches
  let totalSent = 0;
  const batches = chunk(shares, MAX_TRANSFERS_PER_TX);

  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    const tx    = new Transaction();
    for (const { owner, lamports: share } of batch) {
      tx.add(SystemProgram.transfer({
        fromPubkey: authority.publicKey,
        toPubkey:   owner,
        lamports:   share,
      }));
    }

    try {
      await sendAndConfirmTransaction(connection, tx, [authority], { commitment: "confirmed" });
      totalSent += batch.reduce((s, h) => s + h.lamports, 0);
    } catch (err: unknown) {
      console.error(
        `[dividend] ${mint.slice(0, 8)}… batch ${i + 1}/${batches.length} failed: ` +
        `${err instanceof Error ? err.message : err}`,
      );
      // Continue with remaining batches
    }
  }

  return totalSent;
}

function chunk<T>(arr: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < arr.length; i += size) result.push(arr.slice(i, i + size));
  return result;
}

// ── Run ───────────────────────────────────────────────────────────────────────

async function runDividendRound(connection: Connection): Promise<void> {
  const authority       = getAuthority();
  const dividendEntries = getAllDividends();

  // Only process mints that have graduated AND have accumulated lamports
  const graduatedMints = new Set(getGraduatedWithPool().map((t) => t.mint));

  const eligible = dividendEntries.filter(
    (e) => graduatedMints.has(e.mint) && e.accumulated >= MIN_DIVIDEND_LAMPORTS,
  );

  if (eligible.length === 0) {
    console.log("[dividend] No mints eligible for holder distribution");
    return;
  }

  console.log(`\n[dividend] ── Holder dividend round: ${eligible.length} mint(s) ──`);

  for (const entry of eligible) {
    console.log(
      `[dividend] ${entry.mint.slice(0, 8)}… — distributing ` +
      `${(entry.accumulated / LAMPORTS_PER_SOL).toFixed(6)} SOL to top-${MAX_HOLDERS} holders`,
    );

    try {
      const sent = await distributeToHolders(
        connection,
        authority,
        entry.mint,
        entry.accumulated,
      );

      if (sent > 0) {
        recordDistribution(entry.mint, sent);
        console.log(
          `[dividend] ✅ ${entry.mint.slice(0, 8)}… — sent ${(sent / LAMPORTS_PER_SOL).toFixed(6)} SOL`,
        );
      }
    } catch (err: unknown) {
      console.error(
        `[dividend] ❌ ${entry.mint.slice(0, 8)}… failed: ` +
        `${err instanceof Error ? err.message : err}`,
      );
    }
  }
}

// ── Cron starter ──────────────────────────────────────────────────────────────

export function startHolderDividendCron(connection: Connection): void {
  // Initial run after 10 minutes
  setTimeout(() => runDividendRound(connection).catch(console.error), 10 * 60 * 1_000);

  // Then every 24 hours
  setInterval(() => runDividendRound(connection).catch(console.error), DIVIDEND_INTERVAL_MS);

  console.log("[dividend] Holder dividend cron started (24h interval)");
}

// Re-export addDividend so lpHarvestCron can fund it
export { addDividend };
