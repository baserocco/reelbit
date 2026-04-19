"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Gamepad2, Zap } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createDemoSession, isDemoMode } from "@/lib/demoSession";

const USERNAME_RE = /^[a-zA-Z0-9_]+$/;

export default function DemoPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [error,    setError]    = useState<string | null>(null);

  // Already in demo mode → go to lobby
  useEffect(() => {
    if (isDemoMode()) router.replace("/");
  }, [router]);

  function handleStart(e: React.FormEvent) {
    e.preventDefault();
    const name = username.trim();
    if (name.length < 3 || name.length > 20) {
      setError("Username must be 3–20 characters.");
      return;
    }
    if (!USERNAME_RE.test(name)) {
      setError("Letters, numbers, and underscores only.");
      return;
    }
    createDemoSession(name);
    router.push("/");
  }

  return (
    <div className="min-h-screen flex flex-col">
      <div className="border-b border-white/5 bg-[#06060f]/60 backdrop-blur px-6 py-3 flex items-center">
        <Link href="/" className="flex items-center gap-2 text-white/40 hover:text-white transition-colors text-sm">
          <ArrowLeft size={15} /> Back to Lobby
        </Link>
      </div>

      <div className="flex-1 flex items-center justify-center px-4 py-16">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-sm space-y-8"
        >
          {/* Header */}
          <div className="text-center space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center mx-auto">
              <Gamepad2 size={24} className="text-purple-400" />
            </div>
            <h1 className="font-orbitron text-2xl font-black text-white">Demo Mode</h1>
            <p className="text-white/35 text-sm font-rajdhani">
              No wallet. No deposit. Just pick a username and spin with{" "}
              <span className="text-purple-400 font-bold">$100 free play credits</span>.
            </p>
          </div>

          {/* What's included */}
          <div className="card-panel p-4 space-y-2.5">
            {[
              "Real slot machine engine — same mechanics as live",
              "$100 demo balance, resets when you exit",
              "All slot models (3-Reel, 5-Reel, Free Spins)",
              "Account deleted the moment you log out",
            ].map((item) => (
              <div key={item} className="flex items-start gap-2.5 text-[12px] font-rajdhani text-white/50">
                <Zap size={11} className="text-purple-400 mt-0.5 flex-shrink-0" />
                {item}
              </div>
            ))}
          </div>

          {/* Form */}
          <form onSubmit={handleStart} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[11px] font-orbitron text-white/40 tracking-wider">
                CHOOSE A USERNAME
              </label>
              <input
                value={username}
                onChange={(e) => { setUsername(e.target.value); setError(null); }}
                placeholder="e.g. lucky_spinner"
                maxLength={20}
                autoFocus
                className="input-casino w-full text-base"
              />
              {error && (
                <p className="text-red-400 text-xs font-rajdhani">{error}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={username.trim().length < 3}
              className="w-full py-3.5 rounded-xl font-orbitron font-bold text-sm bg-purple-600 hover:bg-purple-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Start Playing →
            </button>

            <p className="text-[10px] text-white/20 text-center font-rajdhani">
              Demo accounts are temporary and cannot deposit, withdraw, or transfer.
            </p>
          </form>
        </motion.div>
      </div>
    </div>
  );
}
