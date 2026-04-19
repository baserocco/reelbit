"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Wallet, LogOut, Zap, User, Gamepad2 } from "lucide-react";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import { useRouter } from "next/navigation";
import { WalletModal } from "@/components/wallet/WalletModal";
import { ProfileModal } from "@/components/profile/ProfileModal";
import { fetchBalance, formatUsdc } from "@/lib/balanceClient";
import { fetchProfile, type UserProfile } from "@/lib/profileClient";
import { shortenAddress } from "@/lib/utils";
import { getDemoSession, exitDemo, type DemoSession } from "@/lib/demoSession";

export function Navbar() {
  const router = useRouter();
  const { authenticated, login, logout } = usePrivy();
  const { wallets } = useWallets();

  const [walletOpen,   setWalletOpen]   = useState(false);
  const [profileOpen,  setProfileOpen]  = useState(false);
  const [balance,      setBalance]      = useState(0);
  const [profile,      setProfile]      = useState<UserProfile | null>(null);
  const [demoSession,  setDemoSession]  = useState<DemoSession | null>(null);

  const wallet        = wallets[0];
  const walletAddress = wallet?.address ?? "";

  // Detect demo session (re-check on every render tick via interval)
  useEffect(() => {
    const sync = () => setDemoSession(getDemoSession());
    sync();
    const id = setInterval(sync, 1_000);
    return () => clearInterval(id);
  }, []);

  // Poll real balance every 10s (non-demo only)
  useEffect(() => {
    if (!walletAddress || demoSession) return;
    fetchBalance(walletAddress).then((e) => setBalance(e.playable));
    const id = setInterval(() => fetchBalance(walletAddress).then((e) => setBalance(e.playable)), 10_000);
    return () => clearInterval(id);
  }, [walletAddress, demoSession]);

  // Load profile once wallet connects
  useEffect(() => {
    if (!walletAddress || demoSession) { setProfile(null); return; }
    fetchProfile(walletAddress).then(setProfile).catch(() => {});
  }, [walletAddress, demoSession]);

  function handleExitDemo() {
    exitDemo();
    setDemoSession(null);
    router.push("/");
  }

  return (
    <>
      <nav className="fixed top-0 inset-x-0 z-30 bg-[#06060f]/85 backdrop-blur border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">

          {/* Logo */}
          <Link href="/" className="font-orbitron text-base font-black bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent tracking-tight">
            reelbit.casino
          </Link>

          {/* Right */}
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-1 text-green-400/50 text-[10px] font-orbitron tracking-wider">
              <Zap size={10} /> 96% RTP
            </div>

            {demoSession ? (
              /* ── Demo mode ── */
              <>
                {/* Demo badge */}
                <div className="flex items-center gap-1.5 bg-purple-500/10 border border-purple-500/20 rounded-xl px-3 py-1.5">
                  <Gamepad2 size={11} className="text-purple-400" />
                  <span className="font-orbitron text-[10px] font-bold text-purple-300">DEMO</span>
                </div>

                {/* Demo balance */}
                <div className="flex items-center gap-2 bg-white/[0.04] border border-white/10 rounded-xl px-3 py-1.5">
                  <Wallet size={12} className="text-purple-400" />
                  <span className="font-orbitron text-[11px] font-bold text-white">
                    {formatUsdc(demoSession.balance)}
                  </span>
                </div>

                {/* Username */}
                <span className="hidden sm:block text-white/40 text-[11px] font-mono">
                  {demoSession.username}
                </span>

                {/* Exit demo */}
                <button
                  onClick={handleExitDemo}
                  className="text-white/15 hover:text-red-400/60 transition-colors"
                  title="Exit demo"
                >
                  <LogOut size={13} />
                </button>
              </>
            ) : authenticated && walletAddress ? (
              /* ── Real wallet mode ── */
              <>
                {/* Balance */}
                <button
                  onClick={() => setWalletOpen(true)}
                  className="flex items-center gap-2 bg-white/[0.04] hover:bg-white/[0.07] border border-white/10 hover:border-purple-500/30 rounded-xl px-3 py-1.5 transition-all"
                >
                  <Wallet size={12} className="text-purple-400" />
                  <span className="font-orbitron text-[11px] font-bold text-white">{formatUsdc(balance)}</span>
                </button>

                {/* Profile avatar */}
                <button
                  onClick={() => setProfileOpen(true)}
                  className="relative w-8 h-8 rounded-full ring-1 ring-white/10 hover:ring-purple-500/50 transition-all overflow-hidden flex-shrink-0"
                  title={profile ? `${profile.username} · #${profile.userId}` : "Set up profile"}
                >
                  {profile?.pfpUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={profile.pfpUrl} alt="pfp" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-purple-700/60 to-purple-900/40 flex items-center justify-center">
                      {profile ? (
                        <span className="font-orbitron text-xs font-black text-white/70">
                          {profile.username[0].toUpperCase()}
                        </span>
                      ) : (
                        <User size={13} className="text-white/30" />
                      )}
                    </div>
                  )}
                </button>

                {/* Username or address */}
                <button
                  onClick={() => setProfileOpen(true)}
                  className="hidden sm:block text-white/35 hover:text-white/60 text-[11px] font-mono transition-colors"
                >
                  {profile ? profile.username : shortenAddress(walletAddress)}
                </button>

                {/* Logout */}
                <button onClick={logout} className="text-white/15 hover:text-white/40 transition-colors" title="Disconnect">
                  <LogOut size={13} />
                </button>
              </>
            ) : (
              /* ── Not connected ── */
              <div className="flex items-center gap-2">
                <Link href="/demo" className="text-[10px] font-orbitron text-purple-400/60 hover:text-purple-400 transition-colors px-2">
                  Demo
                </Link>
                <button onClick={login} className="btn-launch py-2 px-4 text-[11px]">
                  Connect Wallet
                </button>
              </div>
            )}
          </div>
        </div>
      </nav>

      <WalletModal
        open={walletOpen}
        onClose={() => setWalletOpen(false)}
        walletAddress={walletAddress}
        onBalanceChange={setBalance}
      />

      <ProfileModal
        open={profileOpen}
        onClose={() => setProfileOpen(false)}
        walletAddress={walletAddress}
        onProfileChange={setProfile}
      />
    </>
  );
}
