"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Copy, Check, ArrowDownToLine, ArrowUpFromLine, ArrowLeftRight, Wallet, Gift } from "lucide-react";
import { SwipeToConfirm } from "@/components/wallet/SwipeToConfirm";
import { Connection, PublicKey, SystemProgram, Transaction, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { useWallets } from "@privy-io/react-auth";
import { cn } from "@/lib/utils";
import {
  fetchBalance,
  confirmDeposit,
  requestWithdraw,
  requestTransfer,
  fetchHouseWallet,
  fetchSolPrice,
  formatUsdc,
  USDC_UNIT,
  type BalanceEntry,
} from "@/lib/balanceClient";

const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL ?? "https://api.devnet.solana.com";

// Deposit presets in USD cents (displayed as $X)
const DEPOSIT_PRESETS_USD  = [10, 25, 50, 100];
const WITHDRAW_PRESETS_USD = [10, 25, 50];
const TRANSFER_PRESETS_USD = [5, 10, 25];

type Tab = "balance" | "deposit" | "withdraw" | "transfer";

interface Props {
  open: boolean;
  onClose: () => void;
  walletAddress: string;
  onBalanceChange?: (usdcUnits: number) => void;
}

export function WalletModal({ open, onClose, walletAddress, onBalanceChange }: Props) {
  const { wallets } = useWallets();
  const [tab, setTab]               = useState<Tab>("balance");
  const [entry, setEntry]           = useState<BalanceEntry | null>(null);
  const [houseWallet, setHouseWallet] = useState("");
  const [copied, setCopied]         = useState(false);
  const [msg, setMsg]               = useState<{ text: string; ok: boolean } | null>(null);

  // Connected wallet's on-chain SOL balance
  const [walletSolLamports, setWalletSolLamports] = useState(0);
  const [solPrice, setSolPrice]     = useState(150);

  // Deposit state
  const [depositUsd, setDepositUsd] = useState<number | null>(null);
  const [customDepositUsd, setCustomDepositUsd] = useState("");

  // Withdraw state
  const [withdrawUsd, setWithdrawUsd]   = useState<number | null>(null);
  const [customWithdrawUsd, setCustomWithdrawUsd] = useState("");
  const [withdrawDest, setWithdrawDest] = useState("");

  // Transfer state
  const [transferTo, setTransferTo]   = useState("");
  const [transferUsd, setTransferUsd] = useState<number | null>(null);
  const [customTransferUsd, setCustomTransferUsd] = useState("");

  const refreshBalance = useCallback(async () => {
    if (!walletAddress) return;
    const e = await fetchBalance(walletAddress);
    setEntry(e);
    onBalanceChange?.(e.playable);
  }, [walletAddress, onBalanceChange]);

  const refreshSolBalance = useCallback(async () => {
    if (!walletAddress) return;
    try {
      const conn = new Connection(RPC_URL, "confirmed");
      const bal  = await conn.getBalance(new PublicKey(walletAddress));
      setWalletSolLamports(bal);
    } catch {}
  }, [walletAddress]);

  useEffect(() => {
    if (!open) return;
    setMsg(null);
    refreshBalance();
    refreshSolBalance();
    fetchHouseWallet().then(setHouseWallet);
    fetchSolPrice().then(setSolPrice);
  }, [open, refreshBalance, refreshSolBalance]);

  function copyAddress(addr: string) {
    navigator.clipboard.writeText(addr);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  // Convert USD amount → SOL lamports for sending
  const usdToLamports = (usd: number) =>
    Math.floor((usd / solPrice) * LAMPORTS_PER_SOL);

  // USD → USDC μ-units
  const usdToUsdc = (usd: number) => Math.floor(usd * USDC_UNIT);

  const effectiveDepositUsd = depositUsd ?? parseFloat(customDepositUsd || "0");
  const effectiveWithdrawUsd = withdrawUsd ?? parseFloat(customWithdrawUsd || "0");
  const effectiveTransferUsd = transferUsd ?? parseFloat(customTransferUsd || "0");

  const playableUsd = (entry?.playable ?? 0) / USDC_UNIT;
  const bonusUsd    = (entry?.bonus ?? 0) / USDC_UNIT;
  const wageringPct = entry && entry.wageringRequired > 0
    ? Math.min(100, (entry.wageringCompleted / entry.wageringRequired) * 100)
    : 0;

  async function handleDeposit() {
    if (!effectiveDepositUsd || effectiveDepositUsd <= 0) throw new Error("Enter a deposit amount");
    const lamports = usdToLamports(effectiveDepositUsd);
    const wallet   = wallets[0];
    if (!wallet) throw new Error("No wallet connected");

    // Build and send SOL transfer from user wallet to house wallet
    const conn      = new Connection(RPC_URL, "confirmed");
    const provider  = await (wallet as { getSolanaProvider?: () => Promise<{ signAndSendTransaction: (tx: Transaction) => Promise<{ signature: string }> }> }).getSolanaProvider?.();
    if (!provider) throw new Error("Solana provider unavailable");

    const { blockhash } = await conn.getLatestBlockhash("confirmed");
    const tx = new Transaction();
    tx.recentBlockhash = blockhash;
    tx.feePayer        = new PublicKey(walletAddress);
    tx.add(SystemProgram.transfer({
      fromPubkey: new PublicKey(walletAddress),
      toPubkey:   new PublicKey(houseWallet),
      lamports,
    }));

    const { signature } = await provider.signAndSendTransaction(tx);
    await conn.confirmTransaction(signature, "confirmed");

    const result = await confirmDeposit(signature, walletAddress);
    await refreshBalance();
    await refreshSolBalance();

    const bonusMsg = result.bonusClaimed
      ? ` 🎁 Welcome bonus: +${formatUsdc(result.bonus)}!`
      : "";
    setMsg({ text: `Deposited ${formatUsdc(result.deposited)}.${bonusMsg}`, ok: true });
    setDepositUsd(null);
    setCustomDepositUsd("");
  }

  async function handleWithdraw() {
    if (!effectiveWithdrawUsd || effectiveWithdrawUsd <= 0) throw new Error("Enter a withdrawal amount");
    const usdcUnits = usdToUsdc(effectiveWithdrawUsd);
    const dest      = withdrawDest.trim() || walletAddress;
    const { txSignature, withdrawalFee } = await requestWithdraw(walletAddress, usdcUnits, dest);
    await refreshBalance();
    setMsg({ text: `Withdrew ${formatUsdc(usdcUnits)} (fee: ${formatUsdc(withdrawalFee ?? 0)}). Tx: ${txSignature.slice(0, 16)}…`, ok: true });
    setWithdrawUsd(null);
    setCustomWithdrawUsd("");
    setWithdrawDest("");
  }

  async function handleTransfer() {
    if (!effectiveTransferUsd || effectiveTransferUsd <= 0) throw new Error("Enter a transfer amount");
    if (!transferTo.trim()) throw new Error("Enter a recipient User ID");
    const usdcUnits = usdToUsdc(effectiveTransferUsd);
    const { recipient, transferFee, transferred } = await requestTransfer(walletAddress, transferTo.trim(), usdcUnits);
    await refreshBalance();
    setMsg({ text: `Sent ${formatUsdc(transferred)} to ${recipient.username} (1% fee: ${formatUsdc(transferFee ?? 0)})`, ok: true });
    setTransferUsd(null);
    setCustomTransferUsd("");
    setTransferTo("");
  }

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "balance",  label: "Balance",  icon: <Wallet size={14} /> },
    { id: "deposit",  label: "Deposit",  icon: <ArrowDownToLine size={14} /> },
    { id: "withdraw", label: "Withdraw", icon: <ArrowUpFromLine size={14} /> },
    { id: "transfer", label: "Transfer", icon: <ArrowLeftRight size={14} /> },
  ];

  function PresetGrid({
    presets, selected, onSelect, custom, onCustom, suffix = "",
  }: {
    presets: number[];
    selected: number | null;
    onSelect: (v: number) => void;
    custom: string;
    onCustom: (v: string) => void;
    suffix?: string;
  }) {
    return (
      <div className="space-y-2">
        <div className="grid grid-cols-4 gap-2">
          {presets.map((v) => (
            <button
              key={v}
              onClick={() => { onSelect(v); onCustom(""); }}
              className={cn(
                "rounded-xl py-2.5 text-sm font-bold font-rajdhani transition-all",
                selected === v && !custom
                  ? "bg-purple-600 text-white"
                  : "bg-white/[0.04] text-white/50 hover:text-white hover:bg-white/[0.08] border border-white/5",
              )}
            >
              ${v}{suffix}
            </button>
          ))}
        </div>
        <input
          type="number"
          min="1"
          value={custom}
          onChange={(e) => { onCustom(e.target.value); onSelect(null as unknown as number); }}
          placeholder="Custom amount ($)"
          className="input-casino text-sm"
        />
      </div>
    );
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40"
            onClick={onClose}
          />

          <motion.div
            initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 280 }}
            className="fixed right-0 top-0 bottom-0 w-full max-w-sm bg-[#0a0a18] border-l border-white/10 z-50 flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
              <span className="font-orbitron text-sm font-bold text-white tracking-wider">CASINO WALLET</span>
              <button onClick={onClose} className="text-white/40 hover:text-white transition-colors">
                <X size={18} />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-white/5">
              {tabs.map(({ id, label, icon }) => (
                <button
                  key={id}
                  onClick={() => { setTab(id); setMsg(null); }}
                  className={cn(
                    "flex-1 flex flex-col items-center gap-1 py-3 text-[10px] font-orbitron font-bold tracking-wider transition-all",
                    tab === id ? "text-purple-400 border-b-2 border-purple-400" : "text-white/30 hover:text-white/60",
                  )}
                >
                  {icon} {label}
                </button>
              ))}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5">

              {msg && (
                <div className={cn(
                  "rounded-xl px-4 py-3 text-sm",
                  msg.ok
                    ? "bg-green-500/10 border border-green-500/20 text-green-300"
                    : "bg-red-500/10 border border-red-500/20 text-red-300",
                )}>
                  {msg.text}
                </div>
              )}

              {/* BALANCE tab */}
              {tab === "balance" && (
                <div className="space-y-4">
                  {/* Casino balance */}
                  <div className="rounded-2xl bg-gradient-to-br from-purple-900/20 to-purple-800/10 border border-purple-500/20 p-6 text-center space-y-1">
                    <p className="text-white/40 text-xs font-orbitron tracking-widest">CASINO BALANCE</p>
                    <p className="font-orbitron text-4xl font-black text-white">
                      {entry ? formatUsdc(entry.playable) : "—"}
                    </p>
                    <p className="text-white/40 text-sm">USDC</p>
                  </div>

                  {/* Bonus balance */}
                  {entry && entry.bonus > 0 && (
                    <div className="rounded-xl bg-gold/5 border border-gold/20 p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Gift size={14} className="text-gold" />
                          <span className="text-gold text-xs font-orbitron font-bold tracking-wider">WELCOME BONUS</span>
                        </div>
                        <span className="text-gold font-bold">{formatUsdc(entry.bonus)}</span>
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between text-[10px] text-white/30">
                          <span>Wagering progress</span>
                          <span>{wageringPct.toFixed(0)}%</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-gold/60 to-yellow-400 transition-all duration-500"
                            style={{ width: `${wageringPct}%` }}
                          />
                        </div>
                        <p className="text-[10px] text-white/20">
                          {formatUsdc(entry.wageringCompleted)} / {formatUsdc(entry.wageringRequired)} wagered (35× requirement)
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Connected wallet SOL balance */}
                  <div className="rounded-xl bg-white/[0.02] border border-white/5 p-4 space-y-1">
                    <p className="text-white/30 text-[10px] font-orbitron tracking-wider">YOUR WALLET</p>
                    <div className="flex items-center justify-between">
                      <span className="text-white/70 text-sm font-bold">
                        {(walletSolLamports / LAMPORTS_PER_SOL).toFixed(4)} SOL
                      </span>
                      <span className="text-white/30 text-xs">
                        ≈ ${((walletSolLamports / LAMPORTS_PER_SOL) * solPrice).toFixed(2)}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <button onClick={() => setTab("deposit")} className="btn-launch py-3 text-xs">Deposit</button>
                    <button onClick={() => setTab("withdraw")} className="btn-ghost py-3 text-xs font-rajdhani font-bold">Withdraw</button>
                  </div>
                </div>
              )}

              {/* DEPOSIT tab */}
              {tab === "deposit" && (
                <div className="space-y-4">
                  {/* Wallet SOL balance */}
                  <div className="rounded-xl bg-white/[0.02] border border-white/5 p-3 flex items-center justify-between">
                    <div>
                      <p className="text-white/30 text-[10px] font-orbitron">WALLET BALANCE</p>
                      <p className="text-white/80 font-bold text-sm">
                        {(walletSolLamports / LAMPORTS_PER_SOL).toFixed(4)} SOL
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-white/30 text-[10px]">≈ USD</p>
                      <p className="text-white/50 text-sm">${((walletSolLamports / LAMPORTS_PER_SOL) * solPrice).toFixed(2)}</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-white/60 text-xs font-orbitron tracking-wider">DEPOSIT AMOUNT</p>
                    <PresetGrid
                      presets={DEPOSIT_PRESETS_USD}
                      selected={depositUsd}
                      onSelect={setDepositUsd}
                      custom={customDepositUsd}
                      onCustom={setCustomDepositUsd}
                    />
                  </div>

                  {effectiveDepositUsd > 0 && (
                    <div className="rounded-xl bg-white/[0.02] border border-white/5 p-3 text-xs space-y-1 text-white/40">
                      <div className="flex justify-between">
                        <span>You send (SOL)</span>
                        <span className="text-white/70">{(effectiveDepositUsd / solPrice).toFixed(4)} SOL</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Platform fee (0.3%)</span>
                        <span className="text-red-400/70">−${(effectiveDepositUsd * 0.003).toFixed(3)}</span>
                      </div>
                      <div className="flex justify-between border-t border-white/5 pt-1 mt-1">
                        <span className="text-white/60">You receive</span>
                        <span className="text-green-400/80 font-bold">${(effectiveDepositUsd * 0.997).toFixed(2)} USDC</span>
                      </div>
                    </div>
                  )}

                  {/* First-deposit bonus hint */}
                  {entry && !entry.welcomeBonusClaimed && (
                    <div className="flex items-center gap-2 rounded-xl bg-gold/5 border border-gold/20 p-3 text-xs text-gold/80">
                      <Gift size={13} />
                      <span>First deposit gets 100% bonus up to $200 (35× wagering)</span>
                    </div>
                  )}

                  <SwipeToConfirm
                    label="SWIPE TO DEPOSIT"
                    variant="purple"
                    onConfirm={handleDeposit}
                    onError={(e) => setMsg({ text: e.message, ok: false })}
                    disabled={!effectiveDepositUsd || effectiveDepositUsd <= 0}
                  />

                  <p className="text-white/15 text-[10px] text-center">
                    SOL automatically converted to USDC. Rates update every 10 seconds.
                  </p>
                </div>
              )}

              {/* WITHDRAW tab */}
              {tab === "withdraw" && (
                <div className="space-y-4">
                  <div className="rounded-xl bg-white/[0.02] border border-white/5 p-3 text-center">
                    <p className="text-white/40 text-xs">Available to withdraw</p>
                    <p className="font-orbitron text-xl font-bold text-white">
                      {entry ? formatUsdc(entry.playable) : "—"}
                    </p>
                    {entry && entry.bonus > 0 && (
                      <p className="text-gold/50 text-[10px] mt-1">
                        + {formatUsdc(entry.bonus)} bonus (locked until wagering clears)
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <p className="text-white/60 text-xs font-orbitron tracking-wider">WITHDRAW AMOUNT</p>
                    <div className="grid grid-cols-4 gap-2">
                      {WITHDRAW_PRESETS_USD.map((v) => (
                        <button
                          key={v}
                          onClick={() => { setWithdrawUsd(v); setCustomWithdrawUsd(""); }}
                          className={cn(
                            "rounded-xl py-2.5 text-sm font-bold font-rajdhani transition-all",
                            withdrawUsd === v && !customWithdrawUsd
                              ? "bg-purple-600 text-white"
                              : "bg-white/[0.04] text-white/50 hover:text-white hover:bg-white/[0.08] border border-white/5",
                          )}
                        >
                          ${v}
                        </button>
                      ))}
                      <button
                        onClick={() => { setWithdrawUsd(playableUsd); setCustomWithdrawUsd(""); }}
                        className={cn(
                          "rounded-xl py-2.5 text-sm font-bold font-rajdhani transition-all",
                          withdrawUsd === playableUsd && !customWithdrawUsd
                            ? "bg-purple-600 text-white"
                            : "bg-white/[0.04] text-white/50 hover:text-white hover:bg-white/[0.08] border border-white/5",
                        )}
                      >
                        ALL
                      </button>
                    </div>
                    <input
                      type="number"
                      min="1"
                      value={customWithdrawUsd}
                      onChange={(e) => { setCustomWithdrawUsd(e.target.value); setWithdrawUsd(null); }}
                      placeholder="Custom amount ($)"
                      className="input-casino text-sm"
                    />
                  </div>

                  <div className="space-y-2">
                    <p className="text-white/60 text-xs font-orbitron tracking-wider">DESTINATION (optional)</p>
                    <input
                      value={withdrawDest}
                      onChange={(e) => setWithdrawDest(e.target.value)}
                      placeholder={walletAddress.slice(0, 20) + "… (connected wallet)"}
                      className="input-casino text-xs font-mono"
                    />
                  </div>

                  <SwipeToConfirm
                    label="SWIPE TO WITHDRAW"
                    variant="gold"
                    onConfirm={handleWithdraw}
                    onError={(e) => setMsg({ text: e.message, ok: false })}
                    disabled={!effectiveWithdrawUsd || effectiveWithdrawUsd <= 0}
                  />
                </div>
              )}

              {/* TRANSFER tab */}
              {tab === "transfer" && (
                <div className="space-y-4">
                  <div className="rounded-xl bg-white/[0.02] border border-white/5 p-3 text-center">
                    <p className="text-white/40 text-xs">Available</p>
                    <p className="font-orbitron text-xl font-bold text-white">
                      {entry ? formatUsdc(entry.playable) : "—"}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <p className="text-white/60 text-xs font-orbitron tracking-wider">RECIPIENT USER ID</p>
                    <input
                      value={transferTo}
                      onChange={(e) => setTransferTo(e.target.value)}
                      placeholder="#XXXXXXXX"
                      className="input-casino font-mono"
                    />
                    <p className="text-white/20 text-[10px]">User IDs are found in their profile page.</p>
                  </div>

                  <div className="space-y-2">
                    <p className="text-white/60 text-xs font-orbitron tracking-wider">AMOUNT</p>
                    <PresetGrid
                      presets={TRANSFER_PRESETS_USD}
                      selected={transferUsd}
                      onSelect={setTransferUsd}
                      custom={customTransferUsd}
                      onCustom={setCustomTransferUsd}
                    />
                  </div>

                  <SwipeToConfirm
                    label="SWIPE TO TRANSFER"
                    variant="cyan"
                    onConfirm={handleTransfer}
                    onError={(e) => setMsg({ text: e.message, ok: false })}
                    disabled={!transferTo.trim() || !effectiveTransferUsd || effectiveTransferUsd <= 0}
                  />

                  <p className="text-white/20 text-[10px] text-center">
                    Instant internal transfer — no gas, no blockchain tx.
                  </p>
                </div>
              )}
            </div>

            {/* Copy house wallet footer */}
            {tab === "deposit" && houseWallet && (
              <div className="border-t border-white/5 px-5 py-3 flex items-center justify-between gap-2">
                <span className="text-white/20 text-[10px] font-mono truncate">{houseWallet.slice(0, 20)}…</span>
                <button onClick={() => copyAddress(houseWallet)} className="text-white/30 hover:text-white flex-shrink-0">
                  {copied ? <Check size={13} className="text-green-400" /> : <Copy size={13} />}
                </button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
