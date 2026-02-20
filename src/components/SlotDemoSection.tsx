import { useState, useEffect, useRef, useCallback } from "react";

const SYMBOLS = ["🍒", "💎", "⭐", "🔔", "🍀", "7️⃣"];
const REEL_COUNT = 3;

/* ─── Audio helpers ──────────────────────────────────────────── */
const createAudioContext = () => {
  try {
    return new (window.AudioContext || (window as any).webkitAudioContext)();
  } catch {
    return null;
  }
};

const playTone = (ctx: AudioContext, freq: number, duration: number, type: OscillatorType = "sine", gain = 0.15) => {
  const osc = ctx.createOscillator();
  const gainNode = ctx.createGain();
  osc.connect(gainNode);
  gainNode.connect(ctx.destination);
  osc.type = type;
  osc.frequency.setValueAtTime(freq, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(freq * 0.5, ctx.currentTime + duration);
  gainNode.gain.setValueAtTime(gain, ctx.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + duration);
};

const playSpinSound = (ctx: AudioContext) => {
  [200, 250, 300, 350, 400].forEach((freq, i) => {
    setTimeout(() => playTone(ctx, freq, 0.12, "sawtooth", 0.08), i * 60);
  });
};

const playWinSound = (ctx: AudioContext) => {
  [523, 659, 784, 1047].forEach((freq, i) => {
    setTimeout(() => playTone(ctx, freq, 0.25, "sine", 0.18), i * 120);
  });
};

const playJackpotSound = (ctx: AudioContext) => {
  const freqs = [523, 659, 784, 1047, 1319, 1568];
  freqs.forEach((freq, i) => {
    setTimeout(() => playTone(ctx, freq, 0.35, "sine", 0.22), i * 90);
    setTimeout(() => playTone(ctx, freq * 1.5, 0.3, "triangle", 0.1), i * 90 + 45);
  });
};

/* ─── Particle explosion ─────────────────────────────────────── */
interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  life: number;
  maxLife: number;
  shape: "circle" | "star" | "coin";
}

const JACKPOT_COLORS = ["#FFD700", "#FF00AA", "#00F5FF", "#FF6B00", "#FFFFFF"];
const WIN_COLORS = ["#00F5FF", "#FFFFFF", "#7DF9FF"];

const ParticleExplosion = ({
  active,
  isJackpot,
  containerRef,
}: {
  active: boolean;
  isJackpot: boolean;
  containerRef: React.RefObject<HTMLDivElement>;
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animFrameRef = useRef<number>();
  const activeRef = useRef(active);

  useEffect(() => {
    activeRef.current = active;
  }, [active]);

  const spawnParticles = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    const count = isJackpot ? 120 : 50;
    const colors = isJackpot ? JACKPOT_COLORS : WIN_COLORS;

    const newParticles: Particle[] = Array.from({ length: count }, (_, i) => {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
      const speed = isJackpot ? 3 + Math.random() * 8 : 2 + Math.random() * 5;
      return {
        id: Date.now() + i,
        x: cx + (Math.random() - 0.5) * 60,
        y: cy + (Math.random() - 0.5) * 40,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - (isJackpot ? 2 : 1),
        color: colors[Math.floor(Math.random() * colors.length)],
        size: isJackpot ? 4 + Math.random() * 8 : 3 + Math.random() * 5,
        life: 1,
        maxLife: 0.6 + Math.random() * 0.8,
        shape: isJackpot
          ? (["circle", "star", "coin"] as const)[Math.floor(Math.random() * 3)]
          : "circle",
      };
    });

    particlesRef.current = [...particlesRef.current, ...newParticles];
  }, [isJackpot]);

  useEffect(() => {
    if (active) spawnParticles();
  }, [active, spawnParticles]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      const parent = canvas.parentElement;
      if (parent) {
        canvas.width = parent.clientWidth;
        canvas.height = parent.clientHeight;
      }
    };
    resize();

    const drawStar = (ctx: CanvasRenderingContext2D, x: number, y: number, r: number) => {
      ctx.beginPath();
      for (let i = 0; i < 5; i++) {
        const a = (Math.PI * 2 * i) / 5 - Math.PI / 2;
        const b = a + Math.PI / 5;
        ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
        ctx.lineTo(x + Math.cos(b) * (r * 0.4), y + Math.sin(b) * (r * 0.4));
      }
      ctx.closePath();
    };

    const loop = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particlesRef.current = particlesRef.current.filter((p) => p.life > 0.01);

      particlesRef.current.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.18; // gravity
        p.vx *= 0.99;
        p.life -= 0.016 / p.maxLife;

        ctx.globalAlpha = Math.max(0, p.life);
        ctx.fillStyle = p.color;
        ctx.shadowBlur = 8;
        ctx.shadowColor = p.color;

        if (p.shape === "star") {
          drawStar(ctx, p.x, p.y, p.size);
          ctx.fill();
        } else if (p.shape === "coin") {
          ctx.beginPath();
          ctx.ellipse(p.x, p.y, p.size, p.size * 0.5, Date.now() * 0.005 + p.id, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = "#FFFFFF44";
          ctx.lineWidth = 0.5;
          ctx.stroke();
        } else {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * 0.5, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;
      });

      animFrameRef.current = requestAnimationFrame(loop);
    };

    loop();
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none z-20"
      style={{ borderRadius: "inherit" }}
    />
  );
};

/* ─── Coin rain ──────────────────────────────────────────────── */
const CoinRain = ({ active }: { active: boolean }) => {
  const coins = useRef(
    Array.from({ length: 30 }, (_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      delay: `${Math.random() * 1.5}s`,
      duration: `${1.2 + Math.random() * 1.5}s`,
      size: 16 + Math.floor(Math.random() * 16),
    }))
  );

  if (!active) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {coins.current.map((coin) => (
        <div
          key={coin.id}
          className="absolute top-0 select-none"
          style={{
            left: coin.left,
            fontSize: coin.size,
            animationName: "coinDrop",
            animationDuration: coin.duration,
            animationDelay: coin.delay,
            animationTimingFunction: "linear",
            animationIterationCount: "3",
            animationFillMode: "forwards",
          }}
        >
          🪙
        </div>
      ))}
    </div>
  );
};

/* ─── Bonding Curve ──────────────────────────────────────────── */
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
            <clipPath id="progressClip">
              <rect x="0" y="0" width={progress} height="100" />
            </clipPath>
          </defs>
          <polyline points={points} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
          <g clipPath="url(#progressClip)">
            <polyline points={points} fill="url(#curveGrad)" stroke="#00F5FF" strokeWidth="1.5" />
          </g>
          <circle
            cx={progress}
            cy={100 - Math.pow(progress / 100, 0.6) * 100}
            r="2"
            fill="#00F5FF"
            style={{ filter: "drop-shadow(0 0 4px #00F5FF)" }}
          />
        </svg>
      </div>

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

/* ─── Main section ───────────────────────────────────────────── */
const SlotDemoSection = () => {
  const [reels, setReels] = useState<string[][]>([
    ["🍒", "💎", "⭐"],
    ["🔔", "🍀", "7️⃣"],
    ["💎", "🍒", "🔔"],
  ]);
  const [spinning, setSpinning] = useState(false);
  const [bet, setBet] = useState("1.00");
  const [autoSpin, setAutoSpin] = useState(false);
  const [win, setWin] = useState<"jackpot" | "small" | null>(null);
  const [credits, setCredits] = useState(100);
  const [userCount, setUserCount] = useState(3842);
  const [soundOn, setSoundOn] = useState(false);
  const [showExplosion, setShowExplosion] = useState(false);
  const [showCoinRain, setShowCoinRain] = useState(false);
  const [reelBorderColor, setReelBorderColor] = useState("rgba(0,245,255,0.2)");
  const [screenFlash, setScreenFlash] = useState<string | null>(null);

  const autoSpinRef = useRef<NodeJS.Timeout>();
  const audioCtxRef = useRef<AudioContext | null>(null);
  const slotRef = useRef<HTMLDivElement>(null);

  const getAudio = () => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = createAudioContext();
    }
    return audioCtxRef.current;
  };

  const triggerJackpot = useCallback((betVal: number) => {
    setWin("jackpot");
    setCredits((c) => c + betVal * 50);
    setShowExplosion(true);
    setShowCoinRain(true);
    setReelBorderColor("#FFD700");
    setScreenFlash("rgba(255,215,0,0.15)");

    if (soundOn) {
      const ctx = getAudio();
      if (ctx) playJackpotSound(ctx);
    }

    setTimeout(() => setShowExplosion(false), 3000);
    setTimeout(() => setShowCoinRain(false), 6000);
    setTimeout(() => setReelBorderColor("rgba(0,245,255,0.2)"), 4000);
    setTimeout(() => setScreenFlash(null), 800);
  }, [soundOn]);

  const triggerSmallWin = useCallback((betVal: number) => {
    setWin("small");
    setCredits((c) => c + betVal * 3);
    setShowExplosion(true);
    setReelBorderColor("#00F5FF");
    setScreenFlash("rgba(0,245,255,0.08)");

    if (soundOn) {
      const ctx = getAudio();
      if (ctx) playWinSound(ctx);
    }

    setTimeout(() => setShowExplosion(false), 1500);
    setTimeout(() => setReelBorderColor("rgba(0,245,255,0.2)"), 2000);
    setTimeout(() => setScreenFlash(null), 400);
  }, [soundOn]);

  const doSpin = useCallback(() => {
    if (spinning) return;
    setSpinning(true);
    setWin(null);
    setShowExplosion(false);

    const betVal = parseFloat(bet) || 1;
    setCredits((c) => Math.max(0, c - betVal));
    setReelBorderColor("rgba(0,245,255,0.4)");

    if (soundOn) {
      const ctx = getAudio();
      if (ctx) playSpinSound(ctx);
    }

    setTimeout(() => {
      const newReels = Array.from({ length: REEL_COUNT }, () =>
        Array.from({ length: 3 }, () => SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)])
      );
      setReels(newReels);
      setSpinning(false);
      setReelBorderColor("rgba(0,245,255,0.2)");

      const centerRow = newReels.map((r) => r[1]);
      if (centerRow.every((s) => s === centerRow[0])) {
        triggerJackpot(betVal);
      } else if (new Set(centerRow).size === 2) {
        triggerSmallWin(betVal);
      }
    }, 1500);
  }, [spinning, bet, soundOn, triggerJackpot, triggerSmallWin]);

  useEffect(() => {
    if (autoSpin) {
      autoSpinRef.current = setInterval(doSpin, 2800);
    } else {
      clearInterval(autoSpinRef.current);
    }
    return () => clearInterval(autoSpinRef.current);
  }, [autoSpin, doSpin]);

  useEffect(() => {
    const interval = setInterval(() => {
      setUserCount((c) => c + Math.floor(Math.random() * 3));
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const winAmount = win === "jackpot"
    ? (parseFloat(bet) * 50).toFixed(2)
    : win === "small"
    ? (parseFloat(bet) * 3).toFixed(2)
    : "0.00";

  return (
    <>
      {/* Global CSS for coin drop */}
      <style>{`
        @keyframes coinDrop {
          0%   { transform: translateY(-60px) rotate(0deg); opacity: 1; }
          80%  { opacity: 1; }
          100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
        }
        @keyframes jackpot-pulse {
          0%, 100% { text-shadow: 0 0 20px #FFD700, 0 0 40px #FFD700; }
          50%       { text-shadow: 0 0 40px #FFD700, 0 0 80px #FF8C00, 0 0 120px #FFD700; }
        }
        @keyframes win-pulse {
          0%, 100% { text-shadow: 0 0 15px #00F5FF; }
          50%       { text-shadow: 0 0 30px #00F5FF, 0 0 60px #00F5FF; }
        }
        .jackpot-text { animation: jackpot-pulse 0.6s ease-in-out infinite; }
        .win-text     { animation: win-pulse 0.8s ease-in-out infinite; }
      `}</style>

      {/* Full-screen flash */}
      {screenFlash && (
        <div
          className="fixed inset-0 z-40 pointer-events-none transition-opacity duration-300"
          style={{ backgroundColor: screenFlash }}
        />
      )}

      {/* Coin rain overlay */}
      <CoinRain active={showCoinRain} />

      <section id="demo" className="relative py-24 lg:py-32 px-4 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-black/95 via-black to-black/95" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-neon-magenta/4 blur-[120px] pointer-events-none" />

        <div className="relative max-w-6xl mx-auto">
          {/* Header */}
          <div className="text-center mb-16">
            <span className="inline-block text-neon-magenta font-orbitron text-xs tracking-widest uppercase font-semibold mb-4">
              Live Demo
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
            <div className="glass-card p-8 relative" ref={slotRef}>
              {/* Machine header + sound toggle */}
              <div className="flex items-start justify-between mb-6">
                <div className="flex-1 text-center">
                  <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-neon-gold/10 border border-neon-gold/30 mb-3">
                    <span className="neon-text-gold text-xs font-orbitron font-semibold tracking-wider">
                      🎰 COSMIC FORTUNE
                    </span>
                  </div>

                  {/* Win announcement */}
                  <div className="h-9 flex items-center justify-center">
                    {win === "jackpot" && (
                      <div className="font-orbitron font-black text-2xl jackpot-text text-neon-gold animate-bounce">
                        ★ JACKPOT! ★
                      </div>
                    )}
                    {win === "small" && (
                      <div className="font-orbitron font-black text-xl win-text text-neon-cyan">
                        🎊 Winner!
                      </div>
                    )}
                  </div>
                </div>

                {/* Sound toggle */}
                <button
                  onClick={() => setSoundOn((s) => !s)}
                  title={soundOn ? "Mute sounds" : "Enable sounds"}
                  className={`ml-4 mt-1 flex-shrink-0 w-9 h-9 rounded-lg border flex items-center justify-center text-lg transition-all duration-200 ${
                    soundOn
                      ? "bg-neon-cyan/10 border-neon-cyan/40 text-neon-cyan"
                      : "bg-white/5 border-white/10 text-white/30 hover:border-white/30 hover:text-white/60"
                  }`}
                >
                  {soundOn ? "🔊" : "🔇"}
                </button>
              </div>

              {/* Reels container with particle canvas */}
              <div
                className="relative mb-6 rounded-xl overflow-hidden transition-all duration-500"
                style={{
                  background: "linear-gradient(180deg, #0A0010 0%, #050010 100%)",
                  border: `2px solid ${reelBorderColor}`,
                  boxShadow: `0 0 30px ${reelBorderColor.replace("0.2", "0.15")}, inset 0 0 30px rgba(0,0,0,0.5)`,
                }}
              >
                {/* Particle explosion canvas */}
                <ParticleExplosion
                  active={showExplosion}
                  isJackpot={win === "jackpot"}
                  containerRef={slotRef}
                />

                {/* Win line */}
                <div
                  className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-px z-10 transition-all duration-300"
                  style={{
                    background: win === "jackpot"
                      ? "linear-gradient(90deg, transparent, #FFD700, transparent)"
                      : "linear-gradient(90deg, transparent, rgba(255,215,0,0.5), transparent)",
                    boxShadow: win === "jackpot" ? "0 0 12px #FFD700" : "none",
                  }}
                />

                {/* Jackpot flash overlay */}
                {win === "jackpot" && (
                  <div
                    className="absolute inset-0 z-10 pointer-events-none rounded-xl"
                    style={{
                      background: "radial-gradient(circle at center, rgba(255,215,0,0.12) 0%, transparent 70%)",
                      animation: "jackpot-pulse 0.6s ease-in-out infinite",
                    }}
                  />
                )}

                <div className="grid grid-cols-3 gap-0 p-4">
                  {reels.map((reel, ri) => (
                    <div key={ri} className="flex flex-col gap-2">
                      {reel.map((symbol, si) => (
                        <div
                          key={si}
                          className={`flex items-center justify-center h-16 rounded-lg text-3xl transition-all duration-300 ${
                            spinning ? "animate-pulse opacity-60" : ""
                          } ${si === 1 ? "scale-110" : "opacity-70"} ${
                            si === 1 && win === "jackpot" ? "scale-125" : ""
                          }`}
                          style={{
                            background:
                              si === 1
                                ? win === "jackpot"
                                  ? "rgba(255,215,0,0.1)"
                                  : "rgba(255,255,255,0.06)"
                                : "rgba(255,255,255,0.02)",
                            border:
                              si === 1
                                ? win === "jackpot"
                                  ? "1px solid rgba(255,215,0,0.3)"
                                  : "1px solid rgba(255,255,255,0.1)"
                                : "none",
                          }}
                        >
                          {spinning ? (
                            <span className="text-white/30 text-2xl animate-spin-slow">◈</span>
                          ) : (
                            <span
                              style={
                                si === 1 && win === "jackpot"
                                  ? { filter: "drop-shadow(0 0 8px #FFD700)" }
                                  : si === 1 && win === "small"
                                  ? { filter: "drop-shadow(0 0 6px #00F5FF)" }
                                  : {}
                              }
                            >
                              {symbol}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>

              {/* Credits / Bet / Win */}
              <div className="flex justify-between items-center mb-4 px-1">
                <div>
                  <div className="text-white/30 text-xs font-inter uppercase tracking-wider">Credits</div>
                  <div className="text-neon-cyan font-orbitron font-bold text-xl">{credits.toFixed(2)}</div>
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
                  <div
                    className={`font-orbitron font-bold text-xl transition-all duration-300 ${
                      win === "jackpot" ? "text-neon-gold jackpot-text" : "text-neon-gold"
                    }`}
                  >
                    {winAmount}
                  </div>
                </div>
              </div>

              {/* Controls */}
              <div className="flex gap-3">
                <button
                  onClick={doSpin}
                  disabled={spinning}
                  className={`btn-primary flex-1 py-3 rounded-xl text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 ${
                    win === "jackpot" ? "animate-pulse-slow" : ""
                  }`}
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

              {/* Win tip */}
              <p className="text-center text-white/20 text-xs font-inter mt-3">
                💡 Tip: Match 3 in the center row to win. Triple 7️⃣ = JACKPOT
              </p>
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
                    <div
                      key={i}
                      className="flex justify-between items-center text-xs font-inter py-1.5 border-b border-white/5 last:border-0"
                    >
                      <div>
                        <span className="text-neon-cyan/70 font-mono">{item.addr}</span>
                        <span className="text-white/40 ml-2">{item.action}</span>
                      </div>
                      <span className="text-white/25">{item.time}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div
                className="glass-card p-6"
                style={{ border: "1px solid rgba(255,215,0,0.2)", boxShadow: "0 0 20px rgba(255,215,0,0.05)" }}
              >
                <div className="text-white/50 text-xs font-inter uppercase tracking-wider mb-3">
                  Creator earnings (this slot)
                </div>
                <div className="font-orbitron font-black text-4xl neon-text-gold mb-1">+2.84 SOL</div>
                <div className="text-white/30 text-xs font-inter">Last 24 hours • ~$412 USD</div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
};

export default SlotDemoSection;
