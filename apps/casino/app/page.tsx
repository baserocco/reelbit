"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Search, Flame, Star, Trophy, Loader2, Zap, TrendingUp, User } from "lucide-react";
import Link from "next/link";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import { cn } from "@/lib/utils";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

interface SlotEntry {
  mint: string;
  tokenName: string;
  tokenSymbol: string;
  slotModel: "Classic3Reel" | "Standard5Reel" | "FiveReelFreeSpins";
  heroImageUrl: string | null;
  primaryColor: string;
  accentColor: string;
  isDemo: boolean;
  isGraduated: boolean;
}

const DEMO_SLOTS: SlotEntry[] = [
  { mint: "So11111111111111111111111111111111111111112",          tokenName: "Lucky 7s",        tokenSymbol: "L7",    slotModel: "Classic3Reel",      heroImageUrl: null, primaryColor: "#d4a017", accentColor: "#8b5cf6", isDemo: true, isGraduated: false },
  { mint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",       tokenName: "Neon Joker",      tokenSymbol: "JOKER", slotModel: "Standard5Reel",     heroImageUrl: null, primaryColor: "#06b6d4", accentColor: "#8b5cf6", isDemo: true, isGraduated: false },
  { mint: "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB",        tokenName: "Dragon's Fortune",tokenSymbol: "DRAG",  slotModel: "FiveReelFreeSpins", heroImageUrl: null, primaryColor: "#ef4444", accentColor: "#d4a017", isDemo: true, isGraduated: false },
  { mint: "4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R",        tokenName: "Diamond Rush",    tokenSymbol: "DIAM",  slotModel: "Standard5Reel",     heroImageUrl: null, primaryColor: "#60a5fa", accentColor: "#e2e8f0", isDemo: true, isGraduated: false },
  { mint: "mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So",         tokenName: "Phantom Reels",   tokenSymbol: "PHNTM", slotModel: "FiveReelFreeSpins", heroImageUrl: null, primaryColor: "#a855f7", accentColor: "#ec4899", isDemo: true, isGraduated: false },
  { mint: "7dHbWXmci3dT8UFYWYZweBLXgycu7Y3iL6trKn1Y7ARj",         tokenName: "Gold Rush",       tokenSymbol: "GRUSH", slotModel: "Classic3Reel",      heroImageUrl: null, primaryColor: "#f5c842", accentColor: "#ef4444", isDemo: true, isGraduated: false },
];

const MODEL_LABEL: Record<string, string> = {
  Classic3Reel: "3-Reel", Standard5Reel: "5-Reel", FiveReelFreeSpins: "Free Spins",
};

const MODEL_COLOR: Record<string, string> = {
  Classic3Reel: "#d4a017", Standard5Reel: "#8b5cf6", FiveReelFreeSpins: "#22c55e",
};

// Sample recent-win events — will be replaced by live feed post-launch
const SAMPLE_WINS = [
  { wallet: "7xK…gAs", sol: "14.4", slot: "Lucky 7s",         mult: 144 },
  { wallet: "9Wz…NqM", sol: "0.85", slot: "Neon Joker",       mult: 8   },
  { wallet: "BrE…jnC", sol: "3.2",  slot: "Dragon's Fortune", mult: 32  },
  { wallet: "5yF…KKC", sol: "1.5",  slot: "Phantom Reels",    mult: 15  },
  { wallet: "HN7…WrH", sol: "48.0", slot: "Gold Rush",        mult: 480 },
  { wallet: "ATo…Aev", sol: "0.6",  slot: "Diamond Rush",     mult: 6   },
  { wallet: "3h1…bYL", sol: "5.0",  slot: "Lucky 7s",         mult: 50  },
  { wallet: "9xQ…Fin", sol: "2.1",  slot: "Dragon's Fortune", mult: 21  },
];

type Tab      = "lobby" | "my-slots";
type Filter   = "all" | "demo" | "graduated";
type SortMode = "featured" | "new" | "name";

// ── Live wins ticker ──────────────────────────────────────────────────────────

function LiveTicker() {
  const wins = [...SAMPLE_WINS, ...SAMPLE_WINS]; // doubled for seamless loop
  return (
    <div className="border-b border-white/5 bg-[#07070f] py-2 overflow-hidden">
      <div className="marquee-track">
        <div className="marquee-inner">
          {wins.map((w, i) => (
            <div key={i} className="flex items-center gap-2 px-8 text-[11px] whitespace-nowrap">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse flex-shrink-0" />
              <span className="text-white/35 font-mono">{w.wallet}</span>
              <span className="text-white/20">won</span>
              <span className="font-bold text-green-400">{w.sol} SOL</span>
              <span className="text-white/20">on</span>
              <span className="text-white/60 font-rajdhani font-semibold">{w.slot}</span>
              {w.mult >= 50 && (
                <span className="badge badge-gold text-[9px] px-1.5 py-0.5">×{w.mult}</span>
              )}
              <span className="text-white/10 px-3">|</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function CasinoLobby() {
  const { authenticated, login } = usePrivy();
  const { wallets } = useWallets();
  const walletAddress = wallets[0]?.address ?? "";

  const [tab,           setTab]           = useState<Tab>("lobby");
  const [graduatedSlots, setGraduatedSlots] = useState<SlotEntry[]>([]);
  const [mySlots,       setMySlots]       = useState<SlotEntry[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [myLoading,     setMyLoading]     = useState(false);
  const [search,        setSearch]        = useState("");
  const [filter,        setFilter]        = useState<Filter>("all");
  const [sort,          setSort]          = useState<SortMode>("featured");

  useEffect(() => {
    fetch(`${API_URL}/themes/graduated`)
      .then((r) => r.json())
      .then((data: Array<{ mint: string; tokenName: string; tokenSymbol: string; slotModel: string; heroImageUrl: string | null; primaryColor: string; accentColor: string }>) =>
        setGraduatedSlots(data.map((t) => ({
          ...t,
          slotModel: t.slotModel as SlotEntry["slotModel"],
          isDemo: false, isGraduated: true,
        }))),
      )
      .catch(() => setGraduatedSlots([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (tab !== "my-slots" || !walletAddress) return;
    setMyLoading(true);
    fetch(`${API_URL}/themes/by-creator/${walletAddress}`)
      .then((r) => r.json())
      .then((data: Array<{ mint: string; tokenName: string; tokenSymbol: string; slotModel: string; heroImageUrl: string | null; primaryColor: string; accentColor: string; graduated: boolean }>) =>
        setMySlots(data.map((t) => ({
          ...t,
          slotModel: t.slotModel as SlotEntry["slotModel"],
          isDemo: false, isGraduated: t.graduated,
        }))),
      )
      .catch(() => setMySlots([]))
      .finally(() => setMyLoading(false));
  }, [tab, walletAddress]);

  const allSlots: SlotEntry[] = [...graduatedSlots, ...DEMO_SLOTS];
  const activeSlots = tab === "my-slots" ? mySlots : allSlots;

  const filtered = activeSlots
    .filter((s) => {
      if (tab === "my-slots") return true; // no filter on My Slots
      const q = search.toLowerCase();
      const matchSearch = s.tokenName.toLowerCase().includes(q) || s.tokenSymbol.toLowerCase().includes(q);
      const matchFilter =
        filter === "all" ||
        (filter === "demo" && s.isDemo) ||
        (filter === "graduated" && s.isGraduated);
      return matchSearch && matchFilter;
    })
    .sort((a, b) => {
      if (sort === "name") return a.tokenName.localeCompare(b.tokenName);
      if (a.isGraduated !== b.isGraduated) return a.isGraduated ? -1 : 1;
      return 0;
    });

  return (
    <div className="min-h-screen">
      {/* Ambient orbs */}
      <div className="orb w-[500px] h-[500px] bg-purple-600/6 top-10 -left-48" style={{ animationDelay: "0s" }} />
      <div className="orb w-80 h-80 bg-cyan-500/4 bottom-40 right-10" style={{ animationDelay: "4s" }} />

      <LiveTicker />

      {/* Tab bar */}
      <div className="border-b border-white/5 bg-[#07070f]">
        <div className="max-w-7xl mx-auto px-4 flex items-center gap-1">
          {([
            { id: "lobby" as Tab,    label: "Casino Lobby", icon: <Zap size={13} /> },
            { id: "my-slots" as Tab, label: "My Slots",     icon: <User size={13} /> },
          ]).map(({ id, label, icon }) => (
            <button
              key={id}
              onClick={() => { if (id === "my-slots" && !authenticated) { login(); return; } setTab(id); }}
              className={cn(
                "flex items-center gap-1.5 px-4 py-3 text-xs font-orbitron font-bold tracking-wide border-b-2 transition-all -mb-px",
                tab === id
                  ? "border-purple-500 text-purple-400"
                  : "border-transparent text-white/30 hover:text-white/60",
              )}
            >
              {icon} {label}
            </button>
          ))}
          <div className="ml-auto">
            <Link
              href="/demo"
              className="flex items-center gap-1.5 text-[10px] font-orbitron font-bold text-purple-400/60 hover:text-purple-400 transition-colors px-3 py-3"
            >
              <Zap size={11} /> Try Demo
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-10 space-y-8">

        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-4 pt-4"
        >
          <div className="inline-flex items-center gap-2 bg-green-500/8 border border-green-500/20 rounded-full px-4 py-1.5 mb-1">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            <span className="font-orbitron text-[10px] font-bold text-green-400/80 tracking-widest">PROVABLY FAIR · 96% RTP · LIVE ON SOLANA</span>
          </div>

          <h1 className="font-orbitron text-3xl md:text-5xl font-black tracking-tight leading-tight">
            <span className="gold-text">Casino</span>{" "}
            <span className="text-white">Lobby</span>
          </h1>
          <p className="text-white/30 text-sm font-rajdhani max-w-md mx-auto">
            Every spin provably fair. Deposit SOL, pick a machine, and play.
          </p>

          {/* Stats strip */}
          <div className="flex items-center justify-center gap-8 pt-2">
            {[
              { label: "Live Slots",  value: loading ? "…" : String(allSlots.length) },
              { label: "Graduated",   value: loading ? "…" : String(graduatedSlots.length) },
              { label: "RTP",         value: "96%" },
              { label: "House Edge",  value: "4%" },
            ].map(({ label, value }) => (
              <div key={label} className="text-center">
                <p className="font-orbitron text-xl font-black gold-text">{value}</p>
                <p className="text-[9px] text-white/20 font-orbitron tracking-widest uppercase mt-0.5">{label}</p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* My Slots tab content */}
        {tab === "my-slots" && (
          <div className="space-y-6">
            {myLoading ? (
              <div className="flex items-center justify-center py-28 text-white/25">
                <Loader2 size={20} className="animate-spin mr-2" /> Loading your slots…
              </div>
            ) : mySlots.length === 0 ? (
              <div className="text-center py-28 space-y-3">
                <p className="font-orbitron text-sm text-white/15 tracking-widest">NO SLOTS YET</p>
                <p className="text-white/25 text-sm font-rajdhani">
                  Launch your slot on{" "}
                  <a href="https://reelbit.fun" target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:underline">
                    reelbit.fun
                  </a>{" "}
                  — when it graduates it appears here.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {mySlots.map((slot, i) => <SlotCard key={slot.mint} slot={slot} index={i} />)}
              </div>
            )}
          </div>
        )}

        {/* Filter / search controls — lobby tab only */}
        {tab === "lobby" && <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/25" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search slots…"
              className="input-casino pl-10 text-sm"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            {([
              { id: "all" as Filter,       label: "All",        icon: <Zap size={11} /> },
              { id: "graduated" as Filter, label: "Graduated",  icon: <Trophy size={11} /> },
              { id: "demo" as Filter,      label: "Demo",       icon: <Star size={11} /> },
            ]).map(({ id, label, icon }) => (
              <button
                key={id}
                onClick={() => setFilter(id)}
                className={cn(
                  "flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-[11px] font-bold font-rajdhani transition-all",
                  filter === id
                    ? "bg-purple-600 text-white"
                    : "bg-white/[0.04] text-white/40 hover:text-white border border-white/5",
                )}
              >
                {icon} {label}
              </button>
            ))}
            <div className="flex gap-1 ml-auto sm:ml-0">
              {([
                { id: "featured" as SortMode, label: "Featured" },
                { id: "name" as SortMode,     label: "A–Z" },
              ]).map(({ id, label }) => (
                <button
                  key={id}
                  onClick={() => setSort(id)}
                  className={cn(
                    "rounded-xl px-3 py-2.5 text-[11px] font-bold font-rajdhani transition-all",
                    sort === id ? "bg-white/10 text-white" : "text-white/25 hover:text-white/50",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>}

        {/* Graduated section divider — lobby only */}
        {tab === "lobby" && filter !== "demo" && graduatedSlots.length > 0 && (
          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-green-500/20 to-transparent" />
            <span className="badge badge-graduated font-orbitron text-[9px]">
              <Flame size={9} /> GRADUATED FROM REELBIT.FUN
            </span>
            <div className="h-px flex-1 bg-gradient-to-l from-transparent via-green-500/20 to-transparent" />
          </div>
        )}

        {/* Slot grid — lobby only */}
        {tab === "lobby" && (loading ? (
          <div className="flex items-center justify-center py-28 text-white/25">
            <Loader2 size={20} className="animate-spin mr-2" /> Loading slots…
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-28">
            <p className="font-orbitron text-sm text-white/15 tracking-widest">NO SLOTS FOUND</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map((slot, i) => (
              <SlotCard key={slot.mint} slot={slot} index={i} />
            ))}
          </div>
        ))}

        {/* Demo section label — lobby only */}
        {tab === "lobby" && filter !== "graduated" && !loading && (
          <div className="flex items-center gap-3 pt-2">
            <div className="h-px flex-1 bg-white/[0.04]" />
            <span className="text-[9px] font-orbitron text-white/15 tracking-widest">FEATURED DEMO SLOTS — NO DEPOSIT REQUIRED</span>
            <div className="h-px flex-1 bg-white/[0.04]" />
          </div>
        )}

        {/* Bottom CTA */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="relative overflow-hidden rounded-2xl border border-purple-500/15 bg-gradient-to-r from-purple-900/20 via-purple-800/10 to-purple-900/20 px-8 py-7 text-center"
        >
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(139,92,246,0.08),transparent_70%)]" />
          <p className="relative font-orbitron text-sm font-bold text-white/80 tracking-wide mb-1">
            Have a token on reelbit.fun?
          </p>
          <p className="relative text-white/30 text-sm font-rajdhani mb-4">
            Reach 85 SOL on the bonding curve and your slot graduates here automatically.
          </p>
          <a
            href="https://reelbit.fun"
            target="_blank"
            rel="noopener noreferrer"
            className="relative inline-flex items-center gap-2 btn-launch py-2.5 px-6 text-[11px]"
          >
            <TrendingUp size={13} /> Launch on reelbit.fun
          </a>
        </motion.div>
      </div>
    </div>
  );
}

// ── Slot Card ─────────────────────────────────────────────────────────────────

function SlotCard({ slot, index }: { slot: SlotEntry; index: number }) {
  const symbolFallback = slot.tokenSymbol.slice(0, 2).toUpperCase();
  const modelColor     = MODEL_COLOR[slot.slotModel] ?? "#8b5cf6";
  const isHot          = index < 2 && slot.isGraduated;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, ease: "easeOut" }}
    >
      <Link href={`/slot/${slot.mint}`} className="block h-full group">
        <div
          className="card-slot h-full cursor-pointer"
          style={{ "--hover-color": slot.primaryColor } as React.CSSProperties}
        >
          {/* Art area */}
          <div
            className="h-44 relative overflow-hidden slot-img-placeholder"
            style={{
              background: `linear-gradient(135deg, ${slot.primaryColor}22 0%, ${slot.accentColor}14 50%, #080818 100%)`,
            }}
          >
            {slot.heroImageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={slot.heroImageUrl}
                alt={slot.tokenName}
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
            ) : (
              <PlaceholderArt slot={slot} />
            )}

            {/* Badges */}
            <div className="absolute top-2.5 left-2.5 flex gap-1.5 flex-wrap">
              {slot.isGraduated && (
                <span className="badge badge-graduated text-[9px]">
                  <Flame size={8} /> LIVE
                </span>
              )}
              {slot.isDemo && (
                <span className="badge badge-gold text-[9px]">
                  <Star size={8} /> DEMO
                </span>
              )}
              {isHot && (
                <span className="badge badge-hot text-[9px]">
                  🔥 HOT
                </span>
              )}
            </div>

            {/* Model badge */}
            <div className="absolute top-2.5 right-2.5">
              <span
                className="badge text-[9px]"
                style={{ background: `${modelColor}18`, border: `1px solid ${modelColor}35`, color: modelColor }}
              >
                {MODEL_LABEL[slot.slotModel]}
              </span>
            </div>

            {/* Bottom gradient */}
            <div className="absolute bottom-0 inset-x-0 h-16 bg-gradient-to-t from-[#10101e] to-transparent" />
          </div>

          {/* Info */}
          <div className="p-4 space-y-3">
            <div>
              <p className="font-orbitron text-sm font-bold text-white/90 leading-tight">{slot.tokenName}</p>
              <p className="text-[11px] text-white/30 font-rajdhani mt-0.5">${slot.tokenSymbol}</p>
            </div>

            <motion.div
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className="w-full py-2.5 rounded-xl text-center text-[11px] font-orbitron font-bold tracking-wider transition-all"
              style={{
                background: `${slot.primaryColor}18`,
                color: slot.primaryColor,
                border: `1px solid ${slot.primaryColor}30`,
              }}
            >
              PLAY NOW →
            </motion.div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

// ── Placeholder art — mini slot preview ───────────────────────────────────────

const SLOT_ICONS: Record<string, string[]> = {
  Classic3Reel:      ["🍒", "🍋", "7️⃣"],
  Standard5Reel:     ["💎", "🃏", "⭐", "🔔", "💫"],
  FiveReelFreeSpins: ["🐉", "🔥", "🔔", "💫", "🃏"],
};

function PlaceholderArt({ slot }: { slot: SlotEntry }) {
  const icons = SLOT_ICONS[slot.slotModel] ?? ["🎰"];
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
      {/* Reel preview */}
      <div className="flex items-center gap-2">
        {icons.slice(0, slot.slotModel === "Classic3Reel" ? 3 : 5).map((icon, i) => (
          <div
            key={i}
            className="w-10 h-10 rounded-lg flex items-center justify-center text-xl"
            style={{
              background: `${slot.primaryColor}15`,
              border: `1px solid ${slot.primaryColor}25`,
              boxShadow: i === Math.floor(icons.length / 2)
                ? `0 0 16px ${slot.primaryColor}50`
                : undefined,
            }}
          >
            {icon}
          </div>
        ))}
      </div>
      {/* Symbol label */}
      <div
        className="font-orbitron text-xs font-black tracking-widest"
        style={{ color: slot.primaryColor, textShadow: `0 0 16px ${slot.primaryColor}80` }}
      >
        {slot.tokenSymbol}
      </div>
    </div>
  );
}
