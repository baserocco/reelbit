"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import { Connection, PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { ArrowLeft, Shield, Trophy, Wallet, Zap } from "lucide-react";
import Link from "next/link";
import { SlotMachine } from "@/components/slot/SlotMachine";
import { BetControls } from "@/components/slot/BetControls";
import { WalletModal } from "@/components/wallet/WalletModal";
import { createSession, spin, generateClientSeed, type Session } from "@/lib/gameClient";
import { fetchBalance } from "@/lib/balanceClient";
import { formatSol, shortenAddress } from "@/lib/utils";
import type { SpinResult } from "@/components/slot/types";

const API_URL  = process.env.NEXT_PUBLIC_API_URL  ?? "http://localhost:3001";
const RPC_URL  = process.env.NEXT_PUBLIC_RPC_URL  ?? "https://api.devnet.solana.com";
const TOKEN_LAUNCH_PROGRAM = new PublicKey("5vy9vYy9A6wAy59nRvvpGd5drVwQU1JYqRuSg7xQZDD8");
const DEFAULT_BET = 0.1 * LAMPORTS_PER_SOL;
const SOL_PRICE_USD = 150; // replace with oracle in prod

function jackpotVaultPda(mint: PublicKey): PublicKey {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("jackpot_vault"), mint.toBuffer()],
    TOKEN_LAUNCH_PROGRAM,
  )[0];
}

async function fetchJackpotLamports(mintStr: string): Promise<number> {
  try {
    const mint    = new PublicKey(mintStr);
    const vault   = jackpotVaultPda(mint);
    const conn    = new Connection(RPC_URL, "confirmed");
    const balance = await conn.getBalance(vault);
    return balance;
  } catch {
    return 0;
  }
}

interface SlotTheme {
  tokenName: string;
  tokenSymbol: string;
  slotModel: "Classic3Reel" | "Standard5Reel" | "FiveReelFreeSpins";
  primaryColor: string;
  accentColor: string;
  heroImageUrl: string | null;
  bgImageUrl: string | null;
}

interface RecentSpin {
  result: SpinResult;
  ts: number;
}

export default function CasinoSlotPage({ params }: { params: { mint: string } }) {
  const { mint } = params;
  const { authenticated, login } = usePrivy();
  const { wallets } = useWallets();

  const [theme, setTheme] = useState<SlotTheme | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [clientSeed, setClientSeed] = useState(generateClientSeed);
  const [betLamports, setBetLamports] = useState(DEFAULT_BET);
  const [balance, setBalance] = useState(0);
  const [spinResult, setSpinResult] = useState<SpinResult | null>(null);
  const [isSpinning, setIsSpinning] = useState(false);
  const [freeSpinsLeft, setFreeSpinsLeft] = useState(0);
  const [recentSpins, setRecentSpins] = useState<RecentSpin[]>([]);
  const [totalWon, setTotalWon] = useState(0);
  const [totalWagered, setTotalWagered] = useState(0);
  const [error,          setError]          = useState<string | null>(null);
  const [walletOpen,     setWalletOpen]     = useState(false);
  const [jackpotLamports, setJackpotLamports] = useState(0);
  const [jackpotPrev,    setJackpotPrev]    = useState(0); // detect grows for animation

  const wallet = wallets[0];
  const walletAddress = wallet?.address ?? "";

  // Fetch slot theme
  useEffect(() => {
    fetch(`${API_URL}/themes/${mint}`)
      .then((r) => r.ok ? r.json() : null)
      .then((t) => t && setTheme(t))
      .catch(() => {});
  }, [mint]);

  // Fetch internal balance
  const refreshBalance = useCallback(async () => {
    if (!walletAddress) return;
    const bal = await fetchBalance(walletAddress);
    setBalance(bal);
  }, [walletAddress]);

  useEffect(() => {
    refreshBalance();
    const id = setInterval(refreshBalance, 8_000);
    return () => clearInterval(id);
  }, [refreshBalance]);

  // Fetch live jackpot vault balance from on-chain PDA
  useEffect(() => {
    let cancelled = false;
    async function poll() {
      const lamports = await fetchJackpotLamports(mint);
      if (!cancelled) {
        setJackpotLamports((prev) => {
          if (lamports > prev) setJackpotPrev(prev);
          return lamports;
        });
      }
    }
    poll();
    const id = setInterval(poll, 15_000);
    return () => { cancelled = true; clearInterval(id); };
  }, [mint]);

  // Create game session when wallet connects
  useEffect(() => {
    if (!authenticated || !walletAddress || session) return;
    createSession(walletAddress, theme?.slotModel ?? "Classic3Reel")
      .then(setSession)
      .catch((e) => setError(`Session error: ${e.message}`));
  }, [authenticated, walletAddress, session, theme]);

  const handleSpin = useCallback(async () => {
    if (!session || isSpinning) return;
    setError(null);
    setIsSpinning(true);

    try {
      const isFree = freeSpinsLeft > 0;
      const effectiveBet = isFree ? 0 : betLamports;
      const result = await spin(session.sessionId, clientSeed, effectiveBet || DEFAULT_BET);

      setSpinResult(result);
      setClientSeed(generateClientSeed());

      if (isFree) setFreeSpinsLeft((p) => p - 1);
      if (result.freeSpinsAwarded > 0) setFreeSpinsLeft((p) => p + result.freeSpinsAwarded);

      setTotalWagered((p) => p + (isFree ? 0 : betLamports));
      setTotalWon((p) => p + result.totalPayout);
      setRecentSpins((prev) => [{ result, ts: Date.now() }, ...prev].slice(0, 20));

      // Refresh balance after spin (game server updated it server-side)
      setTimeout(refreshBalance, 500);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Spin failed";
      setError(msg);
      // If insufficient balance, prompt wallet deposit
      if (msg.toLowerCase().includes("insufficient")) {
        setWalletOpen(true);
      }
    } finally {
      // isSpinning cleared by onSpinComplete
    }
  }, [session, isSpinning, freeSpinsLeft, betLamports, clientSeed, refreshBalance]);

  function handleSpinComplete() {
    setIsSpinning(false);
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.code === "Space" && !isSpinning && authenticated) {
        e.preventDefault();
        handleSpin();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [handleSpin, isSpinning, authenticated]);

  const sessionRtp = totalWagered > 0 ? ((totalWon / totalWagered) * 100).toFixed(1) : "—";
  const slotName = theme?.tokenName ?? mint.slice(0, 8);

  return (
    <>
      <div
        className="min-h-screen text-white relative"
        style={theme?.bgImageUrl ? {
          background: `linear-gradient(to bottom, rgba(6,6,15,0.92), rgba(6,6,15,0.98)), url(${theme.bgImageUrl}) center/cover no-repeat fixed`,
        } : undefined}
      >
        {/* Sub-header */}
        <div className="border-b border-white/5 bg-[#06060f]/60 backdrop-blur px-6 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-white/40 hover:text-white transition-colors text-sm">
            <ArrowLeft size={15} /> {slotName}
          </Link>
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1 text-green-400/70">
              <Shield size={11} /> 96% RTP
            </div>
            {authenticated && (
              <button
                onClick={() => setWalletOpen(true)}
                className="flex items-center gap-1.5 text-white/50 hover:text-white transition-colors"
              >
                <Wallet size={11} />
                {formatSol(balance)}
              </button>
            )}
            {authenticated ? (
              <span className="text-white/30 font-mono">{shortenAddress(walletAddress)}</span>
            ) : (
              <button onClick={login} className="bg-purple-600 hover:bg-purple-500 px-3 py-1 rounded-lg transition-colors">
                Connect Wallet
              </button>
            )}
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
          {/* Jackpot banner */}
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative overflow-hidden rounded-2xl border border-gold/20 bg-gradient-to-r from-gold/5 via-yellow-500/8 to-gold/5 px-6 py-4"
          >
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(251,191,36,0.06),transparent_70%)]" />
            <div className="relative flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-gold/10 border border-gold/20 flex items-center justify-center">
                  <Trophy size={16} className="text-gold" />
                </div>
                <div>
                  <p className="font-orbitron text-[9px] font-bold text-gold/50 tracking-widest">JACKPOT POOL</p>
                  <p className="font-rajdhani text-[11px] text-white/30 mt-0.5">
                    {slotName} · live on-chain
                  </p>
                </div>
              </div>

              <div className="text-right">
                <AnimatePresence mode="wait">
                  <motion.p
                    key={jackpotLamports}
                    initial={{ opacity: 0, y: jackpotLamports > jackpotPrev ? -12 : 0 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.35 }}
                    className="font-orbitron text-2xl font-black text-gold tracking-tight"
                  >
                    {jackpotLamports === 0
                      ? "—"
                      : `$${(jackpotLamports / LAMPORTS_PER_SOL * SOL_PRICE_USD).toLocaleString(undefined, { maximumFractionDigits: 2 })}`}
                  </motion.p>
                </AnimatePresence>
                <p className="font-rajdhani text-[11px] text-gold/40 mt-0.5">
                  {jackpotLamports === 0 ? "Building…" : `${(jackpotLamports / LAMPORTS_PER_SOL).toFixed(4)} SOL`}
                </p>
              </div>

              {jackpotLamports > jackpotPrev && jackpotPrev > 0 && (
                <motion.div
                  initial={{ opacity: 1, y: 0, x: "-50%" }}
                  animate={{ opacity: 0, y: -24 }}
                  transition={{ duration: 1.2 }}
                  className="absolute top-2 left-1/2 font-orbitron text-[10px] font-bold text-green-400"
                >
                  +{((jackpotLamports - jackpotPrev) / LAMPORTS_PER_SOL).toFixed(4)} SOL
                </motion.div>
              )}
            </div>

            {/* Progress bar toward minimum jackpot target ($3k = 20 SOL @ $150) */}
            {jackpotLamports > 0 && (
              <div className="relative mt-3 h-1 rounded-full bg-gold/10 overflow-hidden">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-gold/60 to-yellow-400"
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min((jackpotLamports / LAMPORTS_PER_SOL / 20) * 100, 100)}%` }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                />
              </div>
            )}
            {jackpotLamports > 0 && (
              <div className="flex justify-between mt-1 text-[9px] font-orbitron text-gold/25">
                <span>{(jackpotLamports / LAMPORTS_PER_SOL).toFixed(3)} SOL</span>
                <span>20 SOL target ($3K)</span>
              </div>
            )}
          </motion.div>

          {/* Slot machine */}
          <div className="flex flex-col items-center gap-6">
            <SlotMachine
              model={theme?.slotModel ?? "Classic3Reel"}
              spinResult={spinResult}
              isSpinning={isSpinning}
              onSpinComplete={handleSpinComplete}
            />

            {error && (
              <div className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2.5 flex items-center gap-2">
                {error}
                {error.toLowerCase().includes("insufficient") && (
                  <button
                    onClick={() => setWalletOpen(true)}
                    className="ml-2 underline text-purple-400 text-xs"
                  >
                    Deposit SOL
                  </button>
                )}
              </div>
            )}

            {authenticated ? (
              <BetControls
                betLamports={betLamports}
                onBetChange={setBetLamports}
                balance={balance}
                isSpinning={isSpinning}
                onSpin={handleSpin}
                freeSpinsLeft={freeSpinsLeft}
              />
            ) : (
              <motion.button
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.97 }}
                onClick={login}
                className="bg-purple-600 hover:bg-purple-500 px-10 py-4 rounded-2xl font-bold text-lg transition-colors"
              >
                Connect Wallet to Play
              </motion.button>
            )}

            <p className="text-white/15 text-xs">Press Space to spin</p>
          </div>

          {/* Session stats */}
          {authenticated && recentSpins.length > 0 && (
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: "Session RTP", value: `${sessionRtp}%` },
                { label: "Total Won",   value: formatSol(totalWon) },
                { label: "Spins",       value: String(recentSpins.length) },
              ].map(({ label, value }) => (
                <div key={label} className="stat-box text-center">
                  <div className="label">{label}</div>
                  <div className="value text-base">{value}</div>
                </div>
              ))}
            </div>
          )}

          {/* Recent spins */}
          {recentSpins.length > 0 && (
            <div className="card-panel p-5 space-y-3">
              <div className="flex items-center gap-2 text-sm text-white/50">
                <Trophy size={13} /> Recent Spins
              </div>
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {recentSpins.map((s, i) => (
                  <div key={i} className="flex items-center justify-between text-xs">
                    <div className="text-white/30">
                      {s.result.reels.map((r) => SYMBOL_EMOJI[r[1] as keyof typeof SYMBOL_EMOJI] ?? "?").join(" ")}
                    </div>
                    <div className={s.result.totalPayout > 0 ? "text-green-400" : "text-white/25"}>
                      {s.result.totalPayout > 0 ? `+${formatSol(s.result.totalPayout)}` : `−${formatSol(s.result.betAmount)}`}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Provably fair */}
          {session && (
            <div className="card-panel p-5 space-y-2 text-xs text-white/30">
              <div className="text-white/50 font-orbitron text-[11px] font-bold flex items-center gap-1.5 tracking-wider">
                <Shield size={12} /> PROVABLY FAIR
              </div>
              <div className="break-all">Server seed hash: <span className="text-white/50 font-mono">{session.serverSeedHash}</span></div>
              <div>Client seed: <span className="text-white/50 font-mono">{clientSeed.slice(0, 16)}…</span></div>
            </div>
          )}
        </div>
      </div>

      <WalletModal
        open={walletOpen}
        onClose={() => setWalletOpen(false)}
        walletAddress={walletAddress}
        onBalanceChange={setBalance}
      />
    </>
  );
}

const SYMBOL_EMOJI = {
  SEVEN: "7️⃣", BAR3: "▰▰▰", BAR2: "▰▰", BAR1: "▰",
  BELL: "🔔", CHERRY: "🍒", LEMON: "🍋", ORANGE: "🍊", WILD: "⭐",
} as const;
