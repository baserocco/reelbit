/**
 * SlotCanvas — Dragon's Inferno — Volcanic canvas-rendered 5-reel slot.
 * Dark volcanic environment, dragon silhouette, lava glow, fire particles.
 */
import { useRef, useEffect } from "react";
import {
  SYMBOLS, NUM_REELS, NUM_ROWS, PAYLINES,
  generateGrid, evaluateWins, shouldAnticipate,
  weightedRandomSymbol,
  type SymbolDef, type WinResult,
} from "./SlotEngine";
import {
  easeOutExpo, easeOutBack,
  createWinParticles, updateParticles, drawParticle,
  createAmbientParticles, updateAmbientParticles, drawAmbientParticle,
  getShakeOffset, drawAnticipationEffect, drawWinHighlight,
  type Particle, type AmbientParticle, type ShakeState,
} from "./AnimationManager";
import { getSymbolCanvas } from "./SymbolRenderer";

// Layout
const REEL_PADDING = 6;
const SYMBOL_SIZE = 90;
const SYMBOL_RENDER_SIZE = 128;
const GAP = 4;
const CELL_H = SYMBOL_SIZE + GAP;
const REEL_W = SYMBOL_SIZE + REEL_PADDING * 2;
const REEL_GAP = 4;
const VISIBLE_H = NUM_ROWS * CELL_H - GAP;
const FRAME_PAD = 16;
const HEADER_H = 50;
const FOOTER_H = 0;

const CANVAS_W = NUM_REELS * REEL_W + (NUM_REELS - 1) * REEL_GAP + FRAME_PAD * 2;
const CANVAS_H = VISIBLE_H + FRAME_PAD * 2 + HEADER_H + FOOTER_H;

// Spin config
const BASE_SPIN_DURATION = 1300;
const REEL_DELAY = 170;
const EXTRA_SYMBOLS = 22;
const ANTICIPATION_EXTRA_DELAY = 1100;
const BOUNCE_DURATION = 28;

interface SlotCanvasProps {
  bet: number;
  balance: number;
  onBalanceChange: (delta: number) => void;
  onWin: (amount: number, isJackpot: boolean) => void;
  spinning: boolean;
  onSpinStart: () => void;
  onSpinEnd: () => void;
}

export default function SlotCanvas({
  bet, balance, onBalanceChange, onWin,
  spinning, onSpinStart, onSpinEnd,
}: SlotCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);
  const dprRef = useRef(1);

  const gridRef = useRef<SymbolDef[][]>(generateGrid());
  const targetGridRef = useRef<SymbolDef[][]>(generateGrid());
  const reelStartTimeRef = useRef<number[]>(Array(NUM_REELS).fill(0));
  const reelStoppedRef = useRef<boolean[]>(Array(NUM_REELS).fill(true));
  const spinActiveRef = useRef(false);
  const particlesRef = useRef<Particle[]>([]);
  const ambientRef = useRef<AmbientParticle[]>([]);
  const shakeRef = useRef<ShakeState>({ active: false, intensity: 0, duration: 0, elapsed: 0 });
  const winResultsRef = useRef<WinResult[]>([]);
  const winFlashRef = useRef(0);
  const bounceRef = useRef<Map<string, number>>(new Map());
  const lightSweepRef = useRef(0);
  const anticipateRef = useRef(false);
  const reelStripsRef = useRef<SymbolDef[][]>(Array(NUM_REELS).fill([]));
  const timeRef = useRef(0);
  const reelBounceRef = useRef<number[]>(Array(NUM_REELS).fill(-1));

  useEffect(() => {
    const dpr = window.devicePixelRatio || 1;
    dprRef.current = dpr;
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = CANVAS_W * dpr;
    canvas.height = CANVAS_H * dpr;
    ambientRef.current = createAmbientParticles(CANVAS_W, CANVAS_H, 50);
  }, []);

  useEffect(() => {
    if (!spinning || spinActiveRef.current) return;
    const target = generateGrid();
    targetGridRef.current = target;
    spinActiveRef.current = true;
    anticipateRef.current = false;
    winResultsRef.current = [];
    winFlashRef.current = 0;
    bounceRef.current.clear();
    reelBounceRef.current = Array(NUM_REELS).fill(-1);

    for (let r = 0; r < NUM_REELS; r++) {
      const strip: SymbolDef[] = [];
      for (let i = 0; i < EXTRA_SYMBOLS; i++) strip.push(weightedRandomSymbol());
      strip.push(...target[r]);
      reelStripsRef.current[r] = strip;
      reelStoppedRef.current[r] = false;
      reelStartTimeRef.current[r] = performance.now() + r * REEL_DELAY;
    }
  }, [spinning]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const dpr = dprRef.current;

    const render = (now: number) => {
      timeRef.current++;
      ctx.save();
      ctx.scale(dpr, dpr);

      // Shake
      const shake = shakeRef.current;
      if (shake.active) {
        shake.elapsed++;
        if (shake.elapsed >= shake.duration) shake.active = false;
      }
      const shakeOff = getShakeOffset(shake);
      ctx.translate(shakeOff.x, shakeOff.y);

      ctx.clearRect(-10, -10, CANVAS_W + 20, CANVAS_H + 20);

      // ── VOLCANIC BACKGROUND ──
      const bgGrad = ctx.createLinearGradient(0, 0, 0, CANVAS_H);
      bgGrad.addColorStop(0, "#080305");
      bgGrad.addColorStop(0.25, "#100606");
      bgGrad.addColorStop(0.5, "#150804");
      bgGrad.addColorStop(0.75, "#1a0a04");
      bgGrad.addColorStop(1, "#0d0402");
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

      // Animated lava veins at bottom
      const t = timeRef.current;
      for (let i = 0; i < 3; i++) {
        const veinY = CANVAS_H - 15 + Math.sin(t * 0.008 + i * 2) * 8;
        const veinGrad = ctx.createLinearGradient(0, veinY - 5, 0, veinY + 5);
        veinGrad.addColorStop(0, "rgba(255,60,0,0)");
        veinGrad.addColorStop(0.5, `rgba(255,${50 + i * 20},0,${0.06 + Math.sin(t * 0.02 + i) * 0.03})`);
        veinGrad.addColorStop(1, "rgba(255,30,0,0)");
        ctx.fillStyle = veinGrad;
        ctx.fillRect(0, veinY - 5, CANVAS_W, 10);
      }

      // Lava glow from bottom — more intense pulsing
      const lavaBreath = Math.sin(t * 0.018) * 0.5 + 0.5;
      const lavaGlow = ctx.createLinearGradient(0, CANVAS_H * 0.5, 0, CANVAS_H);
      lavaGlow.addColorStop(0, "rgba(255,40,0,0)");
      lavaGlow.addColorStop(0.4, `rgba(255,50,0,${0.04 + lavaBreath * 0.04})`);
      lavaGlow.addColorStop(0.7, `rgba(255,40,0,${0.08 + lavaBreath * 0.06})`);
      lavaGlow.addColorStop(1, `rgba(255,25,0,${0.15 + lavaBreath * 0.08})`);
      ctx.fillStyle = lavaGlow;
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

      // Deep vignette
      const vignette = ctx.createRadialGradient(
        CANVAS_W / 2, CANVAS_H / 2, CANVAS_W * 0.18,
        CANVAS_W / 2, CANVAS_H / 2, CANVAS_W * 0.85
      );
      vignette.addColorStop(0, "rgba(0,0,0,0)");
      vignette.addColorStop(0.6, "rgba(0,0,0,0.2)");
      vignette.addColorStop(1, "rgba(0,0,0,0.55)");
      ctx.fillStyle = vignette;
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

      // ── ANIMATED DRAGON SILHOUETTE ──
      const dragonBreath = 0.5 + Math.sin(t * 0.012) * 0.5;
      const dragonBreath2 = 0.5 + Math.sin(t * 0.02 + 1) * 0.5;

      // Dragon body glow — pulsing warmth behind reels
      const dragonGlow = ctx.createRadialGradient(
        CANVAS_W / 2, CANVAS_H * 0.4 + Math.sin(t * 0.008) * 3, 0,
        CANVAS_W / 2, CANVAS_H * 0.4, CANVAS_W * 0.5
      );
      dragonGlow.addColorStop(0, `rgba(220, 50, 0, ${0.07 + dragonBreath * 0.06})`);
      dragonGlow.addColorStop(0.3, `rgba(180, 30, 0, ${0.04 + dragonBreath * 0.03})`);
      dragonGlow.addColorStop(0.6, `rgba(120, 15, 0, ${0.02 + dragonBreath * 0.015})`);
      dragonGlow.addColorStop(1, "rgba(80, 0, 0, 0)");
      ctx.fillStyle = dragonGlow;
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

      // Dragon wing shadows — subtle triangular forms
      ctx.save();
      ctx.globalAlpha = 0.03 + dragonBreath * 0.02;
      for (const side of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(CANVAS_W / 2, HEADER_H * 0.3);
        ctx.quadraticCurveTo(
          CANVAS_W / 2 + side * CANVAS_W * (0.35 + dragonBreath * 0.05),
          CANVAS_H * 0.15,
          CANVAS_W / 2 + side * CANVAS_W * 0.4,
          CANVAS_H * 0.55
        );
        ctx.lineTo(CANVAS_W / 2, CANVAS_H * 0.5);
        ctx.closePath();
        ctx.fillStyle = `rgba(200, 30, 0, 1)`;
        ctx.fill();
      }
      ctx.restore();

      // Dragon eyes — more alive with flicker
      const eyeIntensity = 0.1 + dragonBreath * 0.1 + Math.sin(t * 0.1) * 0.02;
      const eyeSize = 10 + dragonBreath2 * 3;
      for (const side of [-1, 1]) {
        const ex = CANVAS_W / 2 + side * CANVAS_W * 0.11;
        const ey = HEADER_H * 0.45 + Math.sin(t * 0.008 + side) * 1.5;

        // Outer halo
        const halo = ctx.createRadialGradient(ex, ey, 0, ex, ey, eyeSize * 2.5);
        halo.addColorStop(0, `rgba(255, 200, 0, ${eyeIntensity * 0.6})`);
        halo.addColorStop(0.4, `rgba(255, 120, 0, ${eyeIntensity * 0.3})`);
        halo.addColorStop(1, "rgba(255, 50, 0, 0)");
        ctx.fillStyle = halo;
        ctx.fillRect(ex - eyeSize * 3, ey - eyeSize * 3, eyeSize * 6, eyeSize * 6);

        // Core eye
        const eyeGrad = ctx.createRadialGradient(ex, ey, 0, ex, ey, eyeSize * 0.8);
        eyeGrad.addColorStop(0, `rgba(255, 255, 100, ${eyeIntensity * 1.5})`);
        eyeGrad.addColorStop(0.5, `rgba(255, 180, 0, ${eyeIntensity})`);
        eyeGrad.addColorStop(1, "rgba(255, 80, 0, 0)");
        ctx.fillStyle = eyeGrad;
        ctx.beginPath();
        ctx.ellipse(ex, ey, eyeSize * 0.6, eyeSize * 0.35, side * 0.15, 0, Math.PI * 2);
        ctx.fill();
      }

      // Dragon breath smoke — subtle wisps above reels
      ctx.save();
      ctx.globalAlpha = 0.025 + dragonBreath * 0.015;
      for (let i = 0; i < 3; i++) {
        const bx = CANVAS_W / 2 + Math.sin(t * 0.006 + i * 2) * 40;
        const by = HEADER_H * 0.7 + i * 8;
        const bSize = 20 + i * 10;
        const breathGrad = ctx.createRadialGradient(bx, by, 0, bx, by, bSize);
        breathGrad.addColorStop(0, "rgba(255,100,0,1)");
        breathGrad.addColorStop(1, "rgba(255,50,0,0)");
        ctx.fillStyle = breathGrad;
        ctx.fillRect(bx - bSize, by - bSize, bSize * 2, bSize * 2);
      }
      ctx.restore();

      // Floating embers
      ambientRef.current = updateAmbientParticles(ambientRef.current, t, CANVAS_H);
      for (const p of ambientRef.current) {
        drawAmbientParticle(ctx, p, t);
      }

      // Light sweep — warm volcanic
      lightSweepRef.current = (lightSweepRef.current + 0.0015) % 1;
      const sweepX = lightSweepRef.current * (CANVAS_W + 400) - 200;
      const sweepGrad = ctx.createLinearGradient(sweepX - 130, 0, sweepX + 130, 0);
      sweepGrad.addColorStop(0, "rgba(255,200,100,0)");
      sweepGrad.addColorStop(0.3, "rgba(255,150,50,0.012)");
      sweepGrad.addColorStop(0.5, "rgba(255,220,120,0.04)");
      sweepGrad.addColorStop(0.7, "rgba(255,150,50,0.012)");
      sweepGrad.addColorStop(1, "rgba(255,200,100,0)");
      ctx.fillStyle = sweepGrad;
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

      // Frame border — molten gold with animated glow
      ctx.save();
      const frameGlowIntensity = 0.4 + Math.sin(t * 0.015) * 0.1;
      ctx.shadowColor = `rgba(255,100,0,${frameGlowIntensity})`;
      ctx.shadowBlur = 20 + Math.sin(t * 0.02) * 5;
      const frameGrad = ctx.createLinearGradient(0, 0, CANVAS_W, CANVAS_H);
      frameGrad.addColorStop(0, "rgba(255,180,0,0.4)");
      frameGrad.addColorStop(0.25, "rgba(255,100,0,0.3)");
      frameGrad.addColorStop(0.5, "rgba(255,200,50,0.35)");
      frameGrad.addColorStop(0.75, "rgba(255,100,0,0.3)");
      frameGrad.addColorStop(1, "rgba(200,50,0,0.35)");
      ctx.strokeStyle = frameGrad;
      ctx.lineWidth = 2.5;
      roundRect(ctx, 1, 1, CANVAS_W - 2, CANVAS_H - 2, 16);
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = "rgba(255,200,100,0.05)";
      ctx.lineWidth = 1;
      roundRect(ctx, 3, 3, CANVAS_W - 6, CANVAS_H - 6, 14);
      ctx.stroke();
      ctx.restore();

      // ── REELS ──
      const reelAreaY = HEADER_H + FRAME_PAD;
      for (let r = 0; r < NUM_REELS; r++) {
        const rx = FRAME_PAD + r * (REEL_W + REEL_GAP);

        // Reel background — dark with warm undertone
        const reelBg = ctx.createLinearGradient(rx, reelAreaY, rx, reelAreaY + VISIBLE_H);
        reelBg.addColorStop(0, "rgba(15,5,2,0.6)");
        reelBg.addColorStop(0.5, "rgba(10,3,1,0.5)");
        reelBg.addColorStop(1, "rgba(15,5,2,0.6)");
        ctx.fillStyle = reelBg;
        roundRect(ctx, rx, reelAreaY, REEL_W, VISIBLE_H, 8);
        ctx.fill();

        // Inner shadow
        const innerShadow = ctx.createLinearGradient(rx, reelAreaY, rx + REEL_W, reelAreaY);
        innerShadow.addColorStop(0, "rgba(0,0,0,0.25)");
        innerShadow.addColorStop(0.15, "rgba(0,0,0,0)");
        innerShadow.addColorStop(0.85, "rgba(0,0,0,0)");
        innerShadow.addColorStop(1, "rgba(0,0,0,0.25)");
        ctx.fillStyle = innerShadow;
        ctx.fillRect(rx, reelAreaY, REEL_W, VISIBLE_H);

        // Reel border
        ctx.strokeStyle = "rgba(255,150,50,0.08)";
        ctx.lineWidth = 1;
        roundRect(ctx, rx, reelAreaY, REEL_W, VISIBLE_H, 8);
        ctx.stroke();

        // Clip
        ctx.save();
        ctx.beginPath();
        roundRect(ctx, rx, reelAreaY, REEL_W, VISIBLE_H, 8);
        ctx.clip();

        if (!reelStoppedRef.current[r] && spinActiveRef.current) {
          const startTime = reelStartTimeRef.current[r];
          let duration = BASE_SPIN_DURATION + r * REEL_DELAY;
          if (r === NUM_REELS - 1 && anticipateRef.current) {
            duration += ANTICIPATION_EXTRA_DELAY;
          }

          const elapsed = now - startTime;
          const progress = Math.min(elapsed / duration, 1);
          const eased = progress < 0.7
            ? easeOutExpo(progress / 0.7) * 0.85
            : 0.85 + easeOutBack((progress - 0.7) / 0.3) * 0.15;

          const strip = reelStripsRef.current[r];
          const totalHeight = strip.length * CELL_H;
          const offset = Math.min(eased, 1.0) * (totalHeight - VISIBLE_H);

          // Heavy motion blur
          const spinSpeed = progress < 0.65 ? Math.sin((progress / 0.65) * Math.PI) : 0;
          if (progress > 0.02 && progress < 0.65) {
            ctx.filter = `blur(${spinSpeed * 5}px)`;
            // Fire speed lines
            ctx.fillStyle = `rgba(255, 100, 0, ${spinSpeed * 0.06})`;
            for (let sl = 0; sl < 4; sl++) {
              const slx = rx + REEL_PADDING + Math.random() * (REEL_W - REEL_PADDING * 2);
              ctx.fillRect(slx, reelAreaY, 1.5, VISIBLE_H);
            }
          }

          for (let i = 0; i < strip.length; i++) {
            const sy = i * CELL_H - offset;
            if (sy > -CELL_H && sy < VISIBLE_H + CELL_H) {
              const symCanvas = getSymbolCanvas(strip[i], SYMBOL_RENDER_SIZE);
              ctx.drawImage(
                symCanvas,
                rx + REEL_PADDING,
                reelAreaY + sy + (CELL_H - SYMBOL_SIZE) / 2,
                SYMBOL_SIZE, SYMBOL_SIZE
              );
            }
          }
          ctx.filter = "none";

          if (progress >= 1) {
            reelStoppedRef.current[r] = true;
            reelBounceRef.current[r] = 0;
            gridRef.current[r] = targetGridRef.current[r];

            if (r === 3) {
              anticipateRef.current = shouldAnticipate(targetGridRef.current, 4);
            }

            if (reelStoppedRef.current.every(Boolean)) {
              spinActiveRef.current = false;
              const wins = evaluateWins(targetGridRef.current, bet);
              winResultsRef.current = wins;
              const totalWin = wins.reduce((s, w) => s + w.payout, 0);

              if (totalWin > 0) {
                winFlashRef.current = 100;
                for (const w of wins) {
                  for (let wr = 0; wr < w.count; wr++) {
                    const px = FRAME_PAD + wr * (REEL_W + REEL_GAP) + REEL_W / 2;
                    const py = reelAreaY + w.positions[wr] * CELL_H + CELL_H / 2;
                    particlesRef.current.push(
                      ...createWinParticles(px, py, 20, w.symbol.color)
                    );
                    bounceRef.current.set(`${wr}_${w.positions[wr]}`, 0);
                  }
                }

                if (totalWin >= bet * 10) {
                  shakeRef.current = { active: true, intensity: 10, duration: 35, elapsed: 0 };
                } else if (totalWin >= bet * 3) {
                  shakeRef.current = { active: true, intensity: 4, duration: 18, elapsed: 0 };
                }

                onWin(totalWin, totalWin >= bet * 20);
              }
              onSpinEnd();
            }
          }
        } else {
          // Static reel
          const currentGrid = gridRef.current[r];
          let reelBounceOff = 0;
          if (reelBounceRef.current[r] >= 0) {
            const bp = reelBounceRef.current[r];
            reelBounceRef.current[r]++;
            if (bp < BOUNCE_DURATION) {
              const t = bp / BOUNCE_DURATION;
              reelBounceOff = Math.sin(t * Math.PI * 3) * (1 - t) * 8;
            } else {
              reelBounceRef.current[r] = -1;
            }
          }

          for (let row = 0; row < NUM_ROWS; row++) {
            const sy = row * CELL_H;
            const sym = currentGrid[row];
            const bounceKey = `${r}_${row}`;
            let symbolBounce = 0;

            if (bounceRef.current.has(bounceKey)) {
              const bp = bounceRef.current.get(bounceKey)!;
              bounceRef.current.set(bounceKey, bp + 1);
              if (bp < 35) {
                const t = bp / 35;
                symbolBounce = Math.sin(t * Math.PI * 3) * (1 - t) * -14;
              } else {
                bounceRef.current.delete(bounceKey);
              }
            }

            const isWinning = winResultsRef.current.some(
              (w) => w.positions[r] === row && r < w.count
            );
            if (isWinning && winFlashRef.current > 0) {
              const winSym = winResultsRef.current.find(
                (w) => w.positions[r] === row && r < w.count
              );
              drawWinHighlight(
                ctx, rx, reelAreaY + sy, REEL_W, CELL_H - GAP,
                winSym?.symbol.color ?? "#FF4400",
                winFlashRef.current / 100
              );
            }

            const symCanvas = getSymbolCanvas(sym, SYMBOL_RENDER_SIZE);
            const scale = isWinning && winFlashRef.current > 0
              ? 1 + Math.sin((winFlashRef.current / 100) * Math.PI * 3) * 0.08
              : 1;
            const drawSize = SYMBOL_SIZE * scale;
            const drawOffset = (SYMBOL_SIZE - drawSize) / 2;

            ctx.drawImage(
              symCanvas,
              rx + REEL_PADDING + drawOffset,
              reelAreaY + sy + (CELL_H - SYMBOL_SIZE) / 2 + symbolBounce + reelBounceOff + drawOffset,
              drawSize, drawSize
            );
          }
        }

        ctx.restore();

        // Fade masks — dark volcanic color
        const fadeH = 20;
        const topFade = ctx.createLinearGradient(0, reelAreaY, 0, reelAreaY + fadeH);
        topFade.addColorStop(0, "#0a0506");
        topFade.addColorStop(1, "rgba(10,5,6,0)");
        ctx.fillStyle = topFade;
        ctx.fillRect(rx, reelAreaY, REEL_W, fadeH);

        const botFade = ctx.createLinearGradient(0, reelAreaY + VISIBLE_H - fadeH, 0, reelAreaY + VISIBLE_H);
        botFade.addColorStop(0, "rgba(10,5,6,0)");
        botFade.addColorStop(1, "#0a0506");
        ctx.fillStyle = botFade;
        ctx.fillRect(rx, reelAreaY + VISIBLE_H - fadeH, REEL_W, fadeH);
      }

      // Lava glow beneath reels
      const lavaY = reelAreaY + VISIBLE_H - 5;
      const lavaUnder = ctx.createLinearGradient(FRAME_PAD, lavaY, FRAME_PAD, lavaY + 25);
      const lavaPulse = 0.5 + Math.sin(timeRef.current * 0.03) * 0.3;
      lavaUnder.addColorStop(0, `rgba(255,80,0,${0.15 + lavaPulse * 0.1})`);
      lavaUnder.addColorStop(0.5, `rgba(255,40,0,${0.08 + lavaPulse * 0.05})`);
      lavaUnder.addColorStop(1, "rgba(255,20,0,0)");
      ctx.fillStyle = lavaUnder;
      ctx.fillRect(FRAME_PAD, lavaY, CANVAS_W - FRAME_PAD * 2, 25);

      // Win paylines — fire colored
      if (winFlashRef.current > 0) {
        winFlashRef.current--;
        for (const w of winResultsRef.current) {
          const dashOffset = timeRef.current * 2.5;
          // Outer glow line
          ctx.shadowColor = w.symbol.color;
          ctx.shadowBlur = 10;
          ctx.strokeStyle = w.symbol.color + "60";
          ctx.lineWidth = 8;
          ctx.setLineDash([]);
          ctx.beginPath();
          for (let wr = 0; wr < w.count; wr++) {
            const px = FRAME_PAD + wr * (REEL_W + REEL_GAP) + REEL_W / 2;
            const py = reelAreaY + w.positions[wr] * CELL_H + CELL_H / 2;
            if (wr === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
          }
          ctx.stroke();
          ctx.shadowBlur = 0;

          // Inner dashed line
          ctx.strokeStyle = "#FFD700CC";
          ctx.lineWidth = 2.5;
          ctx.setLineDash([6, 4]);
          ctx.lineDashOffset = dashOffset;
          ctx.beginPath();
          for (let wr = 0; wr < w.count; wr++) {
            const px = FRAME_PAD + wr * (REEL_W + REEL_GAP) + REEL_W / 2;
            const py = reelAreaY + w.positions[wr] * CELL_H + CELL_H / 2;
            if (wr === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
          }
          ctx.stroke();
          ctx.setLineDash([]);
        }
      }

      // Particles
      particlesRef.current = updateParticles(particlesRef.current);
      for (const p of particlesRef.current) drawParticle(ctx, p);

      // Center payline marker
      const lineY = reelAreaY + 1 * CELL_H + CELL_H / 2;
      ctx.strokeStyle = "rgba(255,180,0,0.12)";
      ctx.lineWidth = 1;
      ctx.setLineDash([8, 6]);
      ctx.beginPath();
      ctx.moveTo(FRAME_PAD - 4, lineY);
      ctx.lineTo(CANVAS_W - FRAME_PAD + 4, lineY);
      ctx.stroke();
      ctx.setLineDash([]);

      // Payline arrows — gold/fire
      for (const side of [-1, 1]) {
        const ax = side === -1 ? FRAME_PAD - 8 : CANVAS_W - FRAME_PAD + 8;
        ctx.fillStyle = "rgba(255,180,0,0.3)";
        ctx.beginPath();
        ctx.moveTo(ax, lineY - 5);
        ctx.lineTo(ax + side * 6, lineY);
        ctx.lineTo(ax, lineY + 5);
        ctx.closePath();
        ctx.fill();
      }

      // Anticipation
      if (anticipateRef.current && !reelStoppedRef.current[NUM_REELS - 1]) {
        const lastReelX = FRAME_PAD + (NUM_REELS - 1) * (REEL_W + REEL_GAP);
        drawAnticipationEffect(ctx, lastReelX, reelAreaY, REEL_W, VISIBLE_H, timeRef.current);
      }

      ctx.restore();
      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [bet, onWin, onSpinEnd, spinning]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        width: CANVAS_W,
        height: CANVAS_H,
        maxWidth: "100%",
        borderRadius: 16,
      }}
    />
  );
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}
