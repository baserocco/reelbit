"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import { ArrowDownUp, Wallet, AlertTriangle, ExternalLink } from "lucide-react";
import { PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
import type { AnchorWallet } from "@solana/wallet-adapter-react";
import { cn, formatSol } from "@/lib/utils";
import { MAX_WALLET_PCT } from "@/lib/constants";
import {
  buyTokens,
  sellTokens,
  fetchBondingCurve,
  calcTokensOut,
  calcSolOut,
  type BondingCurveState,
} from "@/lib/tokenLaunch";
import type { SlotToken } from "@/types/slot";

interface Props {
  slot: SlotToken;
  solPrice?: number;
  onTradeComplete?: () => void;
}

type Mode = "buy" | "sell";

const QUICK_AMOUNTS_SOL = [0.1, 0.5, 1, 5];

export function BuySellPanel({ slot, onTradeComplete }: Props) {
  const { authenticated, login } = usePrivy();
  const { wallets } = useWallets();
  const [mode, setMode] = useState<Mode>("buy");
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [txSig, setTxSig] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [curve, setCurve] = useState<BondingCurveState | null>(null);

  // Fetch live bonding curve state when component mounts
  useEffect(() => {
    if (!authenticated || !wallets[0]) return;
    const wallet = wallets[0];
    fetchBondingCurve(wallet as unknown as AnchorWallet, new PublicKey(slot.mint))
      .then(setCurve)
      .catch(() => {});
  }, [authenticated, wallets, slot.mint]);

  const numAmount = parseFloat(amount) || 0;

  // Live quotes using on-chain reserves (fallback to static if not loaded)
  const tokenOutEstimate: bigint = (() => {
    if (!numAmount) return 0n;
    const lamports = BigInt(Math.floor(numAmount * LAMPORTS_PER_SOL));
    const vs = curve?.virtualSol ?? BigInt(30 * LAMPORTS_PER_SOL);
    const vt = curve?.virtualTokens ?? BigInt("1073000191000000");
    return calcTokensOut(vs, vt, lamports);
  })();

  const solOutEstimate: bigint = (() => {
    if (!numAmount) return 0n;
    const tokens = BigInt(Math.floor(numAmount * 1e6));
    const vs = curve?.virtualSol ?? BigInt(30 * LAMPORTS_PER_SOL);
    const vt = curve?.virtualTokens ?? BigInt("1073000191000000");
    const gross = calcSolOut(vs, vt, tokens);
    return gross - (gross * 100n / 10_000n); // minus 1% fee
  })();

  async function handleTrade() {
    setError(null);
    setTxSig(null);

    if (!authenticated) { login(); return; }
    if (!numAmount || !wallets[0]) return;

    setLoading(true);
    try {
      const wallet = wallets[0] as unknown as AnchorWallet;
      const mint = new PublicKey(slot.mint);

      if (mode === "buy") {
        const lamports = BigInt(Math.floor(numAmount * LAMPORTS_PER_SOL));
        const { signature } = await buyTokens(wallet, mint, lamports);
        setTxSig(signature);
        const updated = await fetchBondingCurve(wallet, mint);
        if (updated) setCurve(updated);
      } else {
        const tokens = BigInt(Math.floor(numAmount * 1e6));
        const { signature } = await sellTokens(wallet, mint, tokens);
        setTxSig(signature);
        const updated = await fetchBondingCurve(wallet, mint);
        if (updated) setCurve(updated);
      }
      onTradeComplete?.();

      setAmount("");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      // Extract clean anchor error message if present
      const match = msg.match(/Error Message: (.+)/);
      setError(match ? match[1] : msg.slice(0, 120));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-5 space-y-4">
      {/* Mode toggle */}
      <div className="flex rounded-xl bg-white/[0.04] p-1 gap-1">
        {(["buy", "sell"] as Mode[]).map((m) => (
          <button
            key={m}
            onClick={() => { setMode(m); setAmount(""); setError(null); setTxSig(null); }}
            className={cn(
              "flex-1 rounded-lg py-2 text-sm font-medium capitalize transition-all",
              mode === m
                ? m === "buy"
                  ? "bg-green-500/20 text-green-400"
                  : "bg-red-500/20 text-red-400"
                : "text-white/40 hover:text-white"
            )}
          >
            {m}
          </button>
        ))}
      </div>

      {/* Amount input */}
      <div className="space-y-2">
        <label className="text-xs text-white/40">
          {mode === "buy" ? "SOL to spend" : `${slot.ticker} to sell`}
        </label>
        <div className="relative">
          <input
            type="number"
            value={amount}
            onChange={(e) => { setAmount(e.target.value); setError(null); setTxSig(null); }}
            placeholder="0.00"
            min={0}
            step={mode === "buy" ? "0.1" : "1000"}
            className="w-full rounded-xl bg-white/[0.04] border border-white/5 px-4 py-3 pr-16 text-lg font-mono text-white placeholder:text-white/20 outline-none focus:border-purple-500/40 transition-colors"
          />
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-white/40">
            {mode === "buy" ? "SOL" : slot.ticker}
          </span>
        </div>

        {mode === "buy" && (
          <div className="flex gap-2">
            {QUICK_AMOUNTS_SOL.map((q) => (
              <button
                key={q}
                onClick={() => setAmount(String(q))}
                className="flex-1 rounded-lg bg-white/[0.04] hover:bg-white/[0.07] py-1.5 text-xs text-white/50 hover:text-white transition-colors"
              >
                {q} SOL
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Output estimate */}
      {numAmount > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl bg-white/[0.03] border border-white/5 px-4 py-3 space-y-1"
        >
          <div className="flex justify-between text-sm">
            <span className="text-white/40">You receive</span>
            <span className="text-white font-medium">
              {mode === "buy"
                ? `${(Number(tokenOutEstimate) / 1e6).toLocaleString(undefined, { maximumFractionDigits: 0 })} ${slot.ticker}`
                : formatSol(Number(solOutEstimate))}
            </span>
          </div>
          <div className="flex justify-between text-xs text-white/30">
            <span>1% fee (0.5% creator + 0.5% platform)</span>
            <span>1% slippage guard</span>
          </div>
        </motion.div>
      )}

      {/* Wallet cap warning */}
      {mode === "buy" && numAmount > 2 && (
        <div className="flex items-start gap-2 rounded-xl bg-yellow-500/10 border border-yellow-500/20 p-3 text-xs text-yellow-300">
          <AlertTriangle size={13} className="mt-0.5 shrink-0" />
          <span>Max {MAX_WALLET_PCT}% of supply per wallet. Large buys may be rejected.</span>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="rounded-xl bg-red-500/10 border border-red-500/20 p-3 text-xs text-red-300">
          {error}
        </div>
      )}

      {/* Success */}
      {txSig && (
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 rounded-xl bg-green-500/10 border border-green-500/20 p-3 text-xs text-green-300"
        >
          <span>Transaction confirmed!</span>
          <a
            href={`https://explorer.solana.com/tx/${txSig}?cluster=devnet`}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-auto flex items-center gap-1 underline hover:no-underline"
          >
            Explorer <ExternalLink size={10} />
          </a>
        </motion.div>
      )}

      {/* CTA */}
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.97 }}
        onClick={handleTrade}
        disabled={loading || (authenticated && !numAmount)}
        className={cn(
          "w-full flex items-center justify-center gap-2 rounded-xl py-3 font-semibold text-white transition-all",
          loading || (authenticated && !numAmount)
            ? "opacity-60 cursor-not-allowed bg-white/10"
            : mode === "buy"
            ? "bg-green-600 hover:bg-green-500"
            : "bg-red-600 hover:bg-red-500"
        )}
      >
        {loading ? (
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 0.8, ease: "linear" }}
            className="w-4 h-4 rounded-full border-2 border-white border-t-transparent"
          />
        ) : (
          <>
            {authenticated ? <ArrowDownUp size={15} /> : <Wallet size={15} />}
            {authenticated
              ? mode === "buy" ? `Buy ${slot.ticker}` : `Sell ${slot.ticker}`
              : "Connect Wallet"}
          </>
        )}
      </motion.button>
    </div>
  );
}
