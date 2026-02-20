import { useState } from "react";

const BENEFITS = [
  "Early access to AI slot builder — months before public launch",
  "Bonus founder allocation on your first bonding curve",
  "Priority placement & visibility in ReelBit Casino",
  "Lifetime higher revenue share (45% vs 35% standard)",
  "Exclusive founder NFT badge displayed on your slot",
  "Join the revolution before public launch — first mover advantage",
];

const WaitlistSection = () => {
  const [email, setEmail] = useState("");
  const [wallet, setWallet] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setStatus("loading");

    try {
      const response = await fetch("https://formspree.io/f/xeellgzg", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, wallet }),
      });

      if (response.ok) {
        setStatus("success");
        setEmail("");
        setWallet("");
      } else {
        setStatus("error");
      }
    } catch {
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
                    <svg
                      className="w-2.5 h-2.5 text-neon-cyan"
                      viewBox="0 0 10 8"
                      fill="none"
                    >
                      <path
                        d="M1 4L3.5 6.5L9 1"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                  <span className="text-white/70 font-inter text-sm leading-relaxed group-hover:text-white/90 transition-colors duration-200">
                    {benefit}
                  </span>
                </li>
              ))}
            </ul>

            {/* Counter */}
            <div className="mt-10 glass-card p-5 inline-flex items-center gap-4">
              <div className="flex -space-x-2">
                {["🎭", "👾", "🤖", "🎯"].map((emoji, i) => (
                  <div
                    key={i}
                    className="w-9 h-9 rounded-full flex items-center justify-center text-sm border-2 border-black"
                    style={{ background: `hsl(${220 + i * 30} 50% 15%)` }}
                  >
                    {emoji}
                  </div>
                ))}
              </div>
              <div>
                <div className="font-orbitron font-bold text-white text-lg">
                  5,000+{" "}
                  <span className="neon-text-cyan text-sm font-semibold">creators</span>
                </div>
                <div className="text-white/40 text-xs font-inter">
                  Already on the waitlist — limited spots remain
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
                  <div className="text-5xl mb-4">🎉</div>
                  <h3 className="font-orbitron font-bold text-2xl text-neon-cyan mb-3">
                    You're In!
                  </h3>
                  <p className="text-white/60 font-inter">
                    Check your email for updates. You'll be among the first to launch your slot on ReelBit.
                  </p>
                  <div className="mt-6 p-3 rounded-lg bg-neon-cyan/5 border border-neon-cyan/20">
                    <p className="text-neon-cyan text-sm font-inter">
                      🔥 You're creator #{(5000 + Math.floor(Math.random() * 200)).toLocaleString()} on the list!
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  <div className="text-center mb-8">
                    <h3 className="font-orbitron font-bold text-2xl text-white mb-2">
                      Reserve Your Spot
                    </h3>
                    <p className="text-white/50 font-inter text-sm">
                      Free to join. No credit card required.
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
                        Something went wrong — try again.
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={status === "loading" || !email}
                      className="btn-primary w-full py-4 rounded-xl text-base disabled:opacity-50 disabled:cursor-not-allowed mt-2"
                    >
                      {status === "loading" ? "⟳ Joining..." : "🚀 Join Waitlist — It's Free"}
                    </button>
                  </form>

                  {/* Trust signals */}
                  <div className="mt-6 pt-6 border-t border-white/5 grid grid-cols-3 gap-4 text-center">
                    {[
                      { icon: "🔒", label: "No spam" },
                      { icon: "⚡", label: "Early access" },
                      { icon: "💎", label: "Bonus perks" },
                    ].map((item) => (
                      <div key={item.label}>
                        <div className="text-lg">{item.icon}</div>
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
