import { useState, useEffect, useRef, useCallback } from "react";
import SlotCanvas from "./slot/SlotCanvas";
import { SYMBOLS } from "./slot/SlotEngine";

const BET_OPTIONS = [1, 5, 10, 25];

const AnimatedCounter = ({ value, big }: { value: number; big: boolean }) => {
  const [display, setDisplay] = useState(0);
  const targetRef = useRef(0);

  useEffect(() => {
    if (value <= 0) { setDisplay(0); return; }
    targetRef.current = value;
    const start = display;
    const diff = value - start;
    const steps = big ? 50 : 25;
    let step = 0;
    const iv = setInterval(() => {
      step++;
      const progress = step / steps;
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(start + diff * eased);
      if (step >= steps) { setDisplay(value); clearInterval(iv); }
    }, 25);
    return () => clearInterval(iv);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <span
      className={`font-orbitron font-black transition-transform ${
        big ? "text-3xl sm:text-4xl scale-110 animate-bounce" : "text-xl sm:text-2xl"
      }`}
      style={{
        color: big ? "#FFD700" : "#FF6600",
        textShadow: big
          ? "0 0 30px #FFD700, 0 0 60px #FF6600, 0 0 90px #FF2200"
          : "0 0 15px rgba(255,100,0,0.6)",
      }}
    >
      {display.toFixed(2)}
    </span>
  );
};

/* Fire Rain — CSS animated falling particles (no emoji) */
const FireRain = ({ active }: { active: boolean }) => {
  const items = useRef(
    Array.from({ length: 35 }, (_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      delay: `${Math.random() * 1.5}s`,
      duration: `${1.2 + Math.random() * 1.5}s`,
      size: 4 + Math.floor(Math.random() * 8),
      color: ["#FF4400", "#FF6600", "#FFD700", "#FFAA00", "#FF2200"][Math.floor(Math.random() * 5)],
      blur: 2 + Math.random() * 6,
    }))
  );
  if (!active) return null;
  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {items.current.map((c) => (
        <div key={c.id} className="absolute top-0 rounded-full" style={{
          left: c.left,
          width: c.size,
          height: c.size,
          backgroundColor: c.color,
          boxShadow: `0 0 ${c.blur}px ${c.color}`,
          animationName: "fireDrop",
          animationDuration: c.duration,
          animationDelay: c.delay,
          animationTimingFunction: "linear",
          animationIterationCount: "3",
          animationFillMode: "forwards",
        }} />
      ))}
    </div>
  );
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
    <div className="rounded-xl p-6" style={{
      background: "linear-gradient(180deg, rgba(30,10,5,0.8), rgba(15,5,2,0.9))",
      border: "1px solid rgba(255,100,0,0.15)",
    }}>
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-orbitron font-bold text-foreground text-sm">Bonding Curve</h3>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: "#FF6600" }} />
          <span className="text-xs font-inter font-semibold" style={{ color: "#FF6600" }}>{userCount.toLocaleString()} joined</span>
        </div>
      </div>
      <div className="relative h-32 mb-4">
        <svg viewBox="0 0 100 100" className="w-full h-full" preserveAspectRatio="none">
          {[25, 50, 75].map((y) => (
            <line key={y} x1="0" y1={y} x2="100" y2={y} stroke="rgba(255,100,0,0.05)" strokeWidth="0.5" />
          ))}
          <defs>
            <linearGradient id="curveGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#FF6600" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#FF4400" stopOpacity="0.02" />
            </linearGradient>
            <clipPath id="progressClip"><rect x="0" y="0" width={progress} height="100" /></clipPath>
          </defs>
          <polyline points={points} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
          <g clipPath="url(#progressClip)">
            <polyline points={points} fill="url(#curveGrad)" stroke="#FF6600" strokeWidth="1.5" />
          </g>
          <circle cx={progress} cy={100 - Math.pow(progress / 100, 0.6) * 100} r="2" fill="#FFD700" style={{ filter: "drop-shadow(0 0 4px #FF6600)" }} />
        </svg>
      </div>
      <div className="space-y-2">
        <div className="flex justify-between text-xs font-inter text-muted-foreground">
          <span>Market cap progress</span>
          <span style={{ color: "#FF6600" }}>{progress.toFixed(0)}%</span>
        </div>
        <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: "rgba(255,100,0,0.1)" }}>
          <div className="h-full rounded-full transition-all duration-1000" style={{
            width: `${progress}%`,
            background: "linear-gradient(90deg, #FF4400, #FFD700)",
          }} />
        </div>
        <div className="flex justify-between text-xs font-inter text-muted-foreground">
          <span>0 SOL</span>
          <span>Graduation: 85 SOL</span>
        </div>
      </div>
    </div>
  );
};

const SlotDemoSection = () => {
  const [balance, setBalance] = useState(1000);
  const [bet, setBet] = useState(5);
  const [spinning, setSpinning] = useState(false);
  const [lastWin, setLastWin] = useState(0);
  const [isJackpot, setIsJackpot] = useState(false);
  const [showFireRain, setShowFireRain] = useState(false);
  const [autoSpin, setAutoSpin] = useState(false);
  const [userCount, setUserCount] = useState(3842);
  const autoSpinRef = useRef<NodeJS.Timeout>();

  const handleSpin = useCallback(() => {
    if (spinning || balance < bet) return;
    setBalance((b) => b - bet);
    setLastWin(0);
    setIsJackpot(false);
    setShowFireRain(false);
    setSpinning(true);
  }, [spinning, balance, bet]);

  const handleSpinEnd = useCallback(() => {
    setSpinning(false);
  }, []);

  const handleWin = useCallback((amount: number, jackpot: boolean) => {
    setBalance((b) => b + amount);
    setLastWin(amount);
    setIsJackpot(jackpot);
    if (jackpot) {
      setShowFireRain(true);
      setTimeout(() => setShowFireRain(false), 5000);
    }
  }, []);

  useEffect(() => {
    if (autoSpin && !spinning) {
      autoSpinRef.current = setTimeout(handleSpin, 1500);
    } else {
      clearTimeout(autoSpinRef.current);
    }
    return () => clearTimeout(autoSpinRef.current);
  }, [autoSpin, spinning, handleSpin]);

  useEffect(() => {
    const iv = setInterval(() => setUserCount((c) => c + Math.floor(Math.random() * 3)), 2000);
    return () => clearInterval(iv);
  }, []);

  return (
    <>
      <style>{`
        @keyframes fireDrop {
          0% { transform: translateY(-20px) scale(1); opacity: 1; }
          70% { opacity: 0.8; }
          100% { transform: translateY(100vh) scale(0.3); opacity: 0; }
        }
        @keyframes dragonPulse {
          0%, 100% { box-shadow: 0 0 30px rgba(255,80,0,0.2), inset 0 0 30px rgba(255,60,0,0.05); }
          50% { box-shadow: 0 0 60px rgba(255,80,0,0.4), inset 0 0 40px rgba(255,60,0,0.1); }
        }
      `}</style>

      <FireRain active={showFireRain} />

      <section id="demo" className="relative py-24 lg:py-32 px-4 overflow-hidden">
        <div className="absolute inset-0" style={{
          background: "linear-gradient(180deg, rgba(10,5,3,0.95), rgba(15,5,2,1), rgba(10,5,3,0.95))",
        }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full blur-[150px] pointer-events-none" style={{
          background: "radial-gradient(circle, rgba(255,60,0,0.08), transparent)",
        }} />

        <div className="relative max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <span className="inline-block font-orbitron text-xs tracking-widest uppercase font-semibold mb-4" style={{ color: "#FF6600" }}>
              Live Demo
            </span>
            <h2 className="font-orbitron font-bold text-3xl sm:text-4xl lg:text-5xl text-foreground">
              Dragon's{" "}
              <span style={{
                background: "linear-gradient(135deg, #FF4400, #FFD700, #FF6600)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}>Inferno</span>
            </h2>
            <p className="mt-4 text-muted-foreground font-inter max-w-xl mx-auto">
              Face the dragon in this high-volatility fantasy slot. Massive multipliers await the brave.
            </p>
          </div>

          <div className="grid lg:grid-cols-[1fr_320px] gap-8 items-start">
            <div
              className="rounded-2xl overflow-hidden relative"
              style={{
                background: "linear-gradient(180deg, #1a0a04 0%, #0d0402 100%)",
                border: "1px solid rgba(255,100,0,0.12)",
                boxShadow: "0 20px 80px rgba(0,0,0,0.7), 0 0 40px rgba(255,60,0,0.08)",
                animation: isJackpot ? "dragonPulse 0.6s ease-in-out infinite" : "none",
              }}
            >
              {/* Jackpot display */}
              <div className="text-center py-3" style={{
                background: "linear-gradient(90deg, rgba(255,80,0,0.05), rgba(255,200,0,0.12), rgba(255,80,0,0.05))",
                borderBottom: "1px solid rgba(255,180,0,0.15)",
              }}>
                <span className="text-xs font-inter text-muted-foreground uppercase tracking-widest">Dragon's Jackpot</span>
                <div className="font-orbitron font-black text-2xl sm:text-3xl" style={{
                  background: "linear-gradient(135deg, #FFD700, #FF6600)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  filter: "drop-shadow(0 0 10px rgba(255,150,0,0.3))",
                }}>
                  5,555,555
                </div>
              </div>

              {/* Slot header */}
              <div className="px-5 py-3 flex items-center justify-between" style={{
                background: "linear-gradient(90deg, rgba(255,60,0,0.04), rgba(255,180,0,0.06), rgba(255,60,0,0.04))",
                borderBottom: "1px solid rgba(255,150,0,0.06)",
              }}>
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full" style={{
                    background: "radial-gradient(circle, #FF6600, #CC1100)",
                    boxShadow: "0 0 8px rgba(255,80,0,0.5)",
                  }} />
                  <span className="font-orbitron font-bold text-sm tracking-wider" style={{ color: "#FFD700" }}>DRAGON'S INFERNO</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-muted-foreground text-xs font-inter">10 Paylines</span>
                  <span className="text-muted-foreground text-xs font-inter">High Volatility</span>
                </div>
              </div>

              {/* Canvas */}
              <div className="flex justify-center py-4 px-2">
                <SlotCanvas
                  bet={bet}
                  balance={balance}
                  onBalanceChange={(d) => setBalance((b) => b + d)}
                  onWin={handleWin}
                  spinning={spinning}
                  onSpinStart={() => {}}
                  onSpinEnd={handleSpinEnd}
                />
              </div>

              {/* Paytable strip */}
              <div className="px-3 sm:px-5 pb-3">
                <div className="flex items-center justify-center gap-2 sm:gap-3 py-2 rounded-lg flex-wrap" style={{
                  background: "rgba(255,100,0,0.03)",
                  border: "1px solid rgba(255,100,0,0.06)",
                }}>
                  {SYMBOLS.filter(s => !s.isBonus).slice(0, 6).map((sym) => (
                    <div key={sym.id} className="flex items-center gap-1 text-xs">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: sym.color, boxShadow: `0 0 6px ${sym.color}60` }} />
                      <span className="text-muted-foreground font-inter hidden sm:inline">{sym.name}</span>
                      <span className="font-orbitron text-foreground font-bold">{sym.multiplier}x</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Controls */}
              <div className="p-4 sm:p-6" style={{
                background: "linear-gradient(0deg, rgba(0,0,0,0.5), transparent)",
                borderTop: "1px solid rgba(255,100,0,0.06)",
              }}>
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <div className="text-muted-foreground text-[10px] font-inter uppercase tracking-wider">Balance</div>
                    <div className="font-orbitron font-bold text-lg sm:text-xl" style={{ color: "#FFD700" }}>
                      {balance.toFixed(2)}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-muted-foreground text-[10px] font-inter uppercase tracking-wider mb-1">Bet</div>
                    <div className="flex gap-1">
                      {BET_OPTIONS.map((b) => (
                        <button
                          key={b}
                          onClick={() => setBet(b)}
                          className="px-3 py-1.5 rounded-lg text-xs font-orbitron font-bold transition-all"
                          style={{
                            background: bet === b ? "rgba(255,100,0,0.2)" : "rgba(255,255,255,0.03)",
                            border: bet === b ? "1px solid rgba(255,150,0,0.5)" : "1px solid rgba(255,255,255,0.08)",
                            color: bet === b ? "#FFD700" : "rgba(255,255,255,0.5)",
                          }}
                        >
                          {b}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-muted-foreground text-[10px] font-inter uppercase tracking-wider">Win</div>
                    <AnimatedCounter value={lastWin} big={isJackpot} />
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={handleSpin}
                    disabled={spinning || balance < bet}
                    className="flex-1 py-3.5 rounded-xl text-sm font-orbitron font-bold disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden group transition-all"
                    style={{
                      background: "linear-gradient(135deg, #CC2200, #FF6600, #FFD700)",
                      color: "#FFF",
                      boxShadow: spinning ? "none" : "0 0 20px rgba(255,80,0,0.3)",
                      textShadow: "0 1px 3px rgba(0,0,0,0.5)",
                    }}
                  >
                    <span className="relative z-10">
                      {spinning ? "SPINNING..." : "SPIN"}
                    </span>
                    {!spinning && (
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                    )}
                  </button>
                  <button
                    onClick={() => setAutoSpin(!autoSpin)}
                    className="px-4 py-3 rounded-xl text-sm font-orbitron font-semibold transition-all"
                    style={{
                      background: autoSpin ? "rgba(255,100,0,0.2)" : "transparent",
                      border: autoSpin ? "1px solid rgba(255,150,0,0.5)" : "1px solid rgba(255,255,255,0.1)",
                      color: autoSpin ? "#FFD700" : "rgba(255,255,255,0.5)",
                    }}
                  >
                    AUTO
                  </button>
                </div>

                <p className="text-center text-muted-foreground text-xs font-inter mt-3">
                  10 paylines · 3+ matching = win · 5-of-a-kind = DRAGON JACKPOT
                </p>
              </div>
            </div>

            {/* Right panel */}
            <div className="space-y-6">
              <BondingCurveChart userCount={userCount} />

              <div className="rounded-xl p-6" style={{
                background: "linear-gradient(180deg, rgba(30,10,5,0.8), rgba(15,5,2,0.9))",
                border: "1px solid rgba(255,100,0,0.1)",
              }}>
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: "#FF4400" }} />
                  <span className="font-orbitron text-foreground text-sm font-bold">Live Activity</span>
                </div>
                <div className="space-y-2">
                  {[
                    { addr: "8xK2...fP3q", action: "bought 50 shares", time: "2s ago" },
                    { addr: "9mN1...aR7w", action: "spun 2.5 SOL", time: "5s ago" },
                    { addr: "3pQ8...bH4e", action: "bought 20 shares", time: "12s ago" },
                    { addr: "7jL5...cW9k", action: "spun 0.8 SOL", time: "18s ago" },
                  ].map((item, i) => (
                    <div key={i} className="flex justify-between items-center text-xs font-inter py-1.5" style={{
                      borderBottom: i < 3 ? "1px solid rgba(255,100,0,0.06)" : "none",
                    }}>
                      <div>
                        <span className="font-mono" style={{ color: "rgba(255,150,0,0.6)" }}>{item.addr}</span>
                        <span className="text-muted-foreground ml-2">{item.action}</span>
                      </div>
                      <span className="text-muted-foreground/50">{item.time}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-xl p-6" style={{
                background: "linear-gradient(180deg, rgba(30,10,5,0.8), rgba(15,5,2,0.9))",
                border: "1px solid rgba(255,180,0,0.2)",
                boxShadow: "0 0 20px rgba(255,100,0,0.06)",
              }}>
                <div className="text-muted-foreground text-xs font-inter uppercase tracking-wider mb-3">
                  Creator earnings (this slot)
                </div>
                <div className="font-orbitron font-black text-4xl mb-1" style={{
                  background: "linear-gradient(135deg, #FFD700, #FF6600)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  filter: "drop-shadow(0 0 8px rgba(255,150,0,0.3))",
                }}>+2.84 SOL</div>
                <div className="text-muted-foreground text-xs font-inter">Last 24 hours</div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
};

export default SlotDemoSection;
