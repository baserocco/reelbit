import { useState, useEffect, useRef, useCallback } from "react";

/* ─── Audio helpers ──────────────────────────────────────────── */
const createAudioContext = () => {
  try {
    return new (window.AudioContext || (window as any).webkitAudioContext)();
  } catch {
    return null;
  }
};

const playTone = (ctx: AudioContext, freq: number, duration: number, type: OscillatorType = "sine", gain = 0.12) => {
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.connect(g);
  g.connect(ctx.destination);
  osc.type = type;
  osc.frequency.setValueAtTime(freq, ctx.currentTime);
  g.gain.setValueAtTime(gain, ctx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + duration);
};

const playSpinSound = (ctx: AudioContext) => {
  [200, 300, 400, 500].forEach((f, i) => setTimeout(() => playTone(ctx, f, 0.1, "sawtooth", 0.06), i * 50));
};
const playWinSound = (ctx: AudioContext) => {
  [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => playTone(ctx, f, 0.25, "sine", 0.15), i * 100));
};
const playJackpotSound = (ctx: AudioContext) => {
  [523, 659, 784, 1047, 1319, 1568].forEach((f, i) => {
    setTimeout(() => playTone(ctx, f, 0.35, "sine", 0.2), i * 80);
    setTimeout(() => playTone(ctx, f * 1.5, 0.25, "triangle", 0.08), i * 80 + 40);
  });
};

/* ─── Symbol definitions ─────────────────────────────────────── */
interface SymbolDef {
  id: string;
  icon: string;
  label: string;
  bg: string;
  glow: string;
  multiplier: number;
}

const SYMBOLS: SymbolDef[] = [
  { id: "wild", icon: "🐱", label: "WILD", bg: "linear-gradient(145deg, #FFD700 0%, #FF8C00 100%)", glow: "rgba(255,215,0,0.6)", multiplier: 10 },
  { id: "scatter", icon: "🐾", label: "SCATTER", bg: "linear-gradient(145deg, #E040FB 0%, #7C4DFF 100%)", glow: "rgba(224,64,251,0.6)", multiplier: 5 },
  { id: "fish", icon: "🐟", label: "FISH", bg: "linear-gradient(145deg, #00E5FF 0%, #0091EA 100%)", glow: "rgba(0,229,255,0.5)", multiplier: 4 },
  { id: "yarn", icon: "🧶", label: "YARN", bg: "linear-gradient(145deg, #FF4081 0%, #F50057 100%)", glow: "rgba(255,64,129,0.5)", multiplier: 3 },
  { id: "milk", icon: "🥛", label: "MILK", bg: "linear-gradient(145deg, #B2EBF2 0%, #80DEEA 100%)", glow: "rgba(178,235,242,0.4)", multiplier: 2 },
  { id: "bell", icon: "🔔", label: "BELL", bg: "linear-gradient(145deg, #FFAB00 0%, #FF6D00 100%)", glow: "rgba(255,171,0,0.5)", multiplier: 2 },
];

const randomSymbol = () => SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];

/* ─── Symbol Tile ────────────────────────────────────────────── */
const SymbolTile = ({ symbol, isWin, isCenter, spinning }: {
  symbol: SymbolDef;
  isWin: boolean;
  isCenter: boolean;
  spinning: boolean;
}) => (
  <div
    className="relative flex flex-col items-center justify-center transition-all duration-300"
    style={{
      width: "100%",
      aspectRatio: "1",
      background: isCenter ? symbol.bg : "linear-gradient(145deg, rgba(20,20,35,0.9), rgba(10,10,20,0.95))",
      borderRadius: 14,
      border: isCenter && isWin
        ? `2px solid ${symbol.glow}`
        : isCenter
        ? "1px solid rgba(255,255,255,0.12)"
        : "1px solid rgba(255,255,255,0.05)",
      boxShadow: isCenter && isWin
        ? `0 0 20px ${symbol.glow}, 0 0 40px ${symbol.glow}, inset 0 0 15px ${symbol.glow}`
        : isCenter
        ? "0 4px 20px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.08)"
        : "none",
      opacity: isCenter ? 1 : 0.4,
      transform: isCenter && isWin ? "scale(1.05)" : "scale(1)",
      filter: spinning ? "blur(2px)" : "none",
    }}
  >
    <span style={{
      fontSize: isCenter ? "clamp(28px, 4vw, 40px)" : "clamp(18px, 2.5vw, 24px)",
      lineHeight: 1,
      filter: isCenter ? `drop-shadow(0 2px 6px rgba(0,0,0,0.4))` : "none",
    }}>
      {symbol.icon}
    </span>
    {isCenter && (
      <span style={{
        fontSize: "8px",
        fontFamily: "Orbitron, sans-serif",
        fontWeight: 800,
        letterSpacing: "0.12em",
        marginTop: 4,
        color: isWin ? "#fff" : "rgba(255,255,255,0.9)",
        textShadow: isWin ? `0 0 8px ${symbol.glow}` : "none",
      }}>
        {symbol.label}
      </span>
    )}
    {/* Shine effect */}
    {isCenter && !spinning && (
      <div style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        height: "50%",
        borderRadius: "14px 14px 0 0",
        background: "linear-gradient(180deg, rgba(255,255,255,0.12) 0%, transparent 100%)",
        pointerEvents: "none",
      }} />
    )}
  </div>
);

/* ─── Spinning Reel Strip ────────────────────────────────────── */
const ReelStrip = ({ symbols, spinning, delay }: {
  symbols: SymbolDef[];
  spinning: boolean;
  delay: number;
}) => {
  const [displaySymbols, setDisplaySymbols] = useState(symbols);
  const [isAnimating, setIsAnimating] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (spinning) {
      setIsAnimating(true);
      // Rapidly cycle symbols
      intervalRef.current = setInterval(() => {
        setDisplaySymbols([randomSymbol(), randomSymbol(), randomSymbol()]);
      }, 80);

      // Stop after delay
      setTimeout(() => {
        clearInterval(intervalRef.current);
        setDisplaySymbols(symbols);
        setIsAnimating(false);
      }, delay);
    }
    return () => clearInterval(intervalRef.current);
  }, [spinning, symbols, delay]);

  return (
    <div className="flex flex-col gap-1.5 sm:gap-2 flex-1">
      {displaySymbols.map((sym, i) => (
        <SymbolTile
          key={`${i}`}
          symbol={sym}
          isCenter={i === 1}
          isWin={false}
          spinning={isAnimating}
        />
      ))}
    </div>
  );
};

/* ─── Bonding Curve Chart ────────────────────────────────────── */
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
          <span className="text-neon-cyan text-xs font-inter font-semibold">{userCount.toLocaleString()} joined</span>
        </div>
      </div>
      <div className="relative h-32 mb-4">
        <svg viewBox="0 0 100 100" className="w-full h-full" preserveAspectRatio="none">
          {[25, 50, 75].map((y) => (
            <line key={y} x1="0" y1={y} x2="100" y2={y} stroke="rgba(255,255,255,0.05)" strokeWidth="0.5" />
          ))}
          <defs>
            <linearGradient id="curveGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#00F5FF" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#00F5FF" stopOpacity="0.02" />
            </linearGradient>
            <clipPath id="progressClip"><rect x="0" y="0" width={progress} height="100" /></clipPath>
          </defs>
          <polyline points={points} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
          <g clipPath="url(#progressClip)">
            <polyline points={points} fill="url(#curveGrad)" stroke="#00F5FF" strokeWidth="1.5" />
          </g>
          <circle cx={progress} cy={100 - Math.pow(progress / 100, 0.6) * 100} r="2" fill="#00F5FF" style={{ filter: "drop-shadow(0 0 4px #00F5FF)" }} />
        </svg>
      </div>
      <div className="space-y-2">
        <div className="flex justify-between text-xs font-inter text-white/40">
          <span>Market cap progress</span>
          <span className="text-neon-cyan">{progress.toFixed(0)}%</span>
        </div>
        <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
          <div className="h-full rounded-full bg-gradient-to-r from-neon-cyan to-neon-magenta transition-all duration-1000" style={{ width: `${progress}%` }} />
        </div>
        <div className="flex justify-between text-xs font-inter text-white/30">
          <span>0 SOL</span>
          <span>🐱 Graduation: 85 SOL</span>
        </div>
      </div>
    </div>
  );
};

/* ─── Paw Rain ───────────────────────────────────────────────── */
const PawRain = ({ active }: { active: boolean }) => {
  const items = useRef(
    Array.from({ length: 40 }, (_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      delay: `${Math.random() * 1.5}s`,
      duration: `${1.2 + Math.random() * 1.5}s`,
      size: 16 + Math.floor(Math.random() * 20),
      emoji: ["🐾", "🪙", "✨", "🐱"][Math.floor(Math.random() * 4)],
    }))
  );
  if (!active) return null;
  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {items.current.map((c) => (
        <div key={c.id} className="absolute top-0 select-none" style={{
          left: c.left, fontSize: c.size,
          animationName: "coinDrop", animationDuration: c.duration,
          animationDelay: c.delay, animationTimingFunction: "linear",
          animationIterationCount: "3", animationFillMode: "forwards",
        }}>{c.emoji}</div>
      ))}
    </div>
  );
};

/* ─── Main Section ───────────────────────────────────────────── */
const SlotDemoSection = () => {
  const [reels, setReels] = useState<SymbolDef[][]>([
    [SYMBOLS[4], SYMBOLS[0], SYMBOLS[2]],
    [SYMBOLS[3], SYMBOLS[1], SYMBOLS[5]],
    [SYMBOLS[1], SYMBOLS[0], SYMBOLS[3]],
  ]);
  const [spinning, setSpinning] = useState(false);
  const [bet, setBet] = useState("1.00");
  const [autoSpin, setAutoSpin] = useState(false);
  const [win, setWin] = useState<"jackpot" | "small" | null>(null);
  const [credits, setCredits] = useState(100);
  const [userCount, setUserCount] = useState(3842);
  const [soundOn, setSoundOn] = useState(false);
  const [showPawRain, setShowPawRain] = useState(false);

  const autoSpinRef = useRef<NodeJS.Timeout>();
  const audioCtxRef = useRef<AudioContext | null>(null);
  const getAudio = () => {
    if (!audioCtxRef.current) audioCtxRef.current = createAudioContext();
    return audioCtxRef.current;
  };

  const doSpin = useCallback(() => {
    if (spinning) return;
    setSpinning(true);
    setWin(null);
    setShowPawRain(false);

    const betVal = parseFloat(bet) || 1;
    setCredits((c) => Math.max(0, c - betVal));
    if (soundOn) { const ctx = getAudio(); if (ctx) playSpinSound(ctx); }

    const newReels = Array.from({ length: 3 }, () =>
      Array.from({ length: 3 }, () => randomSymbol())
    );

    setTimeout(() => {
      setReels(newReels);
      setSpinning(false);

      const centerRow = newReels.map((r) => r[1]);
      if (centerRow.every((s) => s.id === centerRow[0].id)) {
        setWin("jackpot");
        setCredits((c) => c + betVal * centerRow[0].multiplier * 5);
        setShowPawRain(true);
        if (soundOn) { const ctx = getAudio(); if (ctx) playJackpotSound(ctx); }
        setTimeout(() => setShowPawRain(false), 5000);
      } else if (new Set(centerRow.map((s) => s.id)).size === 2) {
        setWin("small");
        setCredits((c) => c + betVal * 3);
        if (soundOn) { const ctx = getAudio(); if (ctx) playWinSound(ctx); }
      }
    }, 1800);
  }, [spinning, bet, soundOn]);

  useEffect(() => {
    if (autoSpin) autoSpinRef.current = setInterval(doSpin, 3000);
    else clearInterval(autoSpinRef.current);
    return () => clearInterval(autoSpinRef.current);
  }, [autoSpin, doSpin]);

  useEffect(() => {
    const iv = setInterval(() => setUserCount((c) => c + Math.floor(Math.random() * 3)), 2000);
    return () => clearInterval(iv);
  }, []);

  const winAmount = win === "jackpot"
    ? (parseFloat(bet) * reels[0][1].multiplier * 5).toFixed(2)
    : win === "small"
    ? (parseFloat(bet) * 3).toFixed(2)
    : "0.00";

  return (
    <>
      <style>{`
        @keyframes coinDrop {
          0% { transform: translateY(-60px) rotate(0deg); opacity: 1; }
          80% { opacity: 1; }
          100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
        }
        @keyframes jackpotPulse {
          0%, 100% { box-shadow: 0 0 30px rgba(255,215,0,0.2), inset 0 0 30px rgba(255,215,0,0.05); }
          50% { box-shadow: 0 0 60px rgba(255,215,0,0.4), inset 0 0 40px rgba(255,215,0,0.1); }
        }
        @keyframes winFlash {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }
      `}</style>

      <PawRain active={showPawRain} />

      <section id="demo" className="relative py-24 lg:py-32 px-4 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-black/95 via-black to-black/95" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-neon-magenta/5 blur-[150px] pointer-events-none" />

        <div className="relative max-w-6xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <span className="inline-block text-neon-magenta font-orbitron text-xs tracking-widest uppercase font-semibold mb-4">
              🐱 Live Demo
            </span>
            <h2 className="font-orbitron font-bold text-3xl sm:text-4xl lg:text-5xl text-white">
              See It <span className="gradient-text">In Action</span>
            </h2>
            <p className="mt-4 text-white/50 font-inter max-w-xl mx-auto">
              Play the demo slot below. This is what you'll be building — and earning from.
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-8 items-start">
            {/* ── Slot Machine ── */}
            <div
              className="rounded-2xl overflow-hidden relative"
              style={{
                background: "linear-gradient(180deg, #12101f 0%, #0a0816 100%)",
                border: "1px solid rgba(255,255,255,0.08)",
                boxShadow: "0 20px 80px rgba(0,0,0,0.6)",
                animation: win === "jackpot" ? "jackpotPulse 0.6s ease-in-out infinite" : "none",
              }}
            >
              {/* Slot header bar */}
              <div className="px-5 py-3 flex items-center justify-between" style={{
                background: "linear-gradient(90deg, rgba(255,215,0,0.08), rgba(224,64,251,0.08), rgba(0,229,255,0.08))",
                borderBottom: "1px solid rgba(255,255,255,0.06)",
              }}>
                <div className="flex items-center gap-2">
                  <span className="text-lg">🐱</span>
                  <span className="font-orbitron font-bold text-sm text-white tracking-wider">LUCKY CATS</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-white/30 text-xs font-inter">RTP 96.5%</span>
                  <button onClick={() => setSoundOn((s) => !s)}
                    className={`w-7 h-7 rounded-md border flex items-center justify-center text-xs transition-all ${
                      soundOn ? "bg-neon-cyan/10 border-neon-cyan/40 text-neon-cyan" : "bg-white/5 border-white/10 text-white/30"
                    }`}>
                    {soundOn ? "🔊" : "🔇"}
                  </button>
                </div>
              </div>

              {/* Reel window */}
              <div className="relative px-4 sm:px-6 py-6">
                {/* Frame decoration */}
                <div className="absolute inset-x-4 sm:inset-x-6 top-0 h-px" style={{ background: "linear-gradient(90deg, transparent, rgba(255,215,0,0.3), transparent)" }} />
                <div className="absolute inset-x-4 sm:inset-x-6 bottom-0 h-px" style={{ background: "linear-gradient(90deg, transparent, rgba(224,64,251,0.3), transparent)" }} />

                {/* Reels grid */}
                <div className="flex gap-2 sm:gap-3">
                  {reels.map((reel, i) => (
                    <ReelStrip key={i} symbols={reel} spinning={spinning} delay={800 + i * 400} />
                  ))}
                </div>

                {/* Win line indicator */}
                <div className="absolute left-2 right-2 top-1/2 -translate-y-1/2 pointer-events-none" style={{ height: 2 }}>
                  <div className="h-full rounded-full" style={{
                    background: win ? "linear-gradient(90deg, transparent, rgba(255,215,0,0.8), transparent)" : "linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent)",
                    boxShadow: win ? "0 0 12px rgba(255,215,0,0.4)" : "none",
                  }} />
                </div>

                {/* Win overlay */}
                {win === "jackpot" && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10 rounded-xl" style={{
                    background: "radial-gradient(circle, rgba(255,215,0,0.15), transparent 70%)",
                  }}>
                    <div className="font-orbitron font-black text-3xl sm:text-4xl animate-bounce"
                      style={{ color: "#FFD700", textShadow: "0 0 30px #FFD700, 0 0 60px #FF8C00" }}>
                      🐱 JACKPOT! 🐱
                    </div>
                  </div>
                )}
                {win === "small" && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                    <div className="font-orbitron font-black text-2xl sm:text-3xl"
                      style={{ color: "#00F5FF", textShadow: "0 0 20px #00F5FF", animation: "winFlash 0.4s ease 3" }}>
                      🐾 Winner!
                    </div>
                  </div>
                )}
              </div>

              {/* Paytable strip */}
              <div className="px-4 sm:px-6 pb-3">
                <div className="flex items-center justify-center gap-3 sm:gap-4 py-2 rounded-lg" style={{
                  background: "rgba(255,255,255,0.02)",
                  border: "1px solid rgba(255,255,255,0.04)",
                }}>
                  {SYMBOLS.map((s) => (
                    <div key={s.id} className="flex items-center gap-1 text-white/30 text-xs">
                      <span className="text-sm">{s.icon}</span>
                      <span className="font-inter hidden sm:inline">×{s.multiplier}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Controls panel */}
              <div className="p-4 sm:p-6" style={{
                background: "linear-gradient(0deg, rgba(0,0,0,0.4), transparent)",
                borderTop: "1px solid rgba(255,255,255,0.04)",
              }}>
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <div className="text-white/30 text-[10px] font-inter uppercase tracking-wider">Credits</div>
                    <div className="text-neon-cyan font-orbitron font-bold text-lg sm:text-xl">{credits.toFixed(2)}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-white/30 text-[10px] font-inter uppercase tracking-wider">Bet</div>
                    <input type="number" value={bet} onChange={(e) => setBet(e.target.value)}
                      className="w-20 sm:w-24 text-center bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-white font-orbitron text-base sm:text-lg focus:outline-none focus:border-neon-cyan/50"
                      step="0.5" min="0.5" />
                  </div>
                  <div className="text-right">
                    <div className="text-white/30 text-[10px] font-inter uppercase tracking-wider">Win</div>
                    <div className="font-orbitron font-bold text-lg sm:text-xl neon-text-gold">{winAmount}</div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button onClick={doSpin} disabled={spinning}
                    className="btn-primary flex-1 py-3 rounded-xl text-sm disabled:opacity-50 disabled:cursor-not-allowed">
                    {spinning ? "⟳ Spinning..." : "🐱 SPIN"}
                  </button>
                  <button onClick={() => setAutoSpin(!autoSpin)}
                    className={`px-4 py-3 rounded-xl text-sm font-orbitron font-semibold border transition-all ${
                      autoSpin ? "bg-neon-magenta/20 border-neon-magenta/50 text-neon-magenta" : "btn-outline"
                    }`}>
                    AUTO
                  </button>
                </div>

                <p className="text-center text-white/20 text-xs font-inter mt-3">
                  🐾 Match 3 in the center row to win · Triple match = JACKPOT
                </p>
              </div>
            </div>

            {/* ── Right panel ── */}
            <div className="space-y-6">
              <BondingCurveChart userCount={userCount} />

              <div className="glass-card p-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-2 h-2 rounded-full bg-neon-cyan animate-pulse" />
                  <span className="font-orbitron text-white text-sm font-bold">Live Activity</span>
                </div>
                <div className="space-y-2">
                  {[
                    { addr: "8xK2...fP3q", action: "bought 50 shares", time: "2s ago" },
                    { addr: "9mN1...aR7w", action: "spun 2.5 SOL", time: "5s ago" },
                    { addr: "3pQ8...bH4e", action: "bought 20 shares", time: "12s ago" },
                    { addr: "7jL5...cW9k", action: "spun 0.8 SOL", time: "18s ago" },
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

              <div className="glass-card p-6" style={{ border: "1px solid rgba(255,215,0,0.2)", boxShadow: "0 0 20px rgba(255,215,0,0.05)" }}>
                <div className="text-white/50 text-xs font-inter uppercase tracking-wider mb-3">
                  Creator earnings (this slot)
                </div>
                <div className="font-orbitron font-black text-4xl neon-text-gold mb-1">+2.84 SOL</div>
                <div className="text-white/30 text-xs font-inter">Last 24 hours · ~$412 USD</div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
};

export default SlotDemoSection;
