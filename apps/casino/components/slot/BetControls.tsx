"use client";

import { motion } from "framer-motion";
import { Zap, ChevronUp, ChevronDown } from "lucide-react";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import { cn } from "@/lib/utils";

const BET_STEPS = [
  0.01, 0.05, 0.1, 0.25, 0.5, 1, 2, 5, 10,
].map((sol) => sol * LAMPORTS_PER_SOL);

interface Props {
  betLamports:   number;
  onBetChange:   (lamports: number) => void;
  balance:       number;
  isSpinning:    boolean;
  onSpin:        () => Promise<void>;
  freeSpinsLeft: number;
}

export function BetControls({ betLamports, onBetChange, balance, isSpinning, onSpin, freeSpinsLeft }: Props) {
  const betSol     = betLamports / LAMPORTS_PER_SOL;
  const currentIdx = BET_STEPS.indexOf(betLamports);

  function stepBet(dir: 1 | -1) {
    const next = BET_STEPS[currentIdx + dir];
    if (next !== undefined && next <= balance) onBetChange(next);
  }

  const canSpin = !isSpinning && (freeSpinsLeft > 0 || betLamports <= balance);

  return (
    <div className="flex items-center gap-4 flex-wrap justify-center">
      {/* Bet selector */}
      <div className="flex items-center gap-2 bg-white/[0.04] border border-white/10 rounded-xl px-4 py-2">
        <button
          onClick={() => stepBet(-1)}
          disabled={currentIdx <= 0 || isSpinning}
          className="text-white/40 hover:text-white disabled:opacity-20 transition-colors"
        >
          <ChevronDown size={18} />
        </button>
        <div className="text-center min-w-[64px]">
          <div className="text-white font-mono font-semibold">{betSol} SOL</div>
          <div className="text-white/30 text-xs">per spin</div>
        </div>
        <button
          onClick={() => stepBet(1)}
          disabled={currentIdx >= BET_STEPS.length - 1 || BET_STEPS[currentIdx + 1] > balance || isSpinning}
          className="text-white/40 hover:text-white disabled:opacity-20 transition-colors"
        >
          <ChevronUp size={18} />
        </button>
      </div>

      {/* Spin button */}
      <motion.button
        whileHover={canSpin ? { scale: 1.05 } : {}}
        whileTap={canSpin ? { scale: 0.95 } : {}}
        onClick={onSpin}
        disabled={!canSpin}
        className={cn(
          "flex items-center gap-2 rounded-xl px-8 py-3.5 font-bold text-white text-lg transition-all shadow-lg",
          freeSpinsLeft > 0
            ? "bg-green-600 hover:bg-green-500 shadow-green-900/40"
            : "bg-purple-600 hover:bg-purple-500 shadow-purple-900/40",
          !canSpin && "opacity-50 cursor-not-allowed",
        )}
      >
        {isSpinning ? (
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 0.6, ease: "linear" }}
            className="w-5 h-5 rounded-full border-2 border-white border-t-transparent"
          />
        ) : (
          <>
            <Zap size={18} />
            {freeSpinsLeft > 0 ? `FREE SPIN (${freeSpinsLeft})` : "SPIN"}
          </>
        )}
      </motion.button>
    </div>
  );
}
