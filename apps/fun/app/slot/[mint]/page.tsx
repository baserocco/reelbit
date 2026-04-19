"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, ExternalLink, Copy, Zap, TrendingUp, BarChart2, RefreshCw } from "lucide-react";
import Link from "next/link";
import { BuySellPanel } from "@/components/slot/BuySellPanel";
import { BondingCurveChart } from "@/components/chart/BondingCurveChart";
import { cn, shortenAddress, formatUsd, graduationProgress } from "@/lib/utils";
import { SLOT_MODELS } from "@/lib/constants";
import type { SlotToken, TradeEvent } from "@/types/slot";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
const SOL_PRICE_USD = 150; // used for mcap/price display; replace with oracle feed in prod
const POLL_INTERVAL_MS = 12_000; // refresh curve every 12s

// ── API response type ─────────────────────────────────────────────────────────

interface TokenApiResponse {
  mint: string;
  name: string;
  symbol: string;
  model: string;
  image: string;
  graduated: boolean;
  bondingCurve: {
    creator: string;
    virtualSol: string;
    virtualTokens: string;
    realSol: string;
    realTokens: string;
    pricePerTokenSol: number;
    mcapSol: number;
    progressPct: number;
  } | null;
}

function mapApiToSlotToken(r: TokenApiResponse): SlotToken {
  const mcapSol  = r.bondingCurve?.mcapSol  ?? 0;
  const priceSol = r.bondingCurve?.pricePerTokenSol ?? 0;
  return {
    mint:       r.mint,
    name:       r.name,
    ticker:     r.symbol,
    imageUri:   r.image ?? "",
    model:      (r.model as SlotToken["model"]) ?? "Classic3Reel",
    creator:    r.bondingCurve?.creator ?? "",
    graduated:  r.graduated,
    mcapUsd:    mcapSol  * SOL_PRICE_USD,
    priceUsd:   priceSol * SOL_PRICE_USD * 1e9, // lamports per raw token → USD per whole token (6 dec)
    volume24h:  0, // not tracked yet
    createdAt:  Date.now(),
  };
}

function timeAgo(ts: number) {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60)   return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  return `${Math.floor(s / 3600)}h ago`;
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function SlotPage({ params }: { params: { mint: string } }) {
  const { mint } = params;

  const [slot,     setSlot]     = useState<SlotToken | null>(null);
  const [progress, setProgress] = useState(0);
  const [trades,   setTrades]   = useState<TradeEvent[]>([]); // eslint-disable-line @typescript-eslint/no-unused-vars
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState<string | null>(null);
  const [tradeKey, setTradeKey] = useState(0); // bumped after buy/sell to refresh BuySellPanel

  const fetchToken = useCallback(async () => {
    try {
      const res = await fetch(`${API}/tokens/${mint}`);
      if (!res.ok) {
        if (res.status === 404) throw new Error("Token not found");
        throw new Error(`API error ${res.status}`);
      }
      const data: TokenApiResponse = await res.json();
      const mapped = mapApiToSlotToken(data);
      setSlot(mapped);
      setProgress(graduationProgress(mapped.mcapUsd));
      setError(null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [mint]);

  // Initial load + poll for live curve updates
  useEffect(() => {
    fetchToken();
    const id = setInterval(fetchToken, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [fetchToken]);

  function onTradeComplete() {
    setTradeKey((k) => k + 1);
    // Brief delay so the chain confirms before we re-fetch price
    setTimeout(fetchToken, 3_000);
  }

  const model    = SLOT_MODELS.find((m) => m.id === slot?.model);
  const nearGrad = progress > 75 && !slot?.graduated;

  // ── Loading ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="relative min-h-screen flex items-center justify-center">
        <div className="grid-overlay opacity-30" />
        <div className="relative z-10 flex flex-col items-center gap-4">
          <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1.2, ease: "linear" }}
            className="w-10 h-10 rounded-full border-2 border-purple-500/30 border-t-purple-500" />
          <p className="font-orbitron text-xs text-white/30 tracking-widest">LOADING TOKEN</p>
        </div>
      </div>
    );
  }

  // ── Error ──────────────────────────────────────────────────────────────────

  if (error || !slot) {
    return (
      <div className="relative min-h-screen flex items-center justify-center">
        <div className="grid-overlay opacity-30" />
        <div className="relative z-10 text-center space-y-4">
          <p className="font-orbitron text-xl text-white/60">{error ?? "Token not found"}</p>
          <p className="font-rajdhani text-white/30 text-sm">Mint: {mint.slice(0, 16)}…</p>
          <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-purple-400 hover:text-purple-300 font-rajdhani font-semibold">
            <ArrowLeft size={14} /> Back to all slots
          </Link>
        </div>
      </div>
    );
  }

  // ── Main ───────────────────────────────────────────────────────────────────

  return (
    <div className="relative min-h-screen">
      <div className="grid-overlay opacity-30" />
      <div className="mx-auto max-w-7xl px-4 py-8 space-y-6 relative z-10">
        <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-white/30 hover:text-white transition-colors font-rajdhani font-semibold">
          <ArrowLeft size={14} /> All Slots
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-5">

            {/* Header card */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="card-panel p-6">
              <div className="flex items-start gap-5">
                <div className="relative w-[72px] h-[72px] shrink-0">
                  {slot.imageUri ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={slot.imageUri} alt={slot.name}
                      className="w-full h-full rounded-2xl object-cover border border-white/8" />
                  ) : (
                    <div className="w-full h-full rounded-2xl slot-img-placeholder border border-white/8 flex items-center justify-center">
                      <span className="font-orbitron text-lg font-black text-white/15 tracking-wider">
                        {slot.ticker.slice(0, 2)}
                      </span>
                    </div>
                  )}
                  {slot.graduated && (
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-green-500 border-2 border-casino-card flex items-center justify-center">
                      <Zap size={10} className="text-white" />
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h1 className="font-orbitron text-2xl font-black text-white">{slot.name}</h1>
                    <span className="badge badge-model">{model?.emoji} {model?.label}</span>
                    {slot.graduated && <span className="badge badge-graduated"><Zap size={8} /> GRADUATED</span>}
                    {nearGrad && <span className="badge badge-gold animate-pulse-gold">🔥 NEAR GRADUATION</span>}
                  </div>
                  <div className="flex items-center gap-4 mt-2 text-[12px] text-white/35 font-rajdhani font-semibold flex-wrap">
                    {slot.creator && <span>by {shortenAddress(slot.creator)}</span>}
                    <button onClick={() => navigator.clipboard.writeText(mint)}
                      className="flex items-center gap-1 hover:text-white transition-colors">
                      <Copy size={10} /> {shortenAddress(mint)}
                    </button>
                    <a href={`https://solscan.io/token/${mint}?cluster=devnet`} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1 hover:text-white transition-colors">
                      <ExternalLink size={10} /> Solscan
                    </a>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <p className="font-orbitron text-xl font-black text-white">
                    ${slot.priceUsd < 0.01 ? slot.priceUsd.toFixed(8) : slot.priceUsd.toFixed(4)}
                  </p>
                  <p className="font-orbitron text-[10px] text-white/25 tracking-wider mt-1">
                    MCAP {formatUsd(slot.mcapUsd / SOL_PRICE_USD, SOL_PRICE_USD)}
                  </p>
                  <button onClick={fetchToken} className="mt-1 text-white/20 hover:text-white/50 transition-colors">
                    <RefreshCw size={11} />
                  </button>
                </div>
              </div>
            </motion.div>

            {/* Stats row */}
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
              className="grid grid-cols-3 gap-3">
              {[
                { label: "Market Cap", value: formatUsd(slot.mcapUsd / SOL_PRICE_USD, SOL_PRICE_USD), icon: BarChart2 },
                { label: "24h Volume",  value: slot.volume24h > 0 ? formatUsd(slot.volume24h / SOL_PRICE_USD, SOL_PRICE_USD) : "—", icon: TrendingUp },
                { label: "Curve",       value: slot.graduated ? "GRADUATED" : `${progress.toFixed(1)}%`, icon: Zap },
              ].map(({ label, value, icon: Icon }) => (
                <div key={label} className="stat-box">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Icon size={10} className="text-purple-400" />
                    <p className="label">{label}</p>
                  </div>
                  <p className="value text-lg">{value}</p>
                </div>
              ))}
            </motion.div>

            {/* Bonding curve progress */}
            {!slot.graduated && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                className="card-panel p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-orbitron text-[10px] font-bold text-white/40 tracking-widest">GRADUATION PROGRESS</p>
                    <p className="font-rajdhani text-sm text-white/40 mt-0.5">$100,000 target · 85 SOL in vault</p>
                  </div>
                  <span className={cn("font-orbitron text-lg font-black",
                    nearGrad ? "text-gold" : "text-purple-400")}>
                    {progress.toFixed(1)}%
                  </span>
                </div>
                <div className="bonding-bar-track" style={{ height: 10, borderRadius: 5 }}>
                  <motion.div className={cn("bonding-bar-fill", nearGrad && "near-grad")}
                    style={{ height: "100%", width: `${Math.min(progress, 100)}%` }}
                    initial={{ width: 0 }} animate={{ width: `${Math.min(progress, 100)}%` }}
                    transition={{ duration: 1, ease: [0.34, 1.56, 0.64, 1] }} />
                </div>
                <div className="flex justify-between text-[11px] text-white/25 font-orbitron">
                  <span>${(slot.mcapUsd / 1000).toFixed(1)}K current</span>
                  <span className="text-white/40">$100K graduation</span>
                </div>
                <BondingCurveChart currentMcapUsd={slot.mcapUsd} />
              </motion.div>
            )}

            {/* Trade history */}
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
              className="card-panel overflow-hidden">
              <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between">
                <p className="font-orbitron text-[10px] font-bold text-white/50 tracking-widest">TRADE HISTORY</p>
                <span className="badge badge-model text-[9px]">{trades.length} trades</span>
              </div>
              {trades.length === 0 ? (
                <div className="px-5 py-8 text-center">
                  <p className="font-rajdhani text-white/25 text-sm">No trades recorded yet.</p>
                  <p className="font-rajdhani text-white/15 text-xs mt-1">New trades appear here automatically.</p>
                </div>
              ) : (
                <div>
                  {trades.map((t, i) => (
                    <motion.div key={t.txSig} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.2 + i * 0.06 }} className="trade-row">
                      <div className="flex items-center gap-3">
                        <span className={cn("badge text-[9px]",
                          t.type === "buy"
                            ? "bg-green-500/12 border-green-500/25 text-green-400"
                            : "bg-red-500/12 border-red-500/25 text-red-400")}>
                          {t.type.toUpperCase()}
                        </span>
                        <span className="font-mono text-[11px] text-white/40">{t.wallet}</span>
                      </div>
                      <div className="flex items-center gap-5 text-[11px] text-white/30 font-rajdhani font-semibold">
                        <span className="font-mono">
                          {t.type === "buy"
                            ? `${t.solAmount.toFixed(3)} SOL`
                            : `${(t.tokenAmount / 1_000_000).toFixed(1)}M $${slot.ticker}`}
                        </span>
                        <span className="text-white/20">{timeAgo(t.timestamp)}</span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          </div>

          {/* Right column */}
          <div className="space-y-4">
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
              <BuySellPanel key={tradeKey} slot={slot} onTradeComplete={onTradeComplete} />
            </motion.div>

            {/* Fee distribution */}
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}
              className="card-panel p-5 space-y-3">
              <p className="font-orbitron text-[10px] font-bold text-white/40 tracking-widest">FEE DISTRIBUTION</p>
              <div className="space-y-2">
                {[
                  { k: "Creator",          v: "25%", highlight: true },
                  { k: "Platform",         v: "25%", highlight: false },
                  { k: "Jackpot Pool",     v: "45%", highlight: false },
                  { k: "Legal+Licensing",  v: "5%",  highlight: false },
                ].map(({ k, v, highlight }) => (
                  <div key={k} className="flex justify-between items-center">
                    <span className="font-rajdhani text-[12px] text-white/40">{k}</span>
                    <span className={`font-orbitron text-xs font-bold ${highlight ? "text-gold" : "text-white/50"}`}>{v}</span>
                  </div>
                ))}
              </div>
              <p className="text-[11px] text-white/25 font-rajdhani border-t border-white/5 pt-3">
                Distributed every 30 min from the fee vault. Jackpot seeds the casino prize pool at graduation.
              </p>
            </motion.div>

            {/* Projection stats */}
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.16 }}
              className="card-panel p-5 space-y-3">
              <p className="font-orbitron text-[10px] font-bold text-white/40 tracking-widest">CREATOR PROJECTIONS</p>
              <div className="space-y-2.5">
                {(() => {
                  const avgFeePct  = 0.015; // 1.5% mid-tier
                  const creatorCut = 0.25;
                  const mcapUsd    = slot.mcapUsd;
                  const solLeft    = Math.max(0, 100_000 - mcapUsd);

                  // Assume 1% daily turnover on remaining liquidity
                  const estDailyVolUsd   = mcapUsd * 0.01;
                  const estDailyCreator  = estDailyVolUsd * avgFeePct * creatorCut;
                  const estWeeklyCreator = estDailyCreator * 7;

                  const pctToGrad = Math.max(0, 100 - progress).toFixed(0);

                  return [
                    {
                      label: "Est. daily creator fees",
                      value: estDailyCreator > 0.01 ? `$${estDailyCreator.toFixed(2)}` : "—",
                      sub: "at current MCap × 1% daily vol × 1.5% fee",
                    },
                    {
                      label: "Est. weekly creator fees",
                      value: estWeeklyCreator > 0.01 ? `$${estWeeklyCreator.toFixed(2)}` : "—",
                      sub: "same velocity",
                    },
                    {
                      label: slot.graduated ? "Post-grad LP share" : "At graduation — LP share",
                      value: `~$3,000/mo`,
                      sub: "25% of casino LP fees (est. $10k/day volume)",
                    },
                    {
                      label: "Remaining to graduation",
                      value: slot.graduated ? "✓ Graduated" : `${pctToGrad}% left`,
                      sub: slot.graduated ? "Your slot is live in the casino" : `~$${(solLeft / 1000).toFixed(0)}K MCap to go`,
                    },
                  ].map(({ label, value, sub }) => (
                    <div key={label} className="space-y-0.5">
                      <div className="flex justify-between items-baseline">
                        <span className="font-rajdhani text-[11px] text-white/35">{label}</span>
                        <span className="font-orbitron text-xs font-bold text-purple-400">{value}</span>
                      </div>
                      <p className="text-[9px] text-white/20 font-rajdhani">{sub}</p>
                    </div>
                  ));
                })()}
              </div>
              <p className="text-[9px] text-white/15 font-rajdhani border-t border-white/5 pt-3">
                Projections are estimates based on current curve state and assumed trading velocity. Not financial advice.
              </p>
            </motion.div>

            {/* Token details */}
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }}
              className="card-panel p-5 space-y-3">
              <p className="font-orbitron text-[10px] font-bold text-white/40 tracking-widest">TOKEN DETAILS</p>
              <div className="space-y-2">
                {[
                  { k: "Model",    v: `${model?.emoji ?? ""} ${model?.label ?? slot.model}` },
                  { k: "Reels",    v: `${model?.reels ?? "?"} reels` },
                  { k: "RTP",      v: "96% enforced on-chain" },
                  { k: "Supply",   v: "1,000,000,000" },
                  { k: "Network",  v: "Solana devnet" },
                ].map(({ k, v }) => (
                  <div key={k} className="flex justify-between text-[12px]">
                    <span className="text-white/30 font-orbitron tracking-wide text-[10px]">{k}</span>
                    <span className="text-white/70 font-rajdhani font-semibold">{v}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
