import { useState, useEffect, useRef } from "react";

const SYMBOLS = ["🍒", "💎", "⭐", "🔔", "🍀", "7️⃣"];
const REEL_COUNT = 3;

interface ReelState {
  symbols: string[];
  spinning: boolean;
  result: string;
}

const generateReel = () => {
  const shuffled = [...SYMBOLS].sort(() => Math.random() - 0.5);
  return shuffled;
};

const BondingCurveChart = ({ userCount }: { userCount: number }) => {
  const maxUsers = 5000;
  const progress = Math.min((userCount / maxUsers) * 100, 73);

  const points = Array.from({ length: 50 }, (_, i) => {
    const x = (i / 49) * 100;
    const y = 100 - Math.pow(i / 49, 0.6) * 100;
    return `${x},${y}`;
  }).join(" ");

  return (
    <div className="glass-card p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-orbitron font-bold text-white text-sm">Bonding Curve</h3>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-neon-cyan animate-pulse" />
          <span className="text-neon-cyan text-xs font-inter font-semibold">
            {userCount.toLocaleString()} joined
          </span>
        </div>
      </div>

      {/* SVG Chart */}
      <div className="relative h-32 mb-4">
        <svg viewBox="0 0 100 100" className="w-full h-full" preserveAspectRatio="none">
          {/* Grid lines */}
          {[25, 50, 75].map((y) => (
            <line key={y} x1="0" y1={y} x2="100" y2={y} stroke="rgba(255,255,255,0.05)" strokeWidth="0.5" />
          ))}

          {/* Curve area */}
          <defs>
            <linearGradient id="curveGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#00F5FF" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#00F5FF" stopOpacity="0.02" />
            </linearGradient>
            <clipPath id="progressClip">
              <rect x="0" y="0" width={progress} height="100" />
            </clipPath>
          </defs>

          {/* Background curve */}
          <polyline points={points} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />

          {/* Progress curve */}
          <g clipPath="url(#progressClip)">
            <polyline
              points={points}
              fill="url(#curveGrad)"
              stroke="#00F5FF"
              strokeWidth="1.5"
            />
          </g>

          {/* Progress dot */}
          <circle
            cx={progress}
            cy={100 - Math.pow(progress / 100, 0.6) * 100}
            r="2"
            fill="#00F5FF"
            style={{ filter: "drop-shadow(0 0 4px #00F5FF)" }}
          />
        </svg>
      </div>

      {/* Progress bar */}
      <div className="space-y-2">
        <div className="flex justify-between text-xs font-inter text-white/40">
          <span>Market cap progress</span>
          <span className="text-neon-cyan">{progress.toFixed(0)}%</span>
        </div>
        <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-neon-cyan to-neon-magenta transition-all duration-1000"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="flex justify-between text-xs font-inter text-white/30">
          <span>0 SOL</span>
          <span>🎯 Graduation: 85 SOL</span>
        </div>
      </div>
    </div>
  );
};

const SlotDemoSection = () => {
  const [reels, setReels] = useState<string[][]>([
    ["🍒", "💎", "⭐"],
    ["🔔", "🍀", "7️⃣"],
    ["💎", "🍒", "🔔"],
  ]);
  const [spinning, setSpinning] = useState(false);
  const [bet, setBet] = useState("1.00");
  const [autoSpin, setAutoSpin] = useState(false);
  const [win, setWin] = useState<string | null>(null);
  const [credits, setCredits] = useState(100);
  const [userCount, setUserCount] = useState(3842);
  const autoSpinRef = useRef<NodeJS.Timeout>();

  const doSpin = () => {
    if (spinning) return;
    setSpinning(true);
    setWin(null);

    const betVal = parseFloat(bet) || 1;
    setCredits((c) => Math.max(0, c - betVal));

    // Animate reels with staggered delays
    setTimeout(() => {
      const newReels = Array.from({ length: REEL_COUNT }, () =>
        Array.from({ length: 3 }, () => SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)])
      );
      setReels(newReels);
      setSpinning(false);

      // Check win (center row)
      const centerRow = newReels.map((r) => r[1]);
      if (centerRow.every((s) => s === centerRow[0])) {
        setWin("JACKPOT! 🎉");
        setCredits((c) => c + betVal * 50);
      } else if (new Set(centerRow).size === 2) {
        setWin("Winner! 🎊");
        setCredits((c) => c + betVal * 3);
      }
    }, 1500);
  };

  useEffect(() => {
    if (autoSpin) {
      autoSpinRef.current = setInterval(doSpin, 2500);
    } else {
      clearInterval(autoSpinRef.current);
    }
    return () => clearInterval(autoSpinRef.current);
  }, [autoSpin, spinning]);

  // Slowly increment user count
  useEffect(() => {
    const interval = setInterval(() => {
      setUserCount((c) => c + Math.floor(Math.random() * 3));
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <section id="demo" className="relative py-24 lg:py-32 px-4 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-black/95 via-black to-black/95" />
      
      {/* Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-neon-magenta/4 blur-[120px] pointer-events-none" />

      <div className="relative max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          <span className="inline-block text-neon-magenta font-orbitron text-xs tracking-widest uppercase font-semibold mb-4">
            Live Demo
          </span>
          <h2 className="font-orbitron font-bold text-3xl sm:text-4xl lg:text-5xl text-white">
            See It{" "}
            <span className="gradient-text">In Action</span>
          </h2>
          <p className="mt-4 text-white/50 font-inter max-w-xl mx-auto">
            Play the demo slot below. This is what you'll be building — and earning from.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8 items-start">
          {/* Slot Machine */}
          <div className="glass-card p-8">
            {/* Machine header */}
            <div className="text-center mb-6">
              <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-neon-gold/10 border border-neon-gold/30 mb-3">
                <span className="neon-text-gold text-xs font-orbitron font-semibold tracking-wider">
                  🎰 COSMIC FORTUNE
                </span>
              </div>
              {win && (
                <div className="text-2xl font-orbitron font-black animate-bounce">
                  <span className={win.includes("JACKPOT") ? "neon-text-gold" : "text-neon-cyan"}>
                    {win}
                  </span>
                </div>
              )}
            </div>

            {/* Reels */}
            <div
              className="relative mb-6 rounded-xl overflow-hidden"
              style={{
                background: "linear-gradient(180deg, #0A0010 0%, #050010 100%)",
                border: "2px solid rgba(0,245,255,0.2)",
                boxShadow: "0 0 30px rgba(0,245,255,0.1), inset 0 0 30px rgba(0,0,0,0.5)",
              }}
            >
              {/* Win line */}
              <div
                className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-px z-10"
                style={{ background: "linear-gradient(90deg, transparent, #FFD700, transparent)" }}
              />

              <div className="grid grid-cols-3 gap-0 p-4">
                {reels.map((reel, ri) => (
                  <div key={ri} className="flex flex-col gap-2">
                    {reel.map((symbol, si) => (
                      <div
                        key={si}
                        className={`flex items-center justify-center h-16 rounded-lg text-3xl transition-all duration-300 ${
                          spinning ? "animate-pulse opacity-60" : ""
                        } ${si === 1 ? "scale-110" : "opacity-70"}`}
                        style={{
                          background: si === 1 ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.02)",
                          border: si === 1 ? "1px solid rgba(255,255,255,0.1)" : "none",
                        }}
                      >
                        {spinning ? (
                          <span className="text-white/30 text-2xl animate-spin-slow">◈</span>
                        ) : (
                          symbol
                        )}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>

            {/* Credits */}
            <div className="flex justify-between items-center mb-4 px-1">
              <div>
                <div className="text-white/30 text-xs font-inter uppercase tracking-wider">Credits</div>
                <div className="text-neon-cyan font-orbitron font-bold text-xl">
                  {credits.toFixed(2)}
                </div>
              </div>
              <div className="text-center">
                <div className="text-white/30 text-xs font-inter uppercase tracking-wider">Bet</div>
                <input
                  type="number"
                  value={bet}
                  onChange={(e) => setBet(e.target.value)}
                  className="w-24 text-center bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-white font-orbitron text-lg focus:outline-none focus:border-neon-cyan/50"
                  step="0.5"
                  min="0.5"
                />
              </div>
              <div>
                <div className="text-white/30 text-xs font-inter uppercase tracking-wider">Win</div>
                <div className="text-neon-gold font-orbitron font-bold text-xl">
                  {win ? (win.includes("JACKPOT") ? `${(parseFloat(bet) * 50).toFixed(2)}` : `${(parseFloat(bet) * 3).toFixed(2)}`) : "0.00"}
                </div>
              </div>
            </div>

            {/* Controls */}
            <div className="flex gap-3">
              <button
                onClick={doSpin}
                disabled={spinning}
                className="btn-primary flex-1 py-3 rounded-xl text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {spinning ? "⟳ Spinning..." : "🎰 SPIN"}
              </button>
              <button
                onClick={() => setAutoSpin(!autoSpin)}
                className={`px-4 py-3 rounded-xl text-sm font-orbitron font-semibold border transition-all duration-200 ${
                  autoSpin
                    ? "bg-neon-magenta/20 border-neon-magenta/50 text-neon-magenta"
                    : "btn-outline"
                }`}
              >
                AUTO
              </button>
            </div>
          </div>

          {/* Right panel: Bonding curve + earnings */}
          <div className="space-y-6">
            <BondingCurveChart userCount={userCount} />

            {/* Live activity feed */}
            <div className="glass-card p-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-2 h-2 rounded-full bg-neon-cyan animate-pulse" />
                <span className="font-orbitron text-white text-sm font-bold">Live Activity</span>
              </div>
              <div className="space-y-2">
                {[
                  { addr: "8xK2...fP3q", action: "bought 50 shares", time: "2s ago", color: "text-neon-cyan" },
                  { addr: "9mN1...aR7w", action: "spun 2.5 SOL", time: "5s ago", color: "text-neon-gold" },
                  { addr: "3pQ8...bH4e", action: "bought 20 shares", time: "12s ago", color: "text-neon-cyan" },
                  { addr: "7jL5...cW9k", action: "spun 0.8 SOL", time: "18s ago", color: "text-neon-gold" },
                ].map((item, i) => (
                  <div key={i} className="flex justify-between items-center text-xs font-inter py-1.5 border-b border-white/5 last:border-0">
                    <div>
                      <span className="text-neon-cyan/70 font-mono">{item.addr}</span>
                      <span className="text-white/40 ml-2">{item.action}</span>
                    </div>
                    <span className="text-white/25">{item.time}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Creator earnings preview */}
            <div
              className="glass-card p-6"
              style={{ border: "1px solid rgba(255,215,0,0.2)", boxShadow: "0 0 20px rgba(255,215,0,0.05)" }}
            >
              <div className="text-white/50 text-xs font-inter uppercase tracking-wider mb-3">
                Creator earnings (this slot)
              </div>
              <div className="font-orbitron font-black text-4xl neon-text-gold mb-1">
                +2.84 SOL
              </div>
              <div className="text-white/30 text-xs font-inter">Last 24 hours • ~$412 USD</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default SlotDemoSection;
