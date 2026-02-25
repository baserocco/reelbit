/**
 * AnimationManager — Handles all animation state: reel spinning, easing, particles, screen shake.
 */

// Easing: easeOutExpo
export function easeOutExpo(t: number): number {
  return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
}

// Easing: easeInOutQuad
export function easeInOutQuad(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  alpha: number;
}

export function createWinParticles(cx: number, cy: number, count: number, color: string): Particle[] {
  const particles: Particle[] = [];
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5;
    const speed = 2 + Math.random() * 4;
    particles.push({
      x: cx,
      y: cy,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 0,
      maxLife: 40 + Math.random() * 30,
      size: 2 + Math.random() * 4,
      color,
      alpha: 1,
    });
  }
  return particles;
}

export function updateParticles(particles: Particle[]): Particle[] {
  return particles
    .map((p) => ({
      ...p,
      x: p.x + p.vx,
      y: p.y + p.vy,
      vy: p.vy + 0.08, // gravity
      life: p.life + 1,
      alpha: Math.max(0, 1 - p.life / p.maxLife),
    }))
    .filter((p) => p.life < p.maxLife);
}

export interface AmbientParticle {
  x: number;
  y: number;
  size: number;
  speed: number;
  alpha: number;
  phase: number;
}

export function createAmbientParticles(width: number, height: number, count: number): AmbientParticle[] {
  return Array.from({ length: count }, () => ({
    x: Math.random() * width,
    y: Math.random() * height,
    size: 0.5 + Math.random() * 2,
    speed: 0.1 + Math.random() * 0.3,
    alpha: 0.1 + Math.random() * 0.3,
    phase: Math.random() * Math.PI * 2,
  }));
}

export function updateAmbientParticles(
  particles: AmbientParticle[],
  time: number,
  height: number
): AmbientParticle[] {
  return particles.map((p) => ({
    ...p,
    y: (p.y - p.speed + height) % height,
    alpha: 0.1 + Math.sin(time * 0.02 + p.phase) * 0.15,
  }));
}

/** Screen shake state */
export interface ShakeState {
  active: boolean;
  intensity: number;
  duration: number;
  elapsed: number;
}

export function getShakeOffset(shake: ShakeState): { x: number; y: number } {
  if (!shake.active || shake.elapsed >= shake.duration) return { x: 0, y: 0 };
  const progress = shake.elapsed / shake.duration;
  const decay = 1 - progress;
  const intensity = shake.intensity * decay;
  return {
    x: (Math.random() - 0.5) * 2 * intensity,
    y: (Math.random() - 0.5) * 2 * intensity,
  };
}
