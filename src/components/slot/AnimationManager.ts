/**
 * AnimationManager — Dragon's Inferno fire-themed animations.
 * Embers, fire particles, volcanic shake, lava anticipation.
 */

// Easing functions
export function easeOutExpo(t: number): number {
  return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
}

export function easeOutBack(t: number): number {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

export function easeInOutQuad(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

export function easeOutElastic(t: number): number {
  if (t === 0 || t === 1) return t;
  return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * ((2 * Math.PI) / 3)) + 1;
}

export interface Particle {
  x: number; y: number;
  vx: number; vy: number;
  life: number; maxLife: number;
  size: number; color: string; alpha: number;
  type?: "spark" | "ring" | "trail" | "ember";
  rotation?: number; rotationSpeed?: number;
}

export function createWinParticles(cx: number, cy: number, count: number, color: string): Particle[] {
  const particles: Particle[] = [];
  // Fire burst sparks
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.6;
    const speed = 3.5 + Math.random() * 6;
    const fireColors = ["#FF4400", "#FF6600", "#FFAA00", "#FFD700", color];
    particles.push({
      x: cx, y: cy,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 0, maxLife: 45 + Math.random() * 40,
      size: 2 + Math.random() * 5,
      color: fireColors[Math.floor(Math.random() * fireColors.length)],
      alpha: 1, type: "spark",
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() - 0.5) * 0.4,
    });
  }
  // Fire ring burst
  particles.push({
    x: cx, y: cy, vx: 0, vy: 0,
    life: 0, maxLife: 35, size: 4,
    color: "#FF4400", alpha: 0.9, type: "ring",
  });
  // Rising embers
  for (let i = 0; i < 10; i++) {
    particles.push({
      x: cx + (Math.random() - 0.5) * 30,
      y: cy,
      vx: (Math.random() - 0.5) * 1.5,
      vy: -1.5 - Math.random() * 3,
      life: 0, maxLife: 70 + Math.random() * 50,
      size: 1 + Math.random() * 2.5,
      color: ["#FF4400", "#FF6600", "#FFAA00"][Math.floor(Math.random() * 3)],
      alpha: 0.8, type: "ember",
    });
  }
  // Trailing fire wisps
  for (let i = 0; i < 6; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 0.5 + Math.random() * 1.5;
    particles.push({
      x: cx, y: cy,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 2,
      life: 0, maxLife: 55 + Math.random() * 35,
      size: 1 + Math.random() * 2,
      color: "#FF6600", alpha: 0.7, type: "trail",
    });
  }
  return particles;
}

export function updateParticles(particles: Particle[]): Particle[] {
  return particles
    .map((p) => ({
      ...p,
      x: p.type === "ring" ? p.x : p.x + p.vx,
      y: p.type === "ring" ? p.y : p.y + p.vy,
      vx: p.type === "ember" ? p.vx + (Math.random() - 0.5) * 0.15 : (p.type === "trail" ? p.vx * 0.97 : p.vx),
      vy: p.type === "ember" ? p.vy - 0.01 : (p.type === "trail" ? p.vy + 0.01 : p.vy + 0.06),
      life: p.life + 1,
      size: p.type === "ring" ? p.size + 3 : (p.type === "ember" ? p.size * 0.995 : p.size * (p.type === "trail" ? 0.98 : 1)),
      alpha: p.type === "ring"
        ? Math.max(0, 0.9 * (1 - p.life / p.maxLife))
        : Math.max(0, 1 - p.life / p.maxLife),
      rotation: (p.rotation ?? 0) + (p.rotationSpeed ?? 0),
    }))
    .filter((p) => p.life < p.maxLife);
}

export function drawParticle(ctx: CanvasRenderingContext2D, p: Particle) {
  ctx.save();
  const hexAlpha = Math.floor(Math.min(p.alpha, 1) * 255).toString(16).padStart(2, "0");

  if (p.type === "ring") {
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.shadowColor = p.color;
    ctx.shadowBlur = 10;
    ctx.strokeStyle = p.color + hexAlpha;
    ctx.lineWidth = Math.max(0.5, 4 - p.life * 0.15);
    ctx.stroke();
    ctx.shadowBlur = 0;
  } else if (p.type === "ember") {
    // Glowing ember with halo
    const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 4);
    grad.addColorStop(0, "#FFFFFF" + hexAlpha);
    grad.addColorStop(0.3, p.color + hexAlpha);
    grad.addColorStop(1, p.color + "00");
    ctx.fillStyle = grad;
    ctx.fillRect(p.x - p.size * 4, p.y - p.size * 4, p.size * 8, p.size * 8);
  } else if (p.type === "trail") {
    const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 3);
    grad.addColorStop(0, p.color + hexAlpha);
    grad.addColorStop(1, p.color + "00");
    ctx.fillStyle = grad;
    ctx.fillRect(p.x - p.size * 3, p.y - p.size * 3, p.size * 6, p.size * 6);
  } else {
    // Spark — diamond shape with fire glow
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rotation ?? 0);
    const s = p.size;
    // Glow
    ctx.shadowColor = p.color;
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.moveTo(0, -s);
    ctx.lineTo(s * 0.5, 0);
    ctx.lineTo(0, s);
    ctx.lineTo(-s * 0.5, 0);
    ctx.closePath();
    ctx.fillStyle = p.color + hexAlpha;
    ctx.fill();
    ctx.shadowBlur = 0;
    // Hot core
    ctx.fillStyle = "#FFFFFF" + Math.floor(Math.min(p.alpha, 1) * 160).toString(16).padStart(2, "0");
    ctx.beginPath();
    ctx.arc(0, 0, s * 0.25, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

export interface AmbientParticle {
  x: number; y: number;
  size: number; speed: number;
  alpha: number; phase: number;
}

export function createAmbientParticles(width: number, height: number, count: number): AmbientParticle[] {
  return Array.from({ length: count }, () => ({
    x: Math.random() * width,
    y: Math.random() * height,
    size: 0.5 + Math.random() * 2.5,
    speed: 0.08 + Math.random() * 0.4,
    alpha: 0.06 + Math.random() * 0.2,
    phase: Math.random() * Math.PI * 2,
  }));
}

/** Draw ambient ember particle — fire themed */
export function drawAmbientParticle(ctx: CanvasRenderingContext2D, p: AmbientParticle, time: number) {
  const flicker = 0.6 + Math.sin(time * 0.04 + p.phase * 3) * 0.4;
  const glowSize = p.size * 5;
  const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, glowSize);
  grad.addColorStop(0, `rgba(255, 120, 20, ${p.alpha * flicker})`);
  grad.addColorStop(0.3, `rgba(255, 80, 0, ${p.alpha * flicker * 0.5})`);
  grad.addColorStop(1, "rgba(255, 60, 0, 0)");
  ctx.fillStyle = grad;
  ctx.fillRect(p.x - glowSize, p.y - glowSize, glowSize * 2, glowSize * 2);
  // Bright core
  ctx.beginPath();
  ctx.arc(p.x, p.y, p.size * 0.4, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(255, 200, 80, ${p.alpha * flicker * 1.3})`;
  ctx.fill();
}

export function updateAmbientParticles(
  particles: AmbientParticle[], time: number, height: number
): AmbientParticle[] {
  return particles.map((p) => ({
    ...p,
    x: p.x + Math.sin(time * 0.01 + p.phase) * 0.3,
    y: (p.y - p.speed + height) % height,
    alpha: 0.08 + Math.sin(time * 0.025 + p.phase) * 0.12,
  }));
}

export interface ShakeState {
  active: boolean; intensity: number;
  duration: number; elapsed: number;
}

export function getShakeOffset(shake: ShakeState): { x: number; y: number } {
  if (!shake.active || shake.elapsed >= shake.duration) return { x: 0, y: 0 };
  const progress = shake.elapsed / shake.duration;
  const decay = Math.pow(1 - progress, 2);
  const osc = Math.sin(progress * Math.PI * 8);
  const intensity = shake.intensity * decay;
  return {
    x: osc * intensity * (Math.random() > 0.5 ? 1 : -1) * 0.8,
    y: (Math.random() - 0.5) * 2 * intensity,
  };
}

/** Dragon fire anticipation on last reel */
export function drawAnticipationEffect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number,
  time: number
) {
  ctx.save();
  const cx = x + w / 2, cy = y + h / 2;
  const pulse = 0.5 + Math.sin(time * 0.2) * 0.5;

  // Fiery radial glow
  const outerGlow = ctx.createRadialGradient(cx, cy, 0, cx, cy, h * 0.8);
  outerGlow.addColorStop(0, `rgba(255, 80, 0, ${0.18 + pulse * 0.15})`);
  outerGlow.addColorStop(0.5, `rgba(255, 40, 0, ${0.08 + pulse * 0.06})`);
  outerGlow.addColorStop(1, "rgba(255, 0, 0, 0)");
  ctx.fillStyle = outerGlow;
  ctx.fillRect(x - 25, y - 25, w + 50, h + 50);

  // Lava fill
  const glowAlpha = 0.15 + Math.sin(time * 0.22) * 0.1;
  const grad = ctx.createLinearGradient(x, y, x, y + h);
  grad.addColorStop(0, `rgba(255, 60, 0, ${glowAlpha * 0.3})`);
  grad.addColorStop(0.5, `rgba(255, 100, 0, ${glowAlpha})`);
  grad.addColorStop(1, `rgba(255, 60, 0, ${glowAlpha * 0.3})`);
  ctx.fillStyle = grad;
  roundRectPath(ctx, x, y, w, h, 8);
  ctx.fill();

  // Scanning fire lines
  for (const speed of [3.5, -5]) {
    const scanY = y + (((time * speed) % h) + h) % h;
    const scanGrad = ctx.createLinearGradient(x, scanY - 18, x, scanY + 18);
    scanGrad.addColorStop(0, "rgba(255,100,0,0)");
    scanGrad.addColorStop(0.5, `rgba(255,150,0,${0.2 + pulse * 0.12})`);
    scanGrad.addColorStop(1, "rgba(255,100,0,0)");
    ctx.save();
    ctx.beginPath();
    roundRectPath(ctx, x, y, w, h, 8);
    ctx.clip();
    ctx.fillStyle = scanGrad;
    ctx.fillRect(x, scanY - 18, w, 36);
    ctx.restore();
  }

  // Fiery border
  const borderAlpha = 0.4 + Math.sin(time * 0.28) * 0.3;
  ctx.shadowColor = "#FF4400";
  ctx.shadowBlur = 20 + pulse * 12;
  ctx.strokeStyle = `rgba(255, 100, 0, ${borderAlpha})`;
  ctx.lineWidth = 3;
  roundRectPath(ctx, x, y, w, h, 8);
  ctx.stroke();
  ctx.shadowBlur = 8;
  ctx.strokeStyle = `rgba(255, 200, 0, ${borderAlpha * 0.4})`;
  ctx.lineWidth = 1;
  roundRectPath(ctx, x - 2, y - 2, w + 4, h + 4, 10);
  ctx.stroke();
  ctx.shadowBlur = 0;

  ctx.restore();
}

/** Win highlight with fire bloom */
export function drawWinHighlight(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number,
  color: string, flashProgress: number
) {
  ctx.save();
  const pulse = Math.sin(flashProgress * Math.PI * 5) * 0.5 + 0.5;
  const alpha = pulse * 0.45;
  const hexAlpha = Math.floor(Math.min(alpha, 1) * 255).toString(16).padStart(2, "0");

  // Fire bloom
  ctx.shadowColor = color;
  ctx.shadowBlur = 25 + pulse * 20;
  const grad = ctx.createRadialGradient(x + w / 2, y + h / 2, 0, x + w / 2, y + h / 2, w * 0.85);
  grad.addColorStop(0, color + hexAlpha);
  grad.addColorStop(0.5, "#FF440030");
  grad.addColorStop(1, color + "00");
  ctx.fillStyle = grad;
  ctx.fillRect(x - 12, y - 12, w + 24, h + 24);

  // Inner fill
  ctx.fillStyle = color + Math.floor(Math.min(alpha * 0.5, 1) * 255).toString(16).padStart(2, "0");
  roundRectPath(ctx, x + 2, y + 2, w - 4, h - 4, 4);
  ctx.fill();

  // Gold border
  ctx.strokeStyle = "#FFD700" + Math.floor(Math.min(0.4 + pulse * 0.4, 1) * 255).toString(16).padStart(2, "0");
  ctx.lineWidth = 2.5;
  roundRectPath(ctx, x + 2, y + 2, w - 4, h - 4, 4);
  ctx.stroke();
  // White inner
  ctx.strokeStyle = "#FFFFFF" + Math.floor(Math.min(pulse * 0.3, 1) * 255).toString(16).padStart(2, "0");
  ctx.lineWidth = 1;
  roundRectPath(ctx, x + 4, y + 4, w - 8, h - 8, 3);
  ctx.stroke();

  ctx.shadowBlur = 0;
  ctx.restore();
}

function roundRectPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
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
