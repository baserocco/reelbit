import { useState, useEffect, useRef, useCallback } from "react";

/* ─── Cat-themed SVG Symbols ──────────────────────────────────── */
const SYMBOL_SVGS: Record<string, { svg: string; color: string; name: string; multiplier: number }> = {
  lucky_cat: {
    name: "Lucky Cat",
    color: "#FFD700",
    multiplier: 10,
    svg: `<svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="lc1" x1="20" y1="10" x2="100" y2="110" gradientUnits="userSpaceOnUse">
          <stop stop-color="#FFD700"/><stop offset="1" stop-color="#FF8C00"/>
        </linearGradient>
        <radialGradient id="lc2" cx="60" cy="55" r="45" gradientUnits="userSpaceOnUse">
          <stop stop-color="#FFF8DC" stop-opacity="0.3"/><stop offset="1" stop-color="#FFD700" stop-opacity="0"/>
        </radialGradient>
      </defs>
      <circle cx="60" cy="60" r="52" fill="url(#lc2)"/>
      <!-- ears -->
      <path d="M30 45 L22 15 L45 35Z" fill="url(#lc1)" stroke="#B8860B" stroke-width="1.5"/>
      <path d="M90 45 L98 15 L75 35Z" fill="url(#lc1)" stroke="#B8860B" stroke-width="1.5"/>
      <path d="M28 40 L24 18 L42 34Z" fill="#FFE4B5"/>
      <path d="M92 40 L96 18 L78 34Z" fill="#FFE4B5"/>
      <!-- head -->
      <ellipse cx="60" cy="62" rx="35" ry="32" fill="url(#lc1)" stroke="#B8860B" stroke-width="1.5"/>
      <!-- face patch -->
      <ellipse cx="60" cy="68" rx="22" ry="18" fill="#FFE4B5"/>
      <!-- eyes -->
      <ellipse cx="47" cy="55" rx="6" ry="7" fill="#fff"/>
      <ellipse cx="73" cy="55" rx="6" ry="7" fill="#fff"/>
      <ellipse cx="48" cy="55" rx="3.5" ry="4.5" fill="#2D1B00"/>
      <ellipse cx="74" cy="55" rx="3.5" ry="4.5" fill="#2D1B00"/>
      <circle cx="49" cy="53" r="1.5" fill="#fff"/>
      <circle cx="75" cy="53" r="1.5" fill="#fff"/>
      <!-- nose -->
      <path d="M57 65 L60 68 L63 65Z" fill="#FF6B8A"/>
      <!-- mouth -->
      <path d="M54 70 Q57 74 60 70 Q63 74 66 70" stroke="#B8860B" stroke-width="1.2" fill="none" stroke-linecap="round"/>
      <!-- whiskers -->
      <line x1="30" y1="62" x2="44" y2="64" stroke="#B8860B" stroke-width="0.8"/>
      <line x1="30" y1="67" x2="44" y2="67" stroke="#B8860B" stroke-width="0.8"/>
      <line x1="76" y1="64" x2="90" y2="62" stroke="#B8860B" stroke-width="0.8"/>
      <line x1="76" y1="67" x2="90" y2="67" stroke="#B8860B" stroke-width="0.8"/>
      <!-- paw waving -->
      <ellipse cx="85" cy="90" rx="8" ry="10" fill="url(#lc1)" stroke="#B8860B" stroke-width="1"/>
      <path d="M80 85 Q82 80 86 82" stroke="#FFE4B5" stroke-width="2" fill="none"/>
      <!-- coin -->
      <circle cx="92" cy="82" r="7" fill="#FFD700" stroke="#B8860B" stroke-width="1"/>
      <text x="92" y="86" text-anchor="middle" fill="#B8860B" font-size="9" font-weight="bold">¥</text>
    </svg>`,
  },
  golden_fish: {
    name: "Golden Fish",
    color: "#00E5FF",
    multiplier: 5,
    svg: `<svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="gf1" x1="20" y1="40" x2="100" y2="80" gradientUnits="userSpaceOnUse">
          <stop stop-color="#00E5FF"/><stop offset="0.5" stop-color="#0091EA"/><stop offset="1" stop-color="#6200EA"/>
        </linearGradient>
        <radialGradient id="gf2" cx="60" cy="60" r="50" gradientUnits="userSpaceOnUse">
          <stop stop-color="#00E5FF" stop-opacity="0.2"/><stop offset="1" stop-color="transparent"/>
        </radialGradient>
      </defs>
      <circle cx="60" cy="60" r="50" fill="url(#gf2)"/>
      <!-- body -->
      <ellipse cx="55" cy="60" rx="30" ry="18" fill="url(#gf1)" stroke="#006064" stroke-width="1.5"/>
      <!-- tail -->
      <path d="M80 60 Q95 40 100 50 Q92 60 100 70 Q95 80 80 60Z" fill="url(#gf1)" stroke="#006064" stroke-width="1"/>
      <!-- fins -->
      <path d="M45 44 Q38 30 50 38" fill="#00BCD4" stroke="#006064" stroke-width="0.8"/>
      <path d="M55 44 Q52 28 62 38" fill="#00BCD4" stroke="#006064" stroke-width="0.8"/>
      <path d="M50 76 Q42 88 55 80" fill="#00BCD4" stroke="#006064" stroke-width="0.8"/>
      <!-- scales -->
      <path d="M40 55 Q45 50 50 55 Q45 60 40 55Z" fill="#4DD0E1" opacity="0.5"/>
      <path d="M50 52 Q55 47 60 52 Q55 57 50 52Z" fill="#4DD0E1" opacity="0.5"/>
      <path d="M45 62 Q50 57 55 62 Q50 67 45 62Z" fill="#4DD0E1" opacity="0.5"/>
      <path d="M55 60 Q60 55 65 60 Q60 65 55 60Z" fill="#4DD0E1" opacity="0.5"/>
      <!-- eye -->
      <circle cx="38" cy="57" r="5" fill="#fff"/>
      <circle cx="39" cy="57" r="3" fill="#1A237E"/>
      <circle cx="40" cy="56" r="1" fill="#fff"/>
      <!-- sparkles -->
      <circle cx="30" cy="45" r="2" fill="#fff" opacity="0.6"/>
      <circle cx="70" cy="48" r="1.5" fill="#fff" opacity="0.4"/>
      <circle cx="65" cy="72" r="1.5" fill="#fff" opacity="0.5"/>
    </svg>`,
  },
  yarn_ball: {
    name: "Yarn Ball",
    color: "#FF4081",
    multiplier: 4,
    svg: `<svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="yb1" cx="55" cy="55" r="35" gradientUnits="userSpaceOnUse">
          <stop stop-color="#FF80AB"/><stop offset="1" stop-color="#C51162"/>
        </radialGradient>
      </defs>
      <circle cx="60" cy="60" r="34" fill="url(#yb1)" stroke="#880E4F" stroke-width="1.5"/>
      <!-- yarn lines -->
      <path d="M35 45 Q60 30 85 50" stroke="#FFB2CC" stroke-width="1.5" fill="none" opacity="0.6"/>
      <path d="M30 60 Q60 40 90 65" stroke="#FFB2CC" stroke-width="1.5" fill="none" opacity="0.5"/>
      <path d="M35 75 Q60 55 85 70" stroke="#FFB2CC" stroke-width="1.5" fill="none" opacity="0.6"/>
      <path d="M40 85 Q55 65 80 80" stroke="#FFB2CC" stroke-width="1.5" fill="none" opacity="0.4"/>
      <path d="M45 35 Q50 60 75 45" stroke="#FF80AB" stroke-width="1" fill="none" opacity="0.7"/>
      <!-- highlight -->
      <ellipse cx="48" cy="48" rx="10" ry="8" fill="#fff" opacity="0.15" transform="rotate(-30 48 48)"/>
      <!-- trailing yarn -->
      <path d="M85 75 Q95 80 90 90 Q85 95 92 100" stroke="#FF4081" stroke-width="2" fill="none" stroke-linecap="round"/>
    </svg>`,
  },
  cat_paw: {
    name: "Cat Paw",
    color: "#E040FB",
    multiplier: 3,
    svg: `<svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="cp1" cx="60" cy="65" r="35" gradientUnits="userSpaceOnUse">
          <stop stop-color="#F8BBD0"/><stop offset="1" stop-color="#E040FB"/>
        </radialGradient>
      </defs>
      <!-- main pad -->
      <ellipse cx="60" cy="70" rx="22" ry="20" fill="url(#cp1)" stroke="#880E4F" stroke-width="1.5"/>
      <ellipse cx="60" cy="72" rx="14" ry="12" fill="#FCE4EC" opacity="0.4"/>
      <!-- toe beans -->
      <ellipse cx="40" cy="48" rx="9" ry="11" fill="url(#cp1)" stroke="#880E4F" stroke-width="1" transform="rotate(-15 40 48)"/>
      <ellipse cx="55" cy="40" rx="8" ry="10" fill="url(#cp1)" stroke="#880E4F" stroke-width="1" transform="rotate(-5 55 40)"/>
      <ellipse cx="70" cy="40" rx="8" ry="10" fill="url(#cp1)" stroke="#880E4F" stroke-width="1" transform="rotate(5 70 40)"/>
      <ellipse cx="82" cy="48" rx="9" ry="11" fill="url(#cp1)" stroke="#880E4F" stroke-width="1" transform="rotate(15 82 48)"/>
      <!-- inner beans -->
      <ellipse cx="41" cy="49" rx="4" ry="5" fill="#FCE4EC" opacity="0.5" transform="rotate(-15 41 49)"/>
      <ellipse cx="55" cy="42" rx="4" ry="5" fill="#FCE4EC" opacity="0.5"/>
      <ellipse cx="70" cy="42" rx="4" ry="5" fill="#FCE4EC" opacity="0.5"/>
      <ellipse cx="81" cy="49" rx="4" ry="5" fill="#FCE4EC" opacity="0.5" transform="rotate(15 81 49)"/>
      <!-- sparkle -->
      <circle cx="75" cy="30" r="2" fill="#fff" opacity="0.6"/>
    </svg>`,
  },
  milk_bowl: {
    name: "Milk Bowl",
    color: "#B2EBF2",
    multiplier: 2,
    svg: `<svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="mb1" x1="30" y1="50" x2="90" y2="90" gradientUnits="userSpaceOnUse">
          <stop stop-color="#E0F7FA"/><stop offset="1" stop-color="#80DEEA"/>
        </linearGradient>
        <linearGradient id="mb2" x1="30" y1="70" x2="90" y2="85" gradientUnits="userSpaceOnUse">
          <stop stop-color="#FFFFFF" stop-opacity="0.9"/><stop offset="1" stop-color="#E0F7FA" stop-opacity="0.7"/>
        </linearGradient>
      </defs>
      <!-- bowl -->
      <path d="M25 60 Q25 95 60 95 Q95 95 95 60" fill="url(#mb1)" stroke="#4DD0E1" stroke-width="1.5"/>
      <!-- bowl rim -->
      <ellipse cx="60" cy="60" rx="35" ry="8" fill="#B2EBF2" stroke="#4DD0E1" stroke-width="1.5"/>
      <!-- milk surface -->
      <ellipse cx="60" cy="60" rx="30" ry="5" fill="url(#mb2)"/>
      <!-- milk ripple -->
      <ellipse cx="55" cy="59" rx="12" ry="2.5" fill="#fff" opacity="0.4"/>
      <!-- steam -->
      <path d="M45 48 Q42 40 48 35" stroke="#B2EBF2" stroke-width="1.5" fill="none" opacity="0.5" stroke-linecap="round"/>
      <path d="M55 46 Q52 38 58 32" stroke="#B2EBF2" stroke-width="1.5" fill="none" opacity="0.4" stroke-linecap="round"/>
      <path d="M65 47 Q62 39 68 34" stroke="#B2EBF2" stroke-width="1.5" fill="none" opacity="0.5" stroke-linecap="round"/>
      <!-- highlight -->
      <path d="M35 70 Q40 65 45 72" stroke="#fff" stroke-width="1" fill="none" opacity="0.3"/>
    </svg>`,
  },
  cat_bell: {
    name: "Cat Bell",
    color: "#FFAB00",
    multiplier: 2,
    svg: `<svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="cb1" x1="35" y1="25" x2="85" y2="95" gradientUnits="userSpaceOnUse">
          <stop stop-color="#FFD54F"/><stop offset="1" stop-color="#FF8F00"/>
        </linearGradient>
        <radialGradient id="cb2" cx="55" cy="50" r="25" gradientUnits="userSpaceOnUse">
          <stop stop-color="#fff" stop-opacity="0.3"/><stop offset="1" stop-color="transparent"/>
        </radialGradient>
      </defs>
      <!-- bell body -->
      <path d="M35 75 Q35 35 60 30 Q85 35 85 75Z" fill="url(#cb1)" stroke="#E65100" stroke-width="1.5"/>
      <circle cx="55" cy="50" r="20" fill="url(#cb2)"/>
      <!-- bell bottom -->
      <ellipse cx="60" cy="75" rx="28" ry="6" fill="#FF8F00" stroke="#E65100" stroke-width="1"/>
      <!-- ring top -->
      <circle cx="60" cy="28" r="6" fill="none" stroke="url(#cb1)" stroke-width="3"/>
      <circle cx="60" cy="28" r="6" fill="none" stroke="#E65100" stroke-width="1"/>
      <!-- ribbon -->
      <path d="M50 33 Q60 40 70 33" fill="#F44336" stroke="#B71C1C" stroke-width="0.8"/>
      <path d="M52 33 L48 42 L55 38Z" fill="#F44336" stroke="#B71C1C" stroke-width="0.5"/>
      <path d="M68 33 L72 42 L65 38Z" fill="#F44336" stroke="#B71C1C" stroke-width="0.5"/>
      <!-- clapper -->
      <circle cx="60" cy="82" r="4" fill="#5D4037" stroke="#3E2723" stroke-width="1"/>
      <line x1="60" y1="75" x2="60" y2="78" stroke="#5D4037" stroke-width="1.5"/>
      <!-- shine -->
      <path d="M44 50 Q48 42 52 50" stroke="#fff" stroke-width="1.5" fill="none" opacity="0.4" stroke-linecap="round"/>
    </svg>`,
  },
};

const SYMBOL_KEYS = Object.keys(SYMBOL_SVGS);
const randomSymbolKey = () => SYMBOL_KEYS[Math.floor(Math.random() * SYMBOL_KEYS.length)];

/* ─── Audio helpers ──────────────────────────────────────────── */
const createAudioContext = () => {
  try { return new (window.AudioContext || (window as any).webkitAudioContext)(); } catch { return null; }
};
const playTone = (ctx: AudioContext, freq: number, dur: number, type: OscillatorType = "sine", gain = 0.12) => {
  const osc = ctx.createOscillator(); const g = ctx.createGain();
  osc.connect(g); g.connect(ctx.destination); osc.type = type;
  osc.frequency.setValueAtTime(freq, ctx.currentTime);
  g.gain.setValueAtTime(gain, ctx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
  osc.start(ctx.currentTime); osc.stop(ctx.currentTime + dur);
};
const playSpinSound = (ctx: AudioContext) => { [200,300,400,500].forEach((f,i) => setTimeout(() => playTone(ctx,f,0.1,"sawtooth",0.06), i*50)); };
const playWinSound = (ctx: AudioContext) => { [523,659,784,1047].forEach((f,i) => setTimeout(() => playTone(ctx,f,0.25,"sine",0.15), i*100)); };
const playJackpotSound = (ctx: AudioContext) => {
  [523,659,784,1047,1319,1568].forEach((f,i) => {
    setTimeout(() => playTone(ctx,f,0.35,"sine",0.2), i*80);
    setTimeout(() => playTone(ctx,f*1.5,0.25,"triangle",0.08), i*80+40);
  });
};

/* ─── Single Symbol Image (rendered as data URI) ─────────────── */
const symbolImageCache: Record<string, string> = {};
const getSymbolDataUri = (key: string): string => {
  if (symbolImageCache[key]) return symbolImageCache[key];
  // Fix gradient IDs to be unique per symbol to avoid conflicts
  let svg = SYMBOL_SVGS[key].svg;
  const idMap: Record<string, string> = {};
  const idRegex = /id="([^"]+)"/g;
  let match;
  while ((match = idRegex.exec(svg)) !== null) {
    const origId = match[1];
    const newId = `${key}_${origId}`;
    idMap[origId] = newId;
  }
  for (const [orig, rep] of Object.entries(idMap)) {
    svg = svg.split(`id="${orig}"`).join(`id="${rep}"`);
    svg = svg.split(`url(#${orig})`).join(`url(#${rep})`);
  }
  const uri = `data:image/svg+xml,${encodeURIComponent(svg)}`;
  symbolImageCache[key] = uri;
  return uri;
};

/* ─── Reel Component (Web Animations API based) ──────────────── */
const VISIBLE_ROWS = 3;
const SYMBOL_HEIGHT = 100; // px per symbol
const SYMBOL_GAP = 4; // px gap

const Reel = ({
  idx,
  finalSymbols,
  spinning,
  onSpinEnd,
}: {
  idx: number;
  finalSymbols: string[];
  spinning: boolean;
  onSpinEnd: () => void;
}) => {
  const stripRef = useRef<HTMLDivElement>(null);
  const animRef = useRef<Animation | null>(null);
  const [displaySymbols, setDisplaySymbols] = useState<string[]>(finalSymbols);

  const factor = 1 + Math.pow(idx / 2, 2);
  const extraCount = Math.floor(factor) * 10;

  useEffect(() => {
    if (!spinning || !stripRef.current) return;

    // Build the symbol strip: current 3 + many random + final 3
    const strip = [...displaySymbols];
    for (let i = 0; i < extraCount; i++) {
      if (i >= extraCount - VISIBLE_ROWS) {
        strip.push(finalSymbols[i - (extraCount - VISIBLE_ROWS)]);
      } else {
        strip.push(randomSymbolKey());
      }
    }
    setDisplaySymbols(strip);

    // Wait for render, then animate
    requestAnimationFrame(() => {
      if (!stripRef.current) return;
      const totalScroll = extraCount * (SYMBOL_HEIGHT + SYMBOL_GAP);

      const anim = stripRef.current.animate(
        [
          { transform: "translateY(0)", filter: "blur(0px)" },
          { filter: "blur(2px)", offset: 0.5 },
          { transform: `translateY(-${totalScroll}px)`, filter: "blur(0px)" },
        ],
        {
          duration: factor * 1000,
          easing: "ease-in-out",
          fill: "forwards",
        }
      );
      animRef.current = anim;

      anim.onfinish = () => {
        setDisplaySymbols(finalSymbols);
        if (stripRef.current) {
          stripRef.current.style.transform = "translateY(0)";
        }
        onSpinEnd();
      };
    });

    return () => {
      animRef.current?.cancel();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spinning]);

  return (
    <div
      className="relative overflow-hidden flex-1"
      style={{
        height: VISIBLE_ROWS * SYMBOL_HEIGHT + (VISIBLE_ROWS - 1) * SYMBOL_GAP,
        borderRadius: 12,
        background: "linear-gradient(180deg, rgba(10,8,22,0.95), rgba(15,12,30,0.98))",
      }}
    >
      {/* Top/bottom fade masks */}
      <div className="absolute inset-x-0 top-0 h-6 z-10" style={{ background: "linear-gradient(180deg, rgba(10,8,22,1), transparent)" }} />
      <div className="absolute inset-x-0 bottom-0 h-6 z-10" style={{ background: "linear-gradient(0deg, rgba(10,8,22,1), transparent)" }} />

      <div ref={stripRef} className="flex flex-col" style={{ gap: SYMBOL_GAP }}>
        {displaySymbols.map((key, i) => (
          <div
            key={`${i}-${key}`}
            className="flex items-center justify-center flex-shrink-0"
            style={{
              height: SYMBOL_HEIGHT,
              width: "100%",
              // Only highlight center row when not spinning
            }}
          >
            <img
              src={getSymbolDataUri(key)}
              alt={SYMBOL_SVGS[key].name}
              draggable={false}
              style={{
                width: "75%",
                height: "75%",
                objectFit: "contain",
                filter: `drop-shadow(0 2px 8px ${SYMBOL_SVGS[key].color}40)`,
              }}
            />
          </div>
        ))}
      </div>
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
          <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          <span className="text-primary text-xs font-inter font-semibold">{userCount.toLocaleString()} joined</span>
        </div>
      </div>
      <div className="relative h-32 mb-4">
        <svg viewBox="0 0 100 100" className="w-full h-full" preserveAspectRatio="none">
          {[25, 50, 75].map((y) => (
            <line key={y} x1="0" y1={y} x2="100" y2={y} stroke="rgba(255,255,255,0.05)" strokeWidth="0.5" />
          ))}
          <defs>
            <linearGradient id="curveGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(186,100%,50%)" stopOpacity="0.3" />
              <stop offset="100%" stopColor="hsl(186,100%,50%)" stopOpacity="0.02" />
            </linearGradient>
            <clipPath id="progressClip"><rect x="0" y="0" width={progress} height="100" /></clipPath>
          </defs>
          <polyline points={points} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
          <g clipPath="url(#progressClip)">
            <polyline points={points} fill="url(#curveGrad)" stroke="hsl(186,100%,50%)" strokeWidth="1.5" />
          </g>
          <circle cx={progress} cy={100 - Math.pow(progress / 100, 0.6) * 100} r="2" fill="hsl(186,100%,50%)" style={{ filter: "drop-shadow(0 0 4px hsl(186,100%,50%))" }} />
        </svg>
      </div>
      <div className="space-y-2">
        <div className="flex justify-between text-xs font-inter text-muted-foreground">
          <span>Market cap progress</span>
          <span className="text-primary">{progress.toFixed(0)}%</span>
        </div>
        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
          <div className="h-full rounded-full bg-gradient-to-r from-primary to-secondary transition-all duration-1000" style={{ width: `${progress}%` }} />
        </div>
        <div className="flex justify-between text-xs font-inter text-muted-foreground">
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
  const NUM_REELS = 5;
  const [finalReels, setFinalReels] = useState<string[][]>(
    Array.from({ length: NUM_REELS }, () =>
      Array.from({ length: VISIBLE_ROWS }, () => randomSymbolKey())
    )
  );
  const [spinning, setSpinning] = useState(false);
  const [bet, setBet] = useState("1.00");
  const [autoSpin, setAutoSpin] = useState(false);
  const [win, setWin] = useState<"jackpot" | "small" | null>(null);
  const [credits, setCredits] = useState(100);
  const [userCount, setUserCount] = useState(3842);
  const [soundOn, setSoundOn] = useState(false);
  const [showPawRain, setShowPawRain] = useState(false);
  const [jackpotValue] = useState(5_555_555);

  const reelsDoneRef = useRef(0);
  const autoSpinRef = useRef<NodeJS.Timeout>();
  const audioCtxRef = useRef<AudioContext | null>(null);
  const getAudio = () => {
    if (!audioCtxRef.current) audioCtxRef.current = createAudioContext();
    return audioCtxRef.current;
  };

  const doSpin = useCallback(() => {
    if (spinning) return;

    const nextReels = Array.from({ length: NUM_REELS }, () =>
      Array.from({ length: VISIBLE_ROWS }, () => randomSymbolKey())
    );

    setFinalReels(nextReels);
    setSpinning(true);
    setWin(null);
    setShowPawRain(false);
    reelsDoneRef.current = 0;

    const betVal = parseFloat(bet) || 1;
    setCredits((c) => Math.max(0, c - betVal));
    if (soundOn) { const ctx = getAudio(); if (ctx) playSpinSound(ctx); }
  }, [spinning, bet, soundOn]);

  const handleReelDone = useCallback(() => {
    reelsDoneRef.current++;
    if (reelsDoneRef.current < NUM_REELS) return;

    setSpinning(false);

    // Check center row (index 1) across all reels
    setFinalReels((currentReels) => {
      const centerRow = currentReels.map((r) => r[1]);
      const betVal = parseFloat(bet) || 1;

      if (centerRow.every((s) => s === centerRow[0])) {
        setWin("jackpot");
        const mult = SYMBOL_SVGS[centerRow[0]].multiplier;
        setCredits((c) => c + betVal * mult * 5);
        setShowPawRain(true);
        if (soundOn) { const ctx = getAudio(); if (ctx) playJackpotSound(ctx); }
        setTimeout(() => setShowPawRain(false), 5000);
      } else if (new Set(centerRow).size <= 3) {
        const counts: Record<string, number> = {};
        centerRow.forEach((s) => { counts[s] = (counts[s] || 0) + 1; });
        const maxCount = Math.max(...Object.values(counts));
        if (maxCount >= 3) {
          setWin("small");
          setCredits((c) => c + betVal * maxCount);
          if (soundOn) { const ctx = getAudio(); if (ctx) playWinSound(ctx); }
        }
      }

      return currentReels;
    });
  }, [bet, soundOn]);

  useEffect(() => {
    if (autoSpin && !spinning) autoSpinRef.current = setTimeout(doSpin, 1500);
    else clearTimeout(autoSpinRef.current);
    return () => clearTimeout(autoSpinRef.current);
  }, [autoSpin, spinning, doSpin]);

  useEffect(() => {
    const iv = setInterval(() => setUserCount((c) => c + Math.floor(Math.random() * 3)), 2000);
    return () => clearInterval(iv);
  }, []);

  const winAmount = win === "jackpot"
    ? ((parseFloat(bet) || 1) * SYMBOL_SVGS[finalReels[0][1]].multiplier * 5).toFixed(2)
    : win === "small"
    ? ((parseFloat(bet) || 1) * 3).toFixed(2)
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
        <div className="absolute inset-0 bg-gradient-to-b from-background/95 via-background to-background/95" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-secondary/5 blur-[150px] pointer-events-none" />

        <div className="relative max-w-6xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <span className="inline-block text-secondary font-orbitron text-xs tracking-widest uppercase font-semibold mb-4">
              🐱 Live Demo
            </span>
            <h2 className="font-orbitron font-bold text-3xl sm:text-4xl lg:text-5xl text-foreground">
              See It <span className="gradient-text">In Action</span>
            </h2>
            <p className="mt-4 text-muted-foreground font-inter max-w-xl mx-auto">
              Play the demo slot below. This is what you'll be building — and earning from.
            </p>
          </div>

          <div className="grid lg:grid-cols-[1fr_320px] gap-8 items-start">
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
              {/* Jackpot display */}
              <div className="text-center py-3" style={{
                background: "linear-gradient(90deg, rgba(255,215,0,0.05), rgba(255,215,0,0.12), rgba(255,215,0,0.05))",
                borderBottom: "1px solid rgba(255,215,0,0.15)",
              }}>
                <span className="text-xs font-inter text-muted-foreground uppercase tracking-widest">Jackpot</span>
                <div className="font-orbitron font-black text-2xl sm:text-3xl neon-text-gold">
                  {jackpotValue.toLocaleString()}
                </div>
              </div>

              {/* Slot header bar */}
              <div className="px-5 py-3 flex items-center justify-between" style={{
                background: "linear-gradient(90deg, rgba(255,215,0,0.06), rgba(224,64,251,0.06), rgba(0,229,255,0.06))",
                borderBottom: "1px solid rgba(255,255,255,0.06)",
              }}>
                <div className="flex items-center gap-2">
                  <span className="text-lg">🐱</span>
                  <span className="font-orbitron font-bold text-sm text-foreground tracking-wider">LUCKY CATS</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-muted-foreground text-xs font-inter">RTP 96.5%</span>
                  <button onClick={() => setSoundOn((s) => !s)}
                    className={`w-7 h-7 rounded-md border flex items-center justify-center text-xs transition-all ${
                      soundOn ? "bg-primary/10 border-primary/40 text-primary" : "bg-muted border-border text-muted-foreground"
                    }`}>
                    {soundOn ? "🔊" : "🔇"}
                  </button>
                </div>
              </div>

              {/* Reel window */}
              <div className="relative px-3 sm:px-5 py-6">
                {/* Top/bottom decorative lines */}
                <div className="absolute inset-x-3 sm:inset-x-5 top-0 h-px" style={{ background: "linear-gradient(90deg, transparent, rgba(255,215,0,0.3), transparent)" }} />
                <div className="absolute inset-x-3 sm:inset-x-5 bottom-0 h-px" style={{ background: "linear-gradient(90deg, transparent, rgba(224,64,251,0.3), transparent)" }} />

                {/* 5 Reels */}
                <div className="flex gap-1 sm:gap-2">
                  {finalReels.map((reel, i) => (
                    <Reel
                      key={i}
                      idx={i}
                      finalSymbols={reel}
                      spinning={spinning}
                      onSpinEnd={handleReelDone}
                    />
                  ))}
                </div>

                {/* Win line indicator */}
                <div className="absolute left-1 right-1 pointer-events-none" style={{
                  top: `calc(50% + ${SYMBOL_GAP / 2}px)`,
                  height: 2,
                  transform: "translateY(-50%)",
                }}>
                  <div className="h-full rounded-full" style={{
                    background: win ? "linear-gradient(90deg, transparent, rgba(255,215,0,0.8), transparent)" : "linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent)",
                    boxShadow: win ? "0 0 12px rgba(255,215,0,0.4)" : "none",
                  }} />
                </div>

                {/* Win overlay */}
                {win === "jackpot" && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20 rounded-xl" style={{
                    background: "radial-gradient(circle, rgba(255,215,0,0.15), transparent 70%)",
                  }}>
                    <div className="font-orbitron font-black text-3xl sm:text-4xl animate-bounce"
                      style={{ color: "#FFD700", textShadow: "0 0 30px #FFD700, 0 0 60px #FF8C00" }}>
                      🐱 JACKPOT! 🐱
                    </div>
                  </div>
                )}
                {win === "small" && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
                    <div className="font-orbitron font-black text-2xl sm:text-3xl"
                      style={{ color: "#00F5FF", textShadow: "0 0 20px #00F5FF", animation: "winFlash 0.4s ease 3" }}>
                      🐾 Winner!
                    </div>
                  </div>
                )}
              </div>

              {/* Paytable strip */}
              <div className="px-3 sm:px-5 pb-3">
                <div className="flex items-center justify-center gap-2 sm:gap-4 py-2 rounded-lg" style={{
                  background: "rgba(255,255,255,0.02)",
                  border: "1px solid rgba(255,255,255,0.04)",
                }}>
                  {SYMBOL_KEYS.map((key) => (
                    <div key={key} className="flex items-center gap-1 text-muted-foreground text-xs">
                      <img src={getSymbolDataUri(key)} alt="" className="w-5 h-5 sm:w-6 sm:h-6" />
                      <span className="font-inter hidden sm:inline">×{SYMBOL_SVGS[key].multiplier}</span>
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
                    <div className="text-muted-foreground text-[10px] font-inter uppercase tracking-wider">Credits</div>
                    <div className="text-primary font-orbitron font-bold text-lg sm:text-xl">{credits.toFixed(2)}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-muted-foreground text-[10px] font-inter uppercase tracking-wider">Bet</div>
                    <input type="number" value={bet} onChange={(e) => setBet(e.target.value)}
                      className="w-20 sm:w-24 text-center bg-muted border border-border rounded-lg px-2 py-1 text-foreground font-orbitron text-base sm:text-lg focus:outline-none focus:border-primary/50"
                      step="0.5" min="0.5" />
                  </div>
                  <div className="text-right">
                    <div className="text-muted-foreground text-[10px] font-inter uppercase tracking-wider">Win</div>
                    <div className="font-orbitron font-bold text-lg sm:text-xl neon-text-gold">{winAmount}</div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button onClick={doSpin} disabled={spinning}
                    className="btn-primary flex-1 py-3 rounded-xl text-sm disabled:opacity-50 disabled:cursor-not-allowed">
                    {spinning ? "⟳ Spinning..." : "SPIN"}
                  </button>
                  <button onClick={() => setAutoSpin(!autoSpin)}
                    className={`px-4 py-3 rounded-xl text-sm font-orbitron font-semibold border transition-all ${
                      autoSpin ? "bg-secondary/20 border-secondary/50 text-secondary" : "btn-outline"
                    }`}>
                    AUTO
                  </button>
                </div>

                <p className="text-center text-muted-foreground text-xs font-inter mt-3">
                  🐾 Match 3+ in the center row to win · 5 of a kind = JACKPOT
                </p>
              </div>
            </div>

            {/* ── Right panel ── */}
            <div className="space-y-6">
              <BondingCurveChart userCount={userCount} />

              <div className="glass-card p-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                  <span className="font-orbitron text-foreground text-sm font-bold">Live Activity</span>
                </div>
                <div className="space-y-2">
                  {[
                    { addr: "8xK2...fP3q", action: "bought 50 shares", time: "2s ago" },
                    { addr: "9mN1...aR7w", action: "spun 2.5 SOL", time: "5s ago" },
                    { addr: "3pQ8...bH4e", action: "bought 20 shares", time: "12s ago" },
                    { addr: "7jL5...cW9k", action: "spun 0.8 SOL", time: "18s ago" },
                  ].map((item, i) => (
                    <div key={i} className="flex justify-between items-center text-xs font-inter py-1.5 border-b border-border last:border-0">
                      <div>
                        <span className="text-primary/70 font-mono">{item.addr}</span>
                        <span className="text-muted-foreground ml-2">{item.action}</span>
                      </div>
                      <span className="text-muted-foreground/50">{item.time}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="glass-card p-6" style={{ border: "1px solid rgba(255,215,0,0.2)", boxShadow: "0 0 20px rgba(255,215,0,0.05)" }}>
                <div className="text-muted-foreground text-xs font-inter uppercase tracking-wider mb-3">
                  Creator earnings (this slot)
                </div>
                <div className="font-orbitron font-black text-4xl neon-text-gold mb-1">+2.84 SOL</div>
                <div className="text-muted-foreground text-xs font-inter">Last 24 hours · ~$412 USD</div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
};

export default SlotDemoSection;
