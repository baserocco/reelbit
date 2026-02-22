import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Environment, Float, Html, RoundedBox } from "@react-three/drei";
import * as THREE from "three";

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

/* ─── Symbol data ────────────────────────────────────────────── */
const SYMBOLS = ["🍒", "💎", "⭐", "🔔", "🍀", "7️⃣"];
const SYMBOL_COLORS: Record<string, string> = {
  "🍒": "#FF3366",
  "💎": "#00F5FF",
  "⭐": "#FFD700",
  "🔔": "#FFB347",
  "🍀": "#00FF88",
  "7️⃣": "#FF00AA",
};

/* ─── 3D Reel Symbol ─────────────────────────────────────────── */
const ReelSymbol = ({ symbol, position, isCenter, isWin, isJackpot }: {
  symbol: string;
  position: [number, number, number];
  isCenter: boolean;
  isWin: boolean;
  isJackpot: boolean;
}) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const glowColor = SYMBOL_COLORS[symbol] || "#FFFFFF";
  const glowIntensity = isJackpot ? 2 : isWin ? 1.2 : 0;

  useFrame((_, delta) => {
    if (!meshRef.current) return;
    if (isJackpot && isCenter) {
      meshRef.current.rotation.y += delta * 2;
    }
  });

  return (
    <group position={position}>
      {/* Symbol background tile */}
      <RoundedBox
        ref={meshRef}
        args={[1.6, 1.3, 0.3]}
        radius={0.12}
        smoothness={4}
      >
        <meshStandardMaterial
          color={isCenter ? (isJackpot ? "#1a0a00" : "#0a0a15") : "#060610"}
          metalness={0.8}
          roughness={0.3}
          emissive={isCenter && (isWin || isJackpot) ? glowColor : "#000000"}
          emissiveIntensity={glowIntensity * 0.15}
        />
      </RoundedBox>

      {/* Symbol text */}
      <Html
        center
        position={[0, 0, 0.2]}
        style={{
          fontSize: isCenter ? "36px" : "28px",
          opacity: isCenter ? 1 : 0.5,
          filter: isCenter && (isWin || isJackpot) ? `drop-shadow(0 0 12px ${glowColor})` : "none",
          transition: "all 0.3s",
          pointerEvents: "none",
          userSelect: "none",
        }}
      >
        {symbol}
      </Html>

      {/* Glow ring for center winning symbols */}
      {isCenter && isJackpot && (
        <mesh position={[0, 0, -0.05]}>
          <ringGeometry args={[0.7, 0.85, 32]} />
          <meshBasicMaterial color={glowColor} transparent opacity={0.4} side={THREE.DoubleSide} />
        </mesh>
      )}
    </group>
  );
};

/* ─── Spinning Reel Column ───────────────────────────────────── */
const SpinningReel = ({ symbols, spinning, reelIndex, onSpinComplete }: {
  symbols: string[];
  spinning: boolean;
  reelIndex: number;
  onSpinComplete: () => void;
}) => {
  const groupRef = useRef<THREE.Group>(null);
  const spinPhase = useRef<"idle" | "spinning" | "stopping">("idle");
  const spinSpeed = useRef(0);
  const offsetY = useRef(0);
  const targetSymbols = useRef(symbols);
  const stopDelay = useRef(0);

  useEffect(() => {
    if (spinning) {
      spinPhase.current = "spinning";
      spinSpeed.current = 15 + reelIndex * 2;
      stopDelay.current = 800 + reelIndex * 400;
      setTimeout(() => {
        spinPhase.current = "stopping";
        targetSymbols.current = symbols;
      }, stopDelay.current);
    }
  }, [spinning, symbols, reelIndex]);

  useFrame((_, delta) => {
    if (!groupRef.current) return;

    if (spinPhase.current === "spinning") {
      offsetY.current += spinSpeed.current * delta;
      // Create blur effect via position oscillation
      groupRef.current.position.y = Math.sin(offsetY.current * 2) * 0.05;
    } else if (spinPhase.current === "stopping") {
      spinSpeed.current *= 0.88;
      offsetY.current += spinSpeed.current * delta;
      groupRef.current.position.y *= 0.9;

      if (spinSpeed.current < 0.3) {
        spinPhase.current = "idle";
        spinSpeed.current = 0;
        offsetY.current = 0;
        groupRef.current.position.y = 0;
        onSpinComplete();
      }
    }
  });

  const displaySymbols = spinPhase.current !== "idle"
    ? [
        SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)],
        SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)],
        SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)],
      ]
    : symbols;

  return (
    <group ref={groupRef}>
      {displaySymbols.map((sym, i) => (
        <ReelSymbol
          key={`${reelIndex}-${i}`}
          symbol={spinPhase.current === "idle" ? symbols[i] : sym}
          position={[0, (1 - i) * 1.5, 0]}
          isCenter={i === 1}
          isWin={false}
          isJackpot={false}
        />
      ))}
    </group>
  );
};

/* ─── Slot Machine Frame ─────────────────────────────────────── */
const SlotFrame = ({ win }: { win: "jackpot" | "small" | null }) => {
  const neonRef = useRef<THREE.PointLight>(null);
  const neonRef2 = useRef<THREE.PointLight>(null);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (neonRef.current) {
      neonRef.current.intensity = win === "jackpot"
        ? 3 + Math.sin(t * 8) * 2
        : 1 + Math.sin(t * 2) * 0.3;
    }
    if (neonRef2.current) {
      neonRef2.current.intensity = win === "jackpot"
        ? 2 + Math.cos(t * 6) * 1.5
        : 0.8 + Math.cos(t * 2.5) * 0.2;
    }
  });

  return (
    <group>
      {/* Main frame */}
      <RoundedBox args={[6.2, 5.8, 0.6]} radius={0.2} smoothness={4} position={[0, 0, -0.3]}>
        <meshStandardMaterial
          color="#0a0a12"
          metalness={0.95}
          roughness={0.15}
          envMapIntensity={0.5}
        />
      </RoundedBox>

      {/* Inner bezel */}
      <RoundedBox args={[5.6, 5, 0.15]} radius={0.15} smoothness={4} position={[0, 0, 0.05]}>
        <meshStandardMaterial
          color="#050510"
          metalness={0.9}
          roughness={0.2}
        />
      </RoundedBox>

      {/* Top accent bar */}
      <mesh position={[0, 2.7, 0.1]}>
        <boxGeometry args={[5.4, 0.08, 0.1]} />
        <meshStandardMaterial
          color={win === "jackpot" ? "#FFD700" : "#00F5FF"}
          emissive={win === "jackpot" ? "#FFD700" : "#00F5FF"}
          emissiveIntensity={win === "jackpot" ? 3 : 1}
        />
      </mesh>

      {/* Bottom accent bar */}
      <mesh position={[0, -2.7, 0.1]}>
        <boxGeometry args={[5.4, 0.08, 0.1]} />
        <meshStandardMaterial
          color="#FF00AA"
          emissive="#FF00AA"
          emissiveIntensity={win === "jackpot" ? 2 : 0.6}
        />
      </mesh>

      {/* Side neon strips */}
      {[-2.85, 2.85].map((x, i) => (
        <mesh key={i} position={[x, 0, 0.1]}>
          <boxGeometry args={[0.06, 5, 0.1]} />
          <meshStandardMaterial
            color="#00F5FF"
            emissive="#00F5FF"
            emissiveIntensity={win === "jackpot" ? 2 : 0.5}
          />
        </mesh>
      ))}

      {/* Win line indicator */}
      <mesh position={[0, 0, 0.2]}>
        <boxGeometry args={[5.8, 0.03, 0.02]} />
        <meshStandardMaterial
          color="#FFD700"
          emissive="#FFD700"
          emissiveIntensity={win ? 3 : 0.3}
          transparent
          opacity={win ? 1 : 0.4}
        />
      </mesh>

      {/* Corner orbs */}
      {[
        [-2.7, 2.5, 0.2],
        [2.7, 2.5, 0.2],
        [-2.7, -2.5, 0.2],
        [2.7, -2.5, 0.2],
      ].map((pos, i) => (
        <mesh key={i} position={pos as [number, number, number]}>
          <sphereGeometry args={[0.12, 16, 16]} />
          <meshStandardMaterial
            color={win === "jackpot" ? "#FFD700" : "#00F5FF"}
            emissive={win === "jackpot" ? "#FFD700" : "#00F5FF"}
            emissiveIntensity={win === "jackpot" ? 4 : 1}
          />
        </mesh>
      ))}

      {/* Neon lights */}
      <pointLight ref={neonRef} position={[0, 3, 2]} color="#00F5FF" intensity={1} distance={8} />
      <pointLight ref={neonRef2} position={[0, -3, 2]} color="#FF00AA" intensity={0.8} distance={8} />
      {win === "jackpot" && (
        <>
          <pointLight position={[-2, 0, 3]} color="#FFD700" intensity={4} distance={10} />
          <pointLight position={[2, 0, 3]} color="#FFD700" intensity={4} distance={10} />
        </>
      )}
    </group>
  );
};

/* ─── 3D Particle Explosion ──────────────────────────────────── */
const Particle = ({ position, velocity, color, size }: {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  color: string;
  size: number;
}) => {
  const ref = useRef<THREE.Mesh>(null);
  const life = useRef(1);

  useFrame((_, delta) => {
    if (!ref.current) return;
    life.current -= delta * 0.8;
    if (life.current <= 0) {
      ref.current.visible = false;
      return;
    }
    velocity.y -= 3 * delta; // gravity
    position.add(velocity.clone().multiplyScalar(delta));
    ref.current.position.copy(position);
    ref.current.scale.setScalar(life.current * size);
    (ref.current.material as THREE.MeshBasicMaterial).opacity = life.current;
  });

  return (
    <mesh ref={ref} position={position}>
      <sphereGeometry args={[0.1, 8, 8]} />
      <meshBasicMaterial color={color} transparent opacity={1} />
    </mesh>
  );
};

const ParticleExplosion3D = ({ active, isJackpot }: { active: boolean; isJackpot: boolean }) => {
  const particles = useMemo(() => {
    if (!active) return [];
    const count = isJackpot ? 80 : 30;
    const colors = isJackpot
      ? ["#FFD700", "#FF00AA", "#00F5FF", "#FF6B00", "#FFFFFF"]
      : ["#00F5FF", "#FFFFFF", "#7DF9FF"];
    return Array.from({ length: count }, (_, i) => {
      const angle = (Math.PI * 2 * i) / count;
      const speed = isJackpot ? 4 + Math.random() * 6 : 2 + Math.random() * 4;
      return {
        id: i,
        position: new THREE.Vector3((Math.random() - 0.5) * 2, (Math.random() - 0.5) * 2, 0.5),
        velocity: new THREE.Vector3(
          Math.cos(angle) * speed,
          Math.sin(angle) * speed + 2,
          (Math.random() - 0.5) * 3
        ),
        color: colors[Math.floor(Math.random() * colors.length)],
        size: isJackpot ? 0.5 + Math.random() * 1 : 0.3 + Math.random() * 0.5,
      };
    });
  }, [active, isJackpot]);

  return (
    <group>
      {particles.map((p) => (
        <Particle key={p.id} {...p} />
      ))}
    </group>
  );
};

/* ─── Scene ──────────────────────────────────────────────────── */
const SlotScene = ({ reels, spinning, win, showExplosion, onReelStop }: {
  reels: string[][];
  spinning: boolean;
  win: "jackpot" | "small" | null;
  showExplosion: boolean;
  onReelStop: (index: number) => void;
}) => {
  return (
    <>
      <ambientLight intensity={0.15} />
      <directionalLight position={[5, 5, 5]} intensity={0.3} color="#8888FF" />

      <Float speed={1} rotationIntensity={0.02} floatIntensity={0.05}>
        <group>
          <SlotFrame win={win} />

          {/* Reels */}
          {reels.map((reel, i) => (
            <group key={i} position={[(i - 1) * 1.85, 0, 0.15]}>
              <SpinningReel
                symbols={reel}
                spinning={spinning}
                reelIndex={i}
                onSpinComplete={() => onReelStop(i)}
              />
            </group>
          ))}
        </group>
      </Float>

      {/* Particles */}
      <ParticleExplosion3D active={showExplosion} isJackpot={win === "jackpot"} />

      <Environment preset="night" />
    </>
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
          <span>🎯 Graduation: 85 SOL</span>
        </div>
      </div>
    </div>
  );
};

/* ─── Coin rain ──────────────────────────────────────────────── */
const CoinRain = ({ active }: { active: boolean }) => {
  const coins = useRef(
    Array.from({ length: 40 }, (_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      delay: `${Math.random() * 1.5}s`,
      duration: `${1.2 + Math.random() * 1.5}s`,
      size: 16 + Math.floor(Math.random() * 20),
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

/* ─── Main Section ───────────────────────────────────────────── */
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
  const [reelsStoppedCount, setReelsStoppedCount] = useState(0);

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
    setShowExplosion(false);
    setShowCoinRain(false);
    setReelsStoppedCount(0);

    const betVal = parseFloat(bet) || 1;
    setCredits((c) => Math.max(0, c - betVal));

    if (soundOn) {
      const ctx = getAudio();
      if (ctx) playSpinSound(ctx);
    }

    // Generate final symbols
    const newReels = Array.from({ length: 3 }, () =>
      Array.from({ length: 3 }, () => SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)])
    );

    // Stop reels sequentially
    setTimeout(() => {
      setReels(newReels);
      setSpinning(false);

      const centerRow = newReels.map((r) => r[1]);
      if (centerRow.every((s) => s === centerRow[0])) {
        setWin("jackpot");
        setCredits((c) => c + betVal * 50);
        setShowExplosion(true);
        setShowCoinRain(true);
        if (soundOn) { const ctx = getAudio(); if (ctx) playJackpotSound(ctx); }
        setTimeout(() => setShowExplosion(false), 3000);
        setTimeout(() => setShowCoinRain(false), 5000);
      } else if (new Set(centerRow).size === 2) {
        setWin("small");
        setCredits((c) => c + betVal * 3);
        setShowExplosion(true);
        if (soundOn) { const ctx = getAudio(); if (ctx) playWinSound(ctx); }
        setTimeout(() => setShowExplosion(false), 1500);
      }
    }, 1800);
  }, [spinning, bet, soundOn]);

  useEffect(() => {
    if (autoSpin) {
      autoSpinRef.current = setInterval(doSpin, 3000);
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

  const handleReelStop = useCallback((index: number) => {
    setReelsStoppedCount((c) => c + 1);
  }, []);

  return (
    <>
      <style>{`
        @keyframes coinDrop {
          0%   { transform: translateY(-60px) rotate(0deg); opacity: 1; }
          80%  { opacity: 1; }
          100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
        }
        @keyframes jackpot-glow {
          0%, 100% { box-shadow: 0 0 30px rgba(255,215,0,0.3), 0 0 60px rgba(255,215,0,0.15); }
          50% { box-shadow: 0 0 60px rgba(255,215,0,0.6), 0 0 120px rgba(255,215,0,0.3); }
        }
      `}</style>

      <CoinRain active={showCoinRain} />

      <section id="demo" className="relative py-24 lg:py-32 px-4 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-black/95 via-black to-black/95" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-neon-magenta/5 blur-[150px] pointer-events-none" />

        <div className="relative max-w-6xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
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
            {/* ── 3D Slot Machine ── */}
            <div
              className="glass-card overflow-hidden relative"
              style={{
                animation: win === "jackpot" ? "jackpot-glow 0.6s ease-in-out infinite" : "none",
              }}
            >
              {/* 3D Canvas */}
              <div className="w-full aspect-[4/3] relative">
                <Canvas
                  camera={{ position: [0, 0, 7], fov: 45 }}
                  gl={{ antialias: true, alpha: true }}
                  style={{ background: "transparent" }}
                >
                  <SlotScene
                    reels={reels}
                    spinning={spinning}
                    win={win}
                    showExplosion={showExplosion}
                    onReelStop={handleReelStop}
                  />
                </Canvas>

                {/* Win overlay */}
                {win === "jackpot" && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                    <div className="font-orbitron font-black text-4xl sm:text-5xl animate-bounce"
                      style={{ color: "#FFD700", textShadow: "0 0 30px #FFD700, 0 0 60px #FF8C00, 0 0 90px #FFD700" }}>
                      ★ JACKPOT! ★
                    </div>
                  </div>
                )}
                {win === "small" && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                    <div className="font-orbitron font-black text-3xl"
                      style={{ color: "#00F5FF", textShadow: "0 0 20px #00F5FF, 0 0 40px #00F5FF" }}>
                      🎊 Winner!
                    </div>
                  </div>
                )}
              </div>

              {/* Controls panel */}
              <div className="p-6 border-t border-white/5">
                {/* Sound toggle */}
                <div className="flex justify-end mb-3">
                  <button
                    onClick={() => setSoundOn((s) => !s)}
                    title={soundOn ? "Mute" : "Enable sounds"}
                    className={`w-8 h-8 rounded-lg border flex items-center justify-center text-sm transition-all ${
                      soundOn
                        ? "bg-neon-cyan/10 border-neon-cyan/40 text-neon-cyan"
                        : "bg-white/5 border-white/10 text-white/30 hover:border-white/30"
                    }`}
                  >
                    {soundOn ? "🔊" : "🔇"}
                  </button>
                </div>

                {/* Credits / Bet / Win */}
                <div className="flex justify-between items-center mb-4">
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
                  <div className="text-right">
                    <div className="text-white/30 text-xs font-inter uppercase tracking-wider">Win</div>
                    <div className={`font-orbitron font-bold text-xl ${win === "jackpot" ? "text-neon-gold" : "text-neon-gold"}`}>
                      {winAmount}
                    </div>
                  </div>
                </div>

                {/* Buttons */}
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
                    className={`px-4 py-3 rounded-xl text-sm font-orbitron font-semibold border transition-all ${
                      autoSpin
                        ? "bg-neon-magenta/20 border-neon-magenta/50 text-neon-magenta"
                        : "btn-outline"
                    }`}
                  >
                    AUTO
                  </button>
                </div>

                <p className="text-center text-white/20 text-xs font-inter mt-3">
                  💡 Match 3 in the center row to win. Triple match = JACKPOT
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
