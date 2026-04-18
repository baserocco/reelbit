"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Copy, Check, ArrowDownToLine, ArrowUpFromLine, ArrowLeftRight, Wallet, ExternalLink } from "lucide-react";
import { SwipeToConfirm } from "@/components/wallet/SwipeToConfirm";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import { cn } from "@/lib/utils";
import {
  fetchBalance,
  confirmDeposit,
  requestWithdraw,
  requestTransfer,
  fetchHouseWallet,
} from "@/lib/balanceClient";

type Tab = "balance" | "deposit" | "withdraw" | "transfer";

interface Props {
  open: boolean;
  onClose: () => void;
  walletAddress: string;
  onBalanceChange?: (lamports: number) => void;
}

export function WalletModal({ open, onClose, walletAddress, onBalanceChange }: Props) {
  const [tab, setTab] = useState<Tab>("balance");
  const [balance, setBalance] = useState(0);
  const [houseWallet, setHouseWallet] = useState("");
  const [copied, setCopied] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  // deposit
  const [depositTxSig, setDepositTxSig] = useState("");
  // withdraw
  const [withdrawAmt, setWithdrawAmt] = useState("");
  const [withdrawDest, setWithdrawDest] = useState("");
  // transfer
  const [transferTo, setTransferTo] = useState("");
  const [transferAmt, setTransferAmt] = useState("");

  const refreshBalance = useCallback(async () => {
    if (!walletAddress) return;
    const bal = await fetchBalance(walletAddress);
    setBalance(bal);
    onBalanceChange?.(bal);
  }, [walletAddress, onBalanceChange]);

  useEffect(() => {
    if (!open) return;
    setMsg(null);
    refreshBalance();
    fetchHouseWallet().then(setHouseWallet);
  }, [open, refreshBalance]);

  function copyAddress(addr: string) {
    navigator.clipboard.writeText(addr);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleDeposit() {
    const { deposited, balance: newBal } = await confirmDeposit(depositTxSig.trim(), walletAddress);
    setBalance(newBal);
    onBalanceChange?.(newBal);
    setMsg({ text: `Deposited ${(deposited / LAMPORTS_PER_SOL).toFixed(4)} SOL. Balance: ${(newBal / LAMPORTS_PER_SOL).toFixed(4)} SOL`, ok: true });
    setDepositTxSig("");
  }

  async function handleWithdraw() {
    const lamports = Math.floor(parseFloat(withdrawAmt) * LAMPORTS_PER_SOL);
    const dest = withdrawDest.trim() || walletAddress;
    const { txSignature, balance: newBal } = await requestWithdraw(walletAddress, lamports, dest);
    setBalance(newBal);
    onBalanceChange?.(newBal);
    setMsg({ text: `Withdrew ${withdrawAmt} SOL. Tx: ${txSignature.slice(0, 16)}…`, ok: true });
    setWithdrawAmt("");
  }

  async function handleTransfer() {
    const lamports = Math.floor(parseFloat(transferAmt) * LAMPORTS_PER_SOL);
    const { balance: newBal, recipient } = await requestTransfer(walletAddress, transferTo.trim(), lamports);
    setBalance(newBal);
    onBalanceChange?.(newBal);
    setMsg({ text: `Sent ${transferAmt} SOL to ${recipient.username} (#${recipient.userId})`, ok: true });
    setTransferAmt(""); setTransferTo("");
  }

  const solBalance = (balance / LAMPORTS_PER_SOL).toFixed(4);

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "balance",  label: "Balance",  icon: <Wallet size={14} /> },
    { id: "deposit",  label: "Deposit",  icon: <ArrowDownToLine size={14} /> },
    { id: "withdraw", label: "Withdraw", icon: <ArrowUpFromLine size={14} /> },
    { id: "transfer", label: "Transfer", icon: <ArrowLeftRight size={14} /> },
  ];

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40"
            onClick={onClose}
          />

          {/* Panel */}
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

              {/* Message banner */}
              {msg && (
                <div className={cn(
                  "rounded-xl px-4 py-3 text-sm",
                  msg.ok ? "bg-green-500/10 border border-green-500/20 text-green-300" : "bg-red-500/10 border border-red-500/20 text-red-300"
                )}>
                  {msg.text}
                </div>
              )}

              {/* BALANCE tab */}
              {tab === "balance" && (
                <div className="space-y-4">
                  <div className="rounded-2xl bg-gradient-to-br from-purple-900/20 to-purple-800/10 border border-purple-500/20 p-6 text-center space-y-1">
                    <p className="text-white/40 text-xs font-orbitron tracking-widest">CASINO BALANCE</p>
                    <p className="font-orbitron text-4xl font-black text-white">{solBalance}</p>
                    <p className="text-white/40 text-sm">SOL</p>
                  </div>
                  <div className="text-[11px] text-white/25 font-mono break-all bg-white/[0.02] rounded-xl p-3">
                    {walletAddress}
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
                  <div className="space-y-2">
                    <p className="text-white/60 text-xs font-orbitron tracking-wider">HOUSE WALLET ADDRESS</p>
                    <p className="text-white/30 text-xs">Send SOL to this address from any wallet:</p>
                    <div className="flex items-center gap-2 bg-white/[0.03] border border-white/10 rounded-xl p-3">
                      <span className="font-mono text-xs text-white/70 break-all flex-1">{houseWallet || "Loading…"}</span>
                      <button onClick={() => copyAddress(houseWallet)} className="shrink-0 text-white/40 hover:text-white transition-colors">
                        {copied ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
                      </button>
                    </div>
                    <p className="text-white/25 text-xs">After sending, paste the transaction signature below and click Verify.</p>
                  </div>

                  <a
                    href={`https://explorer.solana.com/address/${houseWallet}?cluster=devnet`}
                    target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-purple-400/60 text-xs hover:text-purple-400 transition-colors"
                  >
                    <ExternalLink size={11} /> View on Solana Explorer
                  </a>

                  <div className="space-y-2">
                    <p className="text-white/60 text-xs font-orbitron tracking-wider">TRANSACTION SIGNATURE</p>
                    <input
                      value={depositTxSig}
                      onChange={(e) => setDepositTxSig(e.target.value)}
                      placeholder="Paste tx signature here…"
                      className="input-casino text-xs font-mono"
                    />
                    <SwipeToConfirm
                      label="SWIPE TO VERIFY DEPOSIT"
                      variant="purple"
                      onConfirm={handleDeposit}
                      onError={(e) => setMsg({ text: e.message, ok: false })}
                      disabled={!depositTxSig.trim()}
                    />
                  </div>
                </div>
              )}

              {/* WITHDRAW tab */}
              {tab === "withdraw" && (
                <div className="space-y-4">
                  <div className="rounded-xl bg-white/[0.02] border border-white/5 p-3 text-center">
                    <p className="text-white/40 text-xs">Available</p>
                    <p className="font-orbitron text-xl font-bold text-white">{solBalance} SOL</p>
                  </div>

                  <div className="space-y-2">
                    <p className="text-white/60 text-xs font-orbitron tracking-wider">AMOUNT (SOL)</p>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={withdrawAmt}
                        onChange={(e) => setWithdrawAmt(e.target.value)}
                        placeholder="0.00"
                        className="input-casino flex-1"
                      />
                      <button
                        onClick={() => setWithdrawAmt((balance / LAMPORTS_PER_SOL).toString())}
                        className="text-xs text-purple-400 border border-purple-500/30 rounded-lg px-3 hover:bg-purple-500/10 transition-colors"
                      >
                        MAX
                      </button>
                    </div>
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
                    disabled={!withdrawAmt || parseFloat(withdrawAmt) <= 0}
                  />
                </div>
              )}

              {/* TRANSFER tab */}
              {tab === "transfer" && (
                <div className="space-y-4">
                  <div className="rounded-xl bg-white/[0.02] border border-white/5 p-3 text-center">
                    <p className="text-white/40 text-xs">Available</p>
                    <p className="font-orbitron text-xl font-bold text-white">{solBalance} SOL</p>
                  </div>

                  <div className="space-y-2">
                    <p className="text-white/60 text-xs font-orbitron tracking-wider">RECIPIENT USER ID</p>
                    <input
                      value={transferTo}
                      onChange={(e) => setTransferTo(e.target.value)}
                      placeholder="#XXXXXXXX"
                      className="input-casino font-mono"
                    />
                    <p className="text-white/20 text-[10px]">Enter the recipient&apos;s User ID (e.g. #R7K2XP9M). Found in their profile.</p>
                  </div>

                  <div className="space-y-2">
                    <p className="text-white/60 text-xs font-orbitron tracking-wider">AMOUNT (SOL)</p>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={transferAmt}
                        onChange={(e) => setTransferAmt(e.target.value)}
                        placeholder="0.00"
                        className="input-casino flex-1"
                      />
                      <button
                        onClick={() => setTransferAmt((balance / LAMPORTS_PER_SOL).toString())}
                        className="text-xs text-purple-400 border border-purple-500/30 rounded-lg px-3 hover:bg-purple-500/10 transition-colors"
                      >
                        MAX
                      </button>
                    </div>
                  </div>

                  <SwipeToConfirm
                    label="SWIPE TO TRANSFER"
                    variant="cyan"
                    onConfirm={handleTransfer}
                    onError={(e) => setMsg({ text: e.message, ok: false })}
                    disabled={!transferTo.trim() || !transferAmt || parseFloat(transferAmt) <= 0}
                  />

                  <p className="text-white/20 text-[10px] text-center">
                    Instant internal transfer — no gas, no blockchain tx.
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
