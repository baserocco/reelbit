"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import type { AnchorWallet } from "@solana/wallet-adapter-react";
import { launchSlot } from "@/lib/tokenLaunch";
import { Upload, Rocket, CheckCircle, Info, ChevronRight, Sparkles } from "lucide-react";
import { BondingCurveChart } from "@/components/chart/BondingCurveChart";
import { cn } from "@/lib/utils";
import { SLOT_MODELS, STARTING_MCAP_USD, RTP_PCT } from "@/lib/constants";
import type { SlotModel } from "@/types/slot";

type Step = "form" | "preview" | "launching" | "success";

interface FormData {
  name: string;
  ticker: string;
  imageUri: string;
  model: SlotModel;
  description: string;
}

const EMPTY: FormData = { name: "", ticker: "", imageUri: "", model: "Classic3Reel", description: "" };

const HOW_IT_WORKS = [
  { step: "01", title: "Launch for Free",  desc: "Token deploys at $5k mcap. You pay ~0.01 SOL rent only." },
  { step: "02", title: "Traders Buy In",   desc: "Bonding curve fills up. 5% wallet cap stops whales." },
  { step: "03", title: "Graduate at $100k",desc: "Your slot goes live on reelbit.casino automatically." },
  { step: "04", title: "Earn Forever",     desc: "25% of all casino GGR + trading fees sent to your wallet." },
];

export default function LaunchPage() {
  const { authenticated, login } = usePrivy();
  const { wallets } = useWallets();
  const [step, setStep] = useState<Step>("form");
  const [form, setForm] = useState<FormData>(EMPTY);
  const [errors, setErrors] = useState<Partial<FormData>>({});
  const [mintAddress, setMintAddress] = useState("");
  const [launchError, setLaunchError] = useState<string | null>(null);

  function validate(): boolean {
    const e: Partial<FormData> = {};
    if (!form.name.trim())     e.name = "Required";
    if (form.name.length > 32) e.name = "Max 32 chars";
    if (!form.ticker.trim())   e.ticker = "Required";
    if (form.ticker.length > 10) e.ticker = "Max 10 chars";
    if (!/^[A-Z0-9]+$/.test(form.ticker.toUpperCase())) e.ticker = "Letters and numbers only";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleLaunch() {
    if (!authenticated) { login(); return; }
    if (!validate()) return;
    setStep("preview");
  }

  async function confirmLaunch() {
    if (!wallets[0]) { setStep("form"); return; }
    setStep("launching");
    setLaunchError(null);
    try {
      const wallet = wallets[0] as unknown as AnchorWallet;
      const result = await launchSlot(wallet, {
        name:        form.name,
        ticker:      form.ticker.toUpperCase(),
        imageUri:    form.imageUri,
        description: form.description,
        model:       form.model,
      });
      setMintAddress(result.mint);
      setStep("success");
    } catch (e) {
      setLaunchError((e as Error).message);
      setStep("preview");
    }
  }

  return (
    <div className="relative min-h-screen">
      <div className="grid-overlay opacity-30" />
      <div className="mx-auto max-w-6xl px-4 py-10 relative z-10">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-10">
          <div className="inline-flex items-center gap-2 bg-gold/5 border border-gold/20 rounded-full px-3 py-1 mb-4">
            <Sparkles size={10} className="text-gold" />
            <span className="font-orbitron text-[9px] font-bold text-gold/70 tracking-widest">TOKEN LAUNCH</span>
          </div>
          <h1 className="font-orbitron text-3xl md:text-4xl font-black text-white tracking-tight">
            Launch a <span className="gold-text">Slot Token</span>
          </h1>
          <p className="text-white/40 font-rajdhani text-base mt-2">Free to deploy · 96% RTP enforced · You earn 25% of all fees forever</p>
        </motion.div>

        <AnimatePresence mode="wait">
          {step === "form" && (
            <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                <div className="lg:col-span-3 card-panel p-6 space-y-5">
                  <h2 className="font-orbitron text-sm font-bold text-white/70 tracking-widest">TOKEN DETAILS</h2>

                  <div className="space-y-1.5">
                    <label className="section-label">Slot Name <span className="text-red-400 ml-0.5">*</span></label>
                    <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                      placeholder="Dragon Hoard" maxLength={32} className={cn("input-casino", errors.name && "error")} />
                    {errors.name && <p className="text-xs text-red-400 font-rajdhani">{errors.name}</p>}
                  </div>

                  <div className="space-y-1.5">
                    <label className="section-label">Ticker Symbol <span className="text-red-400 ml-0.5">*</span></label>
                    <input value={form.ticker} onChange={(e) => setForm((f) => ({ ...f, ticker: e.target.value.toUpperCase() }))}
                      placeholder="DHOARD" maxLength={10} className={cn("input-casino font-orbitron tracking-widest", errors.ticker && "error")} />
                    {errors.ticker && <p className="text-xs text-red-400 font-rajdhani">{errors.ticker}</p>}
                  </div>

                  <div className="space-y-2">
                    <label className="section-label">Slot Model</label>
                    <div className="grid grid-cols-3 gap-2">
                      {SLOT_MODELS.map((m) => (
                        <button key={m.id} type="button" onClick={() => setForm((f) => ({ ...f, model: m.id as SlotModel }))}
                          className={cn("model-card", form.model === m.id && "selected")}>
                          <div className="text-2xl mb-2">{m.emoji}</div>
                          <p className="font-orbitron text-[10px] font-bold tracking-wide text-white/60">{m.label}</p>
                          <p className="text-[9px] text-white/25 font-rajdhani mt-0.5">{m.reels} reels</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="section-label">Image URL <span className="text-white/20 ml-1">(optional)</span></label>
                    <div className="relative">
                      <Upload size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/25" />
                      <input value={form.imageUri} onChange={(e) => setForm((f) => ({ ...f, imageUri: e.target.value }))}
                        placeholder="https://… or leave blank for AI generation" className="input-casino pl-9" />
                    </div>
                    <p className="flex items-center gap-1.5 text-[11px] text-white/25 font-rajdhani">
                      <Info size={10} className="text-gold/50" />
                      Leave blank — AI generates slot art at graduation
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <label className="section-label">Description</label>
                    <textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                      placeholder="Tell players about your slot theme…" rows={3} className="input-casino resize-none" />
                  </div>

                  <motion.button whileHover={{ scale: 1.02, boxShadow: "0 0 32px rgba(139,92,246,0.6)" }} whileTap={{ scale: 0.97 }}
                    onClick={handleLaunch} className="w-full btn-launch flex items-center justify-center gap-2.5 py-4 text-[13px]">
                    <Rocket size={16} />
                    {authenticated ? "PREVIEW LAUNCH" : "CONNECT WALLET TO LAUNCH"}
                    <ChevronRight size={14} />
                  </motion.button>
                </div>

                <div className="lg:col-span-2 space-y-4">
                  <div className="card-panel p-5">
                    <p className="font-orbitron text-[10px] font-bold text-white/40 tracking-widest mb-3">BONDING CURVE PREVIEW</p>
                    <BondingCurveChart currentMcapUsd={STARTING_MCAP_USD} />
                  </div>

                  <div className="card-panel p-5 space-y-4">
                    <p className="font-orbitron text-[10px] font-bold text-white/40 tracking-widest">HOW IT WORKS</p>
                    {HOW_IT_WORKS.map(({ step: s, title, desc }) => (
                      <div key={s} className="flex gap-3 items-start">
                        <span className="font-orbitron text-[10px] font-black text-purple-500/70 mt-0.5 shrink-0">{s}</span>
                        <div>
                          <p className="font-rajdhani font-bold text-white/70 text-[13px]">{title}</p>
                          <p className="font-rajdhani text-[12px] text-white/35 leading-relaxed">{desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: "Starting MCAP", value: "$5,000" },
                      { label: "Graduation",    value: "$100K" },
                      { label: "RTP",           value: `${RTP_PCT}%` },
                      { label: "Creator Share", value: "25%" },
                    ].map(({ label, value }) => (
                      <div key={label} className="stat-box">
                        <p className="label">{label}</p>
                        <p className="value gold-text text-base">{value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {step === "preview" && (
            <motion.div key="preview" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="max-w-md mx-auto">
              <div className="card-panel p-7 space-y-6">
                <div>
                  <p className="font-orbitron text-[10px] font-bold text-white/30 tracking-widest mb-1">CONFIRM LAUNCH</p>
                  <h2 className="font-orbitron text-xl font-black text-white">Review Details</h2>
                </div>
                <div className="space-y-3">
                  {[
                    { k: "Token Name", v: form.name },
                    { k: "Ticker",     v: `$${form.ticker}` },
                    { k: "Model",      v: SLOT_MODELS.find((m) => m.id === form.model)?.label ?? "" },
                    { k: "Supply",     v: "1,000,000,000 tokens" },
                    { k: "Your Cost",  v: "FREE (~0.01 SOL rent)" },
                    { k: "RTP",        v: `${RTP_PCT}% enforced on-chain` },
                  ].map(({ k, v }) => (
                    <div key={k} className="flex justify-between items-center py-2 border-b border-white/5 last:border-0">
                      <span className="section-label">{k}</span>
                      <span className="font-rajdhani font-bold text-white text-sm">{v}</span>
                    </div>
                  ))}
                </div>
                {launchError && (
                  <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
                    <p className="text-xs font-rajdhani text-red-300 leading-relaxed">{launchError}</p>
                  </div>
                )}
                <div className="bg-purple-500/8 border border-purple-500/20 rounded-xl p-4">
                  <p className="text-xs font-rajdhani text-purple-300/80 leading-relaxed">
                    This will send a transaction to the <strong>ReelBit Token Launch</strong> program on Solana devnet.
                  </p>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setStep("form")} className="flex-1 btn-ghost py-3 text-[12px] font-orbitron">BACK</button>
                  <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} onClick={confirmLaunch}
                    className="flex-1 btn-launch flex items-center justify-center gap-2 py-3">
                    <Rocket size={14} /> LAUNCH
                  </motion.button>
                </div>
              </div>
            </motion.div>
          )}

          {step === "launching" && (
            <motion.div key="launching" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-40 gap-6">
              <div className="relative">
                <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1.2, ease: "linear" }}
                  className="w-16 h-16 rounded-full border-2 border-purple-500/30 border-t-purple-500" />
                <div className="absolute inset-0 flex items-center justify-center text-2xl">🎰</div>
              </div>
              <div className="text-center space-y-1">
                <p className="font-orbitron text-sm font-bold text-white tracking-widest">DEPLOYING TOKEN</p>
                <p className="font-rajdhani text-white/35 text-sm">Sending transaction to Solana…</p>
              </div>
            </motion.div>
          )}

          {step === "success" && (
            <motion.div key="success" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
              className="max-w-md mx-auto text-center space-y-6 py-16">
              <motion.div initial={{ scale: 0, rotate: -30 }} animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 260, damping: 20, delay: 0.1 }}
                className="mx-auto w-20 h-20 rounded-2xl bg-green-500/10 border border-green-500/30 flex items-center justify-center">
                <CheckCircle size={40} className="text-green-400" />
              </motion.div>
              <div className="space-y-2">
                <h2 className="font-orbitron text-2xl font-black text-white">Slot Launched!</h2>
                <p className="font-rajdhani text-white/40">Drive it to $100k mcap to graduate to reelbit.casino!</p>
              </div>
              <div className="bg-white/[0.03] border border-white/5 rounded-xl p-4">
                <p className="section-label mb-2">MINT ADDRESS</p>
                <p className="font-mono text-xs text-white/50 break-all">{mintAddress}</p>
              </div>
              <div className="flex gap-3 justify-center">
                <a href={`/slot/${mintAddress}`}>
                  <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                    className="btn-launch flex items-center gap-2 px-6 py-3">VIEW SLOT</motion.button>
                </a>
                <button onClick={() => { setStep("form"); setForm(EMPTY); }}
                  className="btn-ghost px-6 py-3 font-orbitron text-[11px] tracking-wide">LAUNCH ANOTHER</button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
