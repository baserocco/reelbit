import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

const BENEFITS = [
  "Early access to AI slot builder — months before public launch",
  "Bonus founder allocation on your first bonding curve",
  "Priority placement and visibility in ReelBit Casino",
  "+5% revenue boost for your first 6 months (35% vs 30% standard)",
  "Exclusive founder badge displayed on your slot",
  "Referral rewards — earn 2% of referred creators' revenue for 3 months",
  "First mover advantage before public launch",
];

const WaitlistSection = () => {
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState("");
  const [wallet, setWallet] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const refCode = searchParams.get("ref");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setStatus("loading");

    try {
      const { data, error } = await supabase.functions.invoke("waitlist-signup", {
        body: { email, wallet, ref: refCode },
      });

      if (error) throw error;

      if (data?.error) {
        if (data.error.includes("already on the waitlist")) {
          setMessage("You're already confirmed!");
          setStatus("success");
        } else {
          setMessage(data.error);
          setStatus("error");
        }
        return;
      }

      setMessage(data?.message || "Check your email to confirm your spot!");
      setStatus("success");
      setEmail("");
      setWallet("");
    } catch {
      setMessage("Something went wrong — try again.");
      setStatus("error");
    }
  };

  return (
    <section id="waitlist" className="relative py-24 lg:py-32 px-4 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/95 to-black" />
      <div className="absolute inset-0 bg-gradient-to-br from-neon-cyan/3 via-transparent to-neon-magenta/3" />

      {/* Grid */}
      <div
        className="absolute inset-0 opacity-4 pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(rgba(0,245,255,0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(0,245,255,0.15) 1px, transparent 1px)`,
          backgroundSize: "80px 80px",
        }}
      />

      <div className="relative max-w-6xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-16 items-start">
          {/* Left: Benefits */}
          <div>
            <span className="inline-block text-neon-cyan font-orbitron text-xs tracking-widest uppercase font-semibold mb-4">
              Limited Access
            </span>
            <h2 className="font-orbitron font-bold text-3xl sm:text-4xl lg:text-5xl text-white leading-tight mb-6">
              Be First to Launch{" "}
              <br />
              <span className="gradient-text">Your Own Slot</span>
            </h2>
            <p className="text-white/50 font-inter text-lg mb-10 leading-relaxed">
              Waitlist members get exclusive perks unavailable after public launch. Spots are extremely limited.
            </p>

            <ul className="space-y-4">
              {BENEFITS.map((benefit, i) => (
                <li key={i} className="flex items-start gap-3 group">
                  <div className="mt-0.5 flex-shrink-0 w-5 h-5 rounded-full bg-neon-cyan/10 border border-neon-cyan/30 flex items-center justify-center transition-all duration-300 group-hover:bg-neon-cyan/20 group-hover:border-neon-cyan/60">
                    <svg className="w-2.5 h-2.5 text-neon-cyan" viewBox="0 0 10 8" fill="none">
                      <path d="M1 4L3.5 6.5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <span className="text-white/70 font-inter text-sm leading-relaxed group-hover:text-white/90 transition-colors duration-200">
                    {benefit}
                  </span>
                </li>
              ))}
            </ul>

            {/* Referral highlight */}
            <div className="mt-10 glass-card p-5 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-neon-magenta/10 border border-neon-magenta/30 flex items-center justify-center">
                  <svg className="w-5 h-5 text-neon-magenta" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                </div>
                <div>
                  <div className="font-orbitron font-bold text-white text-sm">
                    Refer &amp; Earn
                  </div>
                  <div className="text-white/40 text-xs font-inter">
                    Invite creators and earn 2% of their slot revenue for 3 months
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex -space-x-2">
                  {[0, 1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="w-8 h-8 rounded-full border-2 border-black flex items-center justify-center"
                      style={{ background: `hsl(${220 + i * 30} 50% 15%)` }}
                    >
                      <svg className="w-4 h-4 text-white/40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="7" r="4" />
                        <path d="M5.5 21v-2a6.5 6.5 0 0 1 13 0v2" />
                      </svg>
                    </div>
                  ))}
                </div>
                <div>
                  <div className="font-orbitron font-bold text-white text-lg">
                    5,000+{" "}
                    <span className="neon-text-cyan text-sm font-semibold">creators</span>
                  </div>
                  <div className="text-white/40 text-xs font-inter">
                    Already on the waitlist
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Form */}
          <div>
            <div
              className="glass-card p-8 lg:p-10"
              style={{
                border: "1px solid rgba(0,245,255,0.15)",
                boxShadow: "0 0 60px rgba(0,245,255,0.06), 0 0 120px rgba(255,0,170,0.04)",
              }}
            >
              {status === "success" ? (
                <div className="text-center py-8">
                <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-neon-cyan/10 border border-neon-cyan/30 flex items-center justify-center">
                    <svg className="w-7 h-7 text-neon-cyan" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect width="20" height="16" x="2" y="4" rx="2" />
                      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                    </svg>
                  </div>
                  <h3 className="font-orbitron font-bold text-2xl text-neon-cyan mb-3">
                    Check Your Email!
                  </h3>
                  <p className="text-white/60 font-inter">
                    {message}
                  </p>
                  <div className="mt-6 p-3 rounded-lg bg-neon-cyan/5 border border-neon-cyan/20">
                    <p className="text-neon-cyan text-sm font-inter">
                      Click the confirmation link in your email to secure your spot
                    </p>
                  </div>
                  <button
                    onClick={() => { setStatus("idle"); setMessage(""); }}
                    className="mt-4 text-white/40 text-sm font-inter hover:text-white/70 transition-colors"
                  >
                    Use a different email →
                  </button>
                </div>
              ) : (
                <>
                  <div className="text-center mb-8">
                    <h3 className="font-orbitron font-bold text-2xl text-white mb-2">
                      Reserve Your Spot
                    </h3>
                    <p className="text-white/50 font-inter text-sm">
                      Free to join. We'll send a confirmation email.
                    </p>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <label className="block text-white/60 text-xs font-inter uppercase tracking-wider mb-2">
                        Email Address *
                      </label>
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="creator@example.com"
                        className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/25 font-inter text-sm focus:outline-none focus:border-neon-cyan/50 focus:bg-neon-cyan/3 transition-all duration-200"
                      />
                    </div>

                    <div>
                      <label className="block text-white/60 text-xs font-inter uppercase tracking-wider mb-2">
                        Solana Wallet{" "}
                        <span className="text-white/30 normal-case">(optional — for bonus allocation)</span>
                      </label>
                      <input
                        type="text"
                        value={wallet}
                        onChange={(e) => setWallet(e.target.value)}
                        placeholder="Optional Solana wallet"
                        className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/25 font-inter text-sm focus:outline-none focus:border-neon-cyan/50 focus:bg-neon-cyan/3 transition-all duration-200"
                      />
                    </div>

                    {status === "error" && (
                      <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm font-inter">
                        {message || "Something went wrong — try again."}
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={status === "loading" || !email}
                      className="btn-primary w-full py-4 rounded-xl text-base disabled:opacity-50 disabled:cursor-not-allowed mt-2"
                    >
                      {status === "loading" ? "Joining..." : "Join Waitlist -- It's Free"}
                    </button>
                  </form>

                  {/* Trust signals */}
                  <div className="mt-6 pt-6 border-t border-white/5 grid grid-cols-3 gap-4 text-center">
                    {[
                      { label: "No spam", icon: <svg className="w-5 h-5 text-neon-cyan" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect width="18" height="11" x="3" y="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg> },
                      { label: "Email confirm", icon: <svg className="w-5 h-5 text-neon-cyan" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect width="20" height="16" x="2" y="4" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" /></svg> },
                      { label: "Bonus perks", icon: <svg className="w-5 h-5 text-neon-gold" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg> },
                    ].map((item) => (
                      <div key={item.label}>
                        <div className="flex justify-center">{item.icon}</div>
                        <div className="text-white/30 text-xs font-inter mt-1">{item.label}</div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default WaitlistSection;
