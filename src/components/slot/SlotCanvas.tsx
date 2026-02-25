/**
 * SlotCanvas — Premium Canvas-rendered 5-reel slot machine.
 * Renders reels, animations, particles, and effects at 60fps.
 */
import { useRef, useEffect, useState, useCallback } from "react";
import {
  SYMBOLS, NUM_REELS, NUM_ROWS, PAYLINES,
  generateGrid, evaluateWins, countBonusSymbols, shouldAnticipate,
  weightedRandomSymbol,
  type SymbolDef, type WinResult,
} from "./SlotEngine";
import {
  easeOutExpo,
  createWinParticles, updateParticles,
  createAmbientParticles, updateAmbientParticles,
  getShakeOffset,
  type Particle, type AmbientParticle, type ShakeState,
} from "./AnimationManager";
import { getSymbolCanvas } from "./SymbolRenderer";

// Layout
const REEL_PADDING = 6;
const SYMBOL_SIZE = 90;
const SYMBOL_RENDER_SIZE = 128; // cached canvas size
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
const BASE_SPIN_DURATION = 1200; // ms
const REEL_DELAY = 150; // ms between each reel stop
const EXTRA_SYMBOLS = 20; // symbols per reel during spin
const ANTICIPATION_EXTRA_DELAY = 800; // ms extra for last reel

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

  // State refs (avoid re-render during animation loop)
  const gridRef = useRef<SymbolDef[][]>(generateGrid());
  const targetGridRef = useRef<SymbolDef[][]>(generateGrid());
  const reelPhaseRef = useRef<number[]>(Array(NUM_REELS).fill(0)); // 0=idle, >0=spinning progress
  const reelStartTimeRef = useRef<number[]>(Array(NUM_REELS).fill(0));
  const reelStoppedRef = useRef<boolean[]>(Array(NUM_REELS).fill(true));
  const spinActiveRef = useRef(false);
  const particlesRef = useRef<Particle[]>([]);
  const ambientRef = useRef<AmbientParticle[]>([]);
  const shakeRef = useRef<ShakeState>({ active: false, intensity: 0, duration: 0, elapsed: 0 });
  const winResultsRef = useRef<WinResult[]>([]);
  const winFlashRef = useRef(0);
  const bounceRef = useRef<Map<string, number>>(new Map()); // "reel_row" -> bounce progress
  const lightSweepRef = useRef(0);
  const anticipateRef = useRef(false);

  // Random symbol strips for each reel (generated on spin start)
  const reelStripsRef = useRef<SymbolDef[][]>(Array(NUM_REELS).fill([]));

  const timeRef = useRef(0);

  // Initialize ambient particles
  useEffect(() => {
    const dpr = window.devicePixelRatio || 1;
    dprRef.current = dpr;
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = CANVAS_W * dpr;
    canvas.height = CANVAS_H * dpr;
    ambientRef.current = createAmbientParticles(CANVAS_W, CANVAS_H, 30);
  }, []);

  // Spin trigger
  useEffect(() => {
    if (!spinning || spinActiveRef.current) return;

    const target = generateGrid();
    targetGridRef.current = target;
    spinActiveRef.current = true;
    anticipateRef.current = false;
    winResultsRef.current = [];
    winFlashRef.current = 0;
    bounceRef.current.clear();

    // Generate random strips for each reel
    for (let r = 0; r < NUM_REELS; r++) {
      const strip: SymbolDef[] = [];
      for (let i = 0; i < EXTRA_SYMBOLS; i++) {
        strip.push(weightedRandomSymbol());
      }
      // Final 3 symbols are the target
      strip.push(...target[r]);
      reelStripsRef.current[r] = strip;
      reelStoppedRef.current[r] = false;
      reelStartTimeRef.current[r] = performance.now() + r * REEL_DELAY;
    }
  }, [spinning]);

  // Main render loop
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

      // Clear
      ctx.clearRect(-10, -10, CANVAS_W + 20, CANVAS_H + 20);

      // Background
      const bgGrad = ctx.createLinearGradient(0, 0, 0, CANVAS_H);
      bgGrad.addColorStop(0, "#0d0a1a");
      bgGrad.addColorStop(1, "#06040e");
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

      // Ambient particles
      ambientRef.current = updateAmbientParticles(ambientRef.current, timeRef.current, CANVAS_H);
      for (const p of ambientRef.current) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(150, 130, 255, ${p.alpha})`;
        ctx.fill();
      }

      // Light sweep
      lightSweepRef.current = (lightSweepRef.current + 0.003) % 1;
      const sweepX = lightSweepRef.current * (CANVAS_W + 200) - 100;
      const sweepGrad = ctx.createLinearGradient(sweepX - 60, 0, sweepX + 60, 0);
      sweepGrad.addColorStop(0, "rgba(255,255,255,0)");
      sweepGrad.addColorStop(0.5, "rgba(255,255,255,0.03)");
      sweepGrad.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = sweepGrad;
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

      // Frame border glow
      const frameGrad = ctx.createLinearGradient(0, 0, CANVAS_W, CANVAS_H);
      frameGrad.addColorStop(0, "rgba(153,69,255,0.3)");
      frameGrad.addColorStop(0.5, "rgba(255,215,0,0.2)");
      frameGrad.addColorStop(1, "rgba(153,69,255,0.3)");
      ctx.strokeStyle = frameGrad;
      ctx.lineWidth = 2;
      roundRect(ctx, 1, 1, CANVAS_W - 2, CANVAS_H - 2, 16);
      ctx.stroke();

      // Draw reels
      const reelAreaY = HEADER_H + FRAME_PAD;
      for (let r = 0; r < NUM_REELS; r++) {
        const rx = FRAME_PAD + r * (REEL_W + REEL_GAP);

        // Reel background
        ctx.fillStyle = "rgba(0,0,0,0.4)";
        roundRect(ctx, rx, reelAreaY, REEL_W, VISIBLE_H, 8);
        ctx.fill();

        // Reel border
        ctx.strokeStyle = "rgba(255,255,255,0.06)";
        ctx.lineWidth = 1;
        roundRect(ctx, rx, reelAreaY, REEL_W, VISIBLE_H, 8);
        ctx.stroke();

        // Clip to reel area
        ctx.save();
        ctx.beginPath();
        roundRect(ctx, rx, reelAreaY, REEL_W, VISIBLE_H, 8);
        ctx.clip();

        if (!reelStoppedRef.current[r] && spinActiveRef.current) {
          // Spinning reel
          const startTime = reelStartTimeRef.current[r];

          // Check anticipation: slow last reel if 2+ bonus in first 4
          let duration = BASE_SPIN_DURATION + r * REEL_DELAY;
          if (r === NUM_REELS - 1 && anticipateRef.current) {
            duration += ANTICIPATION_EXTRA_DELAY;
          }

          const elapsed = now - startTime;
          const progress = Math.min(elapsed / duration, 1);
          const eased = easeOutExpo(progress);

          const strip = reelStripsRef.current[r];
          const totalHeight = strip.length * CELL_H;
          const offset = eased * (totalHeight - VISIBLE_H);

          // Motion blur
          if (progress < 0.7 && progress > 0.05) {
            ctx.filter = `blur(${Math.sin(progress * Math.PI) * 2}px)`;
          }

          // Draw strip
          for (let i = 0; i < strip.length; i++) {
            const sy = i * CELL_H - offset;
            if (sy > -CELL_H && sy < VISIBLE_H + CELL_H) {
              const symCanvas = getSymbolCanvas(strip[i], SYMBOL_RENDER_SIZE);
              ctx.drawImage(
                symCanvas,
                rx + REEL_PADDING,
                reelAreaY + sy + (CELL_H - SYMBOL_SIZE) / 2,
                SYMBOL_SIZE,
                SYMBOL_SIZE
              );
            }
          }

          ctx.filter = "none";

          // Check if this reel is done
          if (progress >= 1) {
            reelStoppedRef.current[r] = true;
            gridRef.current[r] = targetGridRef.current[r];

            // Check anticipation after reel 3 stops
            if (r === 3) {
              anticipateRef.current = shouldAnticipate(targetGridRef.current, 4);
            }

            // All reels done?
            if (reelStoppedRef.current.every(Boolean)) {
              spinActiveRef.current = false;
              // Evaluate wins
              const wins = evaluateWins(targetGridRef.current, bet);
              winResultsRef.current = wins;
              const totalWin = wins.reduce((s, w) => s + w.payout, 0);

              if (totalWin > 0) {
                winFlashRef.current = 60;
                onWin(totalWin, totalWin >= bet * 20);

                // Particles per winning symbol
                for (const w of wins) {
                  for (let wr = 0; wr < w.count; wr++) {
                    const px = FRAME_PAD + wr * (REEL_W + REEL_GAP) + REEL_W / 2;
                    const py = reelAreaY + w.positions[wr] * CELL_H + CELL_H / 2;
                    particlesRef.current.push(
                      ...createWinParticles(px, py, 12, w.symbol.color)
                    );
                    bounceRef.current.set(`${wr}_${w.positions[wr]}`, 0);
                  }
                }

                // Screen shake for big wins
                if (totalWin >= bet * 10) {
                  shakeRef.current = { active: true, intensity: 6, duration: 20, elapsed: 0 };
                }
              }

              onSpinEnd();
            }
          }
        } else {
          // Static reel - draw current grid
          const currentGrid = gridRef.current[r];
          for (let row = 0; row < NUM_ROWS; row++) {
            const sy = row * CELL_H;
            const sym = currentGrid[row];
            const bounceKey = `${r}_${row}`;
            let bounceOff = 0;

            if (bounceRef.current.has(bounceKey)) {
              const bp = bounceRef.current.get(bounceKey)!;
              bounceRef.current.set(bounceKey, bp + 1);
              if (bp < 20) {
                bounceOff = Math.sin((bp / 20) * Math.PI) * -8;
              } else {
                bounceRef.current.delete(bounceKey);
              }
            }

            // Win highlight glow
            const isWinning = winResultsRef.current.some(
              (w) => w.positions[r] === row && r < w.count
            );
            if (isWinning && winFlashRef.current > 0) {
              const flashAlpha = Math.sin((winFlashRef.current / 60) * Math.PI) * 0.3;
              ctx.fillStyle = `rgba(255, 215, 0, ${flashAlpha})`;
              ctx.fillRect(rx, reelAreaY + sy, REEL_W, CELL_H - GAP);
            }

            const symCanvas = getSymbolCanvas(sym, SYMBOL_RENDER_SIZE);
            ctx.drawImage(
              symCanvas,
              rx + REEL_PADDING,
              reelAreaY + sy + (CELL_H - SYMBOL_SIZE) / 2 + bounceOff,
              SYMBOL_SIZE,
              SYMBOL_SIZE
            );
          }
        }

        ctx.restore();

        // Top/bottom reel fade masks
        const fadeH = 15;
        const topFade = ctx.createLinearGradient(0, reelAreaY, 0, reelAreaY + fadeH);
        topFade.addColorStop(0, "#0d0a1a");
        topFade.addColorStop(1, "rgba(13,10,26,0)");
        ctx.fillStyle = topFade;
        ctx.fillRect(rx, reelAreaY, REEL_W, fadeH);

        const botFade = ctx.createLinearGradient(0, reelAreaY + VISIBLE_H - fadeH, 0, reelAreaY + VISIBLE_H);
        botFade.addColorStop(0, "rgba(13,10,26,0)");
        botFade.addColorStop(1, "#0d0a1a");
        ctx.fillStyle = botFade;
        ctx.fillRect(rx, reelAreaY + VISIBLE_H - fadeH, REEL_W, fadeH);
      }

      // Win payline indicators
      if (winFlashRef.current > 0) {
        winFlashRef.current--;
        for (const w of winResultsRef.current) {
          ctx.strokeStyle = w.symbol.color + "80";
          ctx.lineWidth = 2;
          ctx.setLineDash([4, 4]);
          ctx.beginPath();
          for (let wr = 0; wr < w.count; wr++) {
            const px = FRAME_PAD + wr * (REEL_W + REEL_GAP) + REEL_W / 2;
            const py = reelAreaY + w.positions[wr] * CELL_H + CELL_H / 2;
            if (wr === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          }
          ctx.stroke();
          ctx.setLineDash([]);
        }
      }

      // Particles
      particlesRef.current = updateParticles(particlesRef.current);
      for (const p of particlesRef.current) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.color + Math.floor(p.alpha * 255).toString(16).padStart(2, "0");
        ctx.fill();
      }

      // Center payline marker
      const lineY = reelAreaY + 1 * CELL_H + CELL_H / 2;
      ctx.strokeStyle = "rgba(255,215,0,0.15)";
      ctx.lineWidth = 1;
      ctx.setLineDash([6, 6]);
      ctx.beginPath();
      ctx.moveTo(FRAME_PAD - 4, lineY);
      ctx.lineTo(CANVAS_W - FRAME_PAD + 4, lineY);
      ctx.stroke();
      ctx.setLineDash([]);

      // Anticipation glow on last reel
      if (anticipateRef.current && !reelStoppedRef.current[NUM_REELS - 1]) {
        const lastReelX = FRAME_PAD + (NUM_REELS - 1) * (REEL_W + REEL_GAP);
        const glowAlpha = 0.15 + Math.sin(timeRef.current * 0.15) * 0.1;
        ctx.fillStyle = `rgba(0, 255, 136, ${glowAlpha})`;
        roundRect(ctx, lastReelX, reelAreaY, REEL_W, VISIBLE_H, 8);
        ctx.fill();
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

/** Helper to draw rounded rect path */
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
