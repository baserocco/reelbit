/**
 * SymbolRenderer — Dragon's Inferno.
 * All symbols are layered Canvas-drawn graphical objects with:
 * - Drop shadows for depth
 * - Gradient fills with metallic/molten textures
 * - Glossy highlight overlays
 * - Outer glow effects
 * - Inner shadow illusion using gradients
 * - 3D shading via directional lighting
 * NO emoji. NO Unicode characters. NO text-based symbols.
 */

import type { SymbolDef } from "./SlotEngine";

const symbolCache = new Map<string, HTMLCanvasElement>();

/** Shared helper: draw a soft drop shadow beneath any shape */
function applyDropShadow(ctx: CanvasRenderingContext2D, color: string, blur: number) {
  ctx.shadowColor = color;
  ctx.shadowBlur = blur;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = blur * 0.3;
}

function clearShadow(ctx: CanvasRenderingContext2D) {
  ctx.shadowColor = "transparent";
  ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;
}

/** Shared helper: draw glossy highlight overlay */
function drawGlossOverlay(ctx: CanvasRenderingContext2D, r: number, yOff = -0.2) {
  ctx.save();
  ctx.globalCompositeOperation = "screen";
  const glossGrad = ctx.createLinearGradient(0, -r, 0, r * 0.3);
  glossGrad.addColorStop(0, "rgba(255,255,255,0.25)");
  glossGrad.addColorStop(0.4, "rgba(255,255,255,0.08)");
  glossGrad.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = glossGrad;
  ctx.beginPath();
  ctx.ellipse(0, r * yOff, r * 0.65, r * 0.45, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** Shared helper: outer glow ring */
function drawOuterGlow(ctx: CanvasRenderingContext2D, r: number, color: string, intensity = 0.3) {
  const glow = ctx.createRadialGradient(0, 0, r * 0.6, 0, 0, r * 1.4);
  glow.addColorStop(0, color + Math.floor(intensity * 255).toString(16).padStart(2, "0"));
  glow.addColorStop(1, "transparent");
  ctx.fillStyle = glow;
  ctx.fillRect(-r * 1.5, -r * 1.5, r * 3, r * 3);
}

function drawSymbolToCanvas(sym: SymbolDef, size: number): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const cx = size / 2;
  const cy = size / 2;
  const r = size * 0.38;

  ctx.save();
  ctx.translate(cx, cy);

  // High-value symbols get outer glow
  const highValue = ["dragon", "sword", "treasure", "fire_orb", "red_gem", "gold_coin", "scatter"].includes(sym.id);
  if (highValue) {
    drawOuterGlow(ctx, r, sym.color, 0.25);
  }

  switch (sym.id) {
    case "dragon": drawDragon(ctx, r); break;
    case "sword": drawSword(ctx, r); break;
    case "treasure": drawTreasure(ctx, r); break;
    case "fire_orb": drawFireOrb(ctx, r); break;
    case "red_gem": drawRedGem(ctx, r); break;
    case "gold_coin": drawGoldCoin(ctx, r); break;
    case "ace": drawMoltenLetter(ctx, r, "A", "#F0D060"); break;
    case "king": drawMoltenLetter(ctx, r, "K", "#E0B840"); break;
    case "queen": drawMoltenLetter(ctx, r, "Q", "#D0A030"); break;
    case "jack": drawMoltenLetter(ctx, r, "J", "#C09028"); break;
    case "ten": drawMoltenLetter(ctx, r, "10", "#B08020"); break;
    case "scatter": drawScatter(ctx, r); break;
  }

  ctx.restore();
  return canvas;
}

// ═══════════════════════════════════════════════════
// DRAGON HEAD — stylized flame silhouette, glowing eyes
// ═══════════════════════════════════════════════════
function drawDragon(ctx: CanvasRenderingContext2D, r: number) {
  // Drop shadow
  applyDropShadow(ctx, "rgba(255,50,0,0.5)", r * 0.25);

  // Head shape — flame-styled silhouette
  const headGrad = ctx.createRadialGradient(0, -r * 0.1, r * 0.15, 0, 0, r);
  headGrad.addColorStop(0, "#FF6600");
  headGrad.addColorStop(0.35, "#CC1100");
  headGrad.addColorStop(0.7, "#880000");
  headGrad.addColorStop(1, "#440000");

  ctx.beginPath();
  ctx.moveTo(0, -r * 0.9);
  ctx.bezierCurveTo(r * 0.3, -r * 0.95, r * 0.65, -r * 0.6, r * 0.75, -r * 0.2);
  ctx.bezierCurveTo(r * 0.85, r * 0.15, r * 0.6, r * 0.5, r * 0.45, r * 0.65);
  ctx.bezierCurveTo(r * 0.3, r * 0.8, r * 0.1, r * 0.85, 0, r * 0.75);
  ctx.bezierCurveTo(-r * 0.1, r * 0.85, -r * 0.3, r * 0.8, -r * 0.45, r * 0.65);
  ctx.bezierCurveTo(-r * 0.6, r * 0.5, -r * 0.85, r * 0.15, -r * 0.75, -r * 0.2);
  ctx.bezierCurveTo(-r * 0.65, -r * 0.6, -r * 0.3, -r * 0.95, 0, -r * 0.9);
  ctx.closePath();
  ctx.fillStyle = headGrad;
  ctx.fill();
  clearShadow(ctx);

  // Metallic edge stroke
  ctx.strokeStyle = "#FF8800";
  ctx.lineWidth = r * 0.035;
  ctx.stroke();

  // Horns — golden with 3D shading
  for (const side of [-1, 1]) {
    const hornGrad = ctx.createLinearGradient(side * r * 0.35, -r * 0.5, side * r * 0.6, -r);
    hornGrad.addColorStop(0, "#DAA520");
    hornGrad.addColorStop(0.5, "#FFE480");
    hornGrad.addColorStop(1, "#B8860B");
    ctx.beginPath();
    ctx.moveTo(side * r * 0.35, -r * 0.5);
    ctx.quadraticCurveTo(side * r * 0.75, -r * 1.15, side * r * 0.45, -r);
    ctx.quadraticCurveTo(side * r * 0.55, -r * 0.7, side * r * 0.35, -r * 0.5);
    ctx.fillStyle = hornGrad;
    ctx.fill();
    ctx.strokeStyle = "#FFD700";
    ctx.lineWidth = r * 0.02;
    ctx.stroke();
  }

  // Scales — inner shadow texture
  ctx.save();
  ctx.globalAlpha = 0.12;
  for (let row = 0; row < 4; row++) {
    for (let col = -2; col <= 2; col++) {
      const sx = col * r * 0.22 + (row % 2) * r * 0.11;
      const sy = -r * 0.2 + row * r * 0.2;
      ctx.beginPath();
      ctx.arc(sx, sy, r * 0.09, 0, Math.PI * 2);
      const scaleGrad = ctx.createRadialGradient(sx, sy - r * 0.02, 0, sx, sy, r * 0.09);
      scaleGrad.addColorStop(0, "#FF8800");
      scaleGrad.addColorStop(1, "transparent");
      ctx.fillStyle = scaleGrad;
      ctx.fill();
    }
  }
  ctx.restore();

  // Snout ridge
  ctx.beginPath();
  ctx.moveTo(-r * 0.2, r * 0.15);
  ctx.quadraticCurveTo(0, r * 0.05, r * 0.2, r * 0.15);
  ctx.strokeStyle = "rgba(255,100,0,0.3)";
  ctx.lineWidth = r * 0.025;
  ctx.stroke();

  // Nostrils — dark with inner glow
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(side * r * 0.12, r * 0.25, r * 0.05, r * 0.035, side * 0.2, 0, Math.PI * 2);
    ctx.fillStyle = "#110000";
    ctx.fill();
    const nostrilGlow = ctx.createRadialGradient(side * r * 0.12, r * 0.25, 0, side * r * 0.12, r * 0.25, r * 0.06);
    nostrilGlow.addColorStop(0, "rgba(255,100,0,0.4)");
    nostrilGlow.addColorStop(1, "rgba(255,50,0,0)");
    ctx.fillStyle = nostrilGlow;
    ctx.fillRect(side * r * 0.12 - r * 0.06, r * 0.25 - r * 0.06, r * 0.12, r * 0.12);
  }

  // Mouth — jagged teeth line
  ctx.beginPath();
  ctx.moveTo(-r * 0.35, r * 0.45);
  for (let i = 0; i < 7; i++) {
    const tx = -r * 0.35 + i * r * 0.1 + r * 0.02;
    const ty = r * 0.45 + (i % 2 === 0 ? -r * 0.04 : r * 0.02);
    ctx.lineTo(tx, ty);
  }
  ctx.strokeStyle = "#330000";
  ctx.lineWidth = r * 0.02;
  ctx.stroke();

  // EYES — intense glowing with slit pupils
  for (const side of [-1, 1]) {
    const ex = side * r * 0.28;
    const ey = -r * 0.12;

    // Eye glow halo
    const eyeHalo = ctx.createRadialGradient(ex, ey, 0, ex, ey, r * 0.25);
    eyeHalo.addColorStop(0, "rgba(255,255,0,0.35)");
    eyeHalo.addColorStop(0.5, "rgba(255,150,0,0.15)");
    eyeHalo.addColorStop(1, "rgba(255,100,0,0)");
    ctx.fillStyle = eyeHalo;
    ctx.fillRect(ex - r * 0.25, ey - r * 0.25, r * 0.5, r * 0.5);

    // Eye shape
    ctx.beginPath();
    ctx.ellipse(ex, ey, r * 0.13, r * 0.085, side * 0.15, 0, Math.PI * 2);
    const eyeGrad = ctx.createRadialGradient(ex, ey, 0, ex, ey, r * 0.12);
    eyeGrad.addColorStop(0, "#FFFF44");
    eyeGrad.addColorStop(0.6, "#FFCC00");
    eyeGrad.addColorStop(1, "#FF8800");
    ctx.fillStyle = eyeGrad;
    ctx.fill();
    ctx.strokeStyle = "#CC6600";
    ctx.lineWidth = r * 0.015;
    ctx.stroke();

    // Slit pupil
    ctx.beginPath();
    ctx.ellipse(ex, ey, r * 0.03, r * 0.08, 0, 0, Math.PI * 2);
    ctx.fillStyle = "#110000";
    ctx.fill();

    // Eye specular
    ctx.beginPath();
    ctx.arc(ex - side * r * 0.04, ey - r * 0.025, r * 0.025, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.fill();
  }

  // Top glossy highlight
  drawGlossOverlay(ctx, r, -0.35);
}

// ═══════════════════════════════════════════════════
// FLAMING SWORD
// ═══════════════════════════════════════════════════
function drawSword(ctx: CanvasRenderingContext2D, r: number) {
  applyDropShadow(ctx, "rgba(255,150,0,0.4)", r * 0.2);

  // Blade with metallic gradient
  const bladeGrad = ctx.createLinearGradient(-r * 0.1, -r * 0.9, r * 0.1, r * 0.15);
  bladeGrad.addColorStop(0, "#F0F0F0");
  bladeGrad.addColorStop(0.15, "#FFFFFF");
  bladeGrad.addColorStop(0.3, "#D0D0D0");
  bladeGrad.addColorStop(0.5, "#E8E8E8");
  bladeGrad.addColorStop(0.8, "#B0B0B0");
  bladeGrad.addColorStop(1, "#808080");
  ctx.beginPath();
  ctx.moveTo(0, -r * 0.92);
  ctx.lineTo(r * 0.14, -r * 0.65);
  ctx.lineTo(r * 0.11, r * 0.12);
  ctx.lineTo(-r * 0.11, r * 0.12);
  ctx.lineTo(-r * 0.14, -r * 0.65);
  ctx.closePath();
  ctx.fillStyle = bladeGrad;
  ctx.fill();
  clearShadow(ctx);
  ctx.strokeStyle = "#FFD700";
  ctx.lineWidth = r * 0.015;
  ctx.stroke();

  // Blade center fuller
  ctx.beginPath();
  ctx.moveTo(0, -r * 0.88);
  ctx.lineTo(0, r * 0.1);
  ctx.strokeStyle = "rgba(255,255,255,0.5)";
  ctx.lineWidth = r * 0.025;
  ctx.stroke();
  // Dark fuller line
  ctx.beginPath();
  ctx.moveTo(r * 0.01, -r * 0.85);
  ctx.lineTo(r * 0.01, r * 0.08);
  ctx.strokeStyle = "rgba(0,0,0,0.1)";
  ctx.lineWidth = r * 0.015;
  ctx.stroke();

  // Flame trail on blade
  ctx.save();
  ctx.globalCompositeOperation = "screen";
  for (let i = 0; i < 7; i++) {
    const fy = -r * 0.85 + i * r * 0.16;
    const fSize = r * (0.12 + Math.sin(i * 1.2) * 0.04);
    const fGrad = ctx.createRadialGradient(0, fy, 0, 0, fy, fSize);
    fGrad.addColorStop(0, "rgba(255,200,50,0.35)");
    fGrad.addColorStop(0.5, "rgba(255,100,0,0.2)");
    fGrad.addColorStop(1, "rgba(255,50,0,0)");
    ctx.fillStyle = fGrad;
    ctx.fillRect(-fSize, fy - fSize, fSize * 2, fSize * 2);
  }
  ctx.restore();

  // Crossguard — ornate gold
  const guardGrad = ctx.createLinearGradient(-r * 0.45, r * 0.12, r * 0.45, r * 0.12);
  guardGrad.addColorStop(0, "#8B6914");
  guardGrad.addColorStop(0.2, "#FFD700");
  guardGrad.addColorStop(0.5, "#FFF0A0");
  guardGrad.addColorStop(0.8, "#FFD700");
  guardGrad.addColorStop(1, "#8B6914");
  ctx.beginPath();
  ctx.moveTo(-r * 0.45, r * 0.08);
  ctx.quadraticCurveTo(-r * 0.5, r * 0.15, -r * 0.4, r * 0.22);
  ctx.lineTo(r * 0.4, r * 0.22);
  ctx.quadraticCurveTo(r * 0.5, r * 0.15, r * 0.45, r * 0.08);
  ctx.closePath();
  ctx.fillStyle = guardGrad;
  ctx.fill();
  ctx.strokeStyle = "#B8860B";
  ctx.lineWidth = r * 0.015;
  ctx.stroke();

  // Guard gem
  applyDropShadow(ctx, "#FF0044", 4);
  ctx.beginPath();
  ctx.arc(0, r * 0.15, r * 0.055, 0, Math.PI * 2);
  const gemGrad = ctx.createRadialGradient(-r * 0.02, r * 0.13, 0, 0, r * 0.15, r * 0.055);
  gemGrad.addColorStop(0, "#FF6688");
  gemGrad.addColorStop(0.5, "#FF0044");
  gemGrad.addColorStop(1, "#880022");
  ctx.fillStyle = gemGrad;
  ctx.fill();
  clearShadow(ctx);

  // Handle with leather wrapping
  const handleGrad = ctx.createLinearGradient(-r * 0.06, r * 0.22, r * 0.06, r * 0.22);
  handleGrad.addColorStop(0, "#3A2010");
  handleGrad.addColorStop(0.5, "#6B4520");
  handleGrad.addColorStop(1, "#3A2010");
  ctx.fillStyle = handleGrad;
  roundRectLocal(ctx, -r * 0.06, r * 0.22, r * 0.12, r * 0.42, r * 0.02);
  ctx.fill();

  for (let i = 0; i < 5; i++) {
    const wy = r * (0.26 + i * 0.08);
    ctx.beginPath();
    ctx.moveTo(-r * 0.06, wy);
    ctx.lineTo(r * 0.06, wy - r * 0.03);
    ctx.strokeStyle = "#DAA520";
    ctx.lineWidth = r * 0.018;
    ctx.stroke();
  }

  // Pommel
  const pomGrad = ctx.createRadialGradient(-r * 0.02, r * 0.67, 0, 0, r * 0.69, r * 0.09);
  pomGrad.addColorStop(0, "#FFF0A0");
  pomGrad.addColorStop(0.5, "#FFD700");
  pomGrad.addColorStop(1, "#B8860B");
  ctx.beginPath();
  ctx.arc(0, r * 0.69, r * 0.08, 0, Math.PI * 2);
  ctx.fillStyle = pomGrad;
  ctx.fill();

  drawGlossOverlay(ctx, r * 0.7, -0.6);
}

// ═══════════════════════════════════════════════════
// TREASURE CHEST
// ═══════════════════════════════════════════════════
function drawTreasure(ctx: CanvasRenderingContext2D, r: number) {
  applyDropShadow(ctx, "rgba(180,130,20,0.4)", r * 0.2);

  // Chest body with wood grain gradient
  const bodyGrad = ctx.createLinearGradient(0, -r * 0.1, 0, r * 0.65);
  bodyGrad.addColorStop(0, "#9B7418");
  bodyGrad.addColorStop(0.3, "#7B5A14");
  bodyGrad.addColorStop(0.6, "#6B4F12");
  bodyGrad.addColorStop(1, "#4A3510");
  ctx.beginPath();
  roundRectLocal(ctx, -r * 0.65, -r * 0.08, r * 1.3, r * 0.7, r * 0.06);
  ctx.fillStyle = bodyGrad;
  ctx.fill();
  clearShadow(ctx);
  ctx.strokeStyle = "#DAA520";
  ctx.lineWidth = r * 0.03;
  ctx.stroke();

  // Metal bands
  for (const y of [-r * 0.05, r * 0.25, r * 0.55]) {
    ctx.beginPath();
    ctx.moveTo(-r * 0.65, y);
    ctx.lineTo(r * 0.65, y);
    ctx.strokeStyle = "rgba(218,165,32,0.3)";
    ctx.lineWidth = r * 0.025;
    ctx.stroke();
  }

  // Lid — curved with metallic highlight
  ctx.beginPath();
  ctx.moveTo(-r * 0.65, -r * 0.08);
  ctx.quadraticCurveTo(0, -r * 0.6, r * 0.65, -r * 0.08);
  ctx.lineTo(-r * 0.65, -r * 0.08);
  ctx.closePath();
  const lidGrad = ctx.createLinearGradient(0, -r * 0.6, 0, -r * 0.08);
  lidGrad.addColorStop(0, "#B8891C");
  lidGrad.addColorStop(0.4, "#A0781C");
  lidGrad.addColorStop(1, "#8B6914");
  ctx.fillStyle = lidGrad;
  ctx.fill();
  ctx.strokeStyle = "#DAA520";
  ctx.lineWidth = r * 0.025;
  ctx.stroke();

  // Lid highlight
  ctx.beginPath();
  ctx.moveTo(-r * 0.5, -r * 0.12);
  ctx.quadraticCurveTo(0, -r * 0.45, r * 0.5, -r * 0.12);
  ctx.strokeStyle = "rgba(255,240,160,0.3)";
  ctx.lineWidth = r * 0.02;
  ctx.stroke();

  // Gold coins spilling — 3D with highlight
  const coins = [
    [-r * 0.28, -r * 0.28, r * 0.1], [0, -r * 0.38, r * 0.11],
    [r * 0.22, -r * 0.24, r * 0.09], [-r * 0.12, -r * 0.48, r * 0.08],
    [r * 0.1, -r * 0.42, r * 0.085],
  ];
  for (const [cx, cy, cr] of coins) {
    const coinGrad = ctx.createRadialGradient(cx - cr * 0.3, cy - cr * 0.3, 0, cx, cy, cr);
    coinGrad.addColorStop(0, "#FFF8DC");
    coinGrad.addColorStop(0.4, "#FFD700");
    coinGrad.addColorStop(1, "#B8860B");
    ctx.beginPath();
    ctx.ellipse(cx, cy, cr, cr * 0.75, 0, 0, Math.PI * 2);
    ctx.fillStyle = coinGrad;
    ctx.fill();
    ctx.strokeStyle = "#DAA520";
    ctx.lineWidth = r * 0.012;
    ctx.stroke();
    // Coin specular
    ctx.beginPath();
    ctx.arc(cx - cr * 0.25, cy - cr * 0.2, cr * 0.2, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255,255,255,0.25)";
    ctx.fill();
  }

  // Golden glow emanating from chest opening
  const chestGlow = ctx.createRadialGradient(0, -r * 0.3, 0, 0, -r * 0.3, r * 0.55);
  chestGlow.addColorStop(0, "rgba(255,215,0,0.3)");
  chestGlow.addColorStop(0.5, "rgba(255,180,0,0.1)");
  chestGlow.addColorStop(1, "rgba(255,150,0,0)");
  ctx.fillStyle = chestGlow;
  ctx.fillRect(-r, -r * 0.85, r * 2, r * 0.8);

  // Lock — ornate
  const lockGrad = ctx.createRadialGradient(-r * 0.02, r * 0.12, 0, 0, r * 0.15, r * 0.09);
  lockGrad.addColorStop(0, "#FFF0A0");
  lockGrad.addColorStop(0.5, "#FFD700");
  lockGrad.addColorStop(1, "#8B6914");
  ctx.beginPath();
  ctx.arc(0, r * 0.15, r * 0.07, 0, Math.PI * 2);
  ctx.fillStyle = lockGrad;
  ctx.fill();
  ctx.strokeStyle = "#B8860B";
  ctx.lineWidth = r * 0.015;
  ctx.stroke();
  // Keyhole
  ctx.beginPath();
  ctx.arc(0, r * 0.14, r * 0.02, 0, Math.PI * 2);
  ctx.fillStyle = "#330000";
  ctx.fill();
  ctx.fillRect(-r * 0.008, r * 0.14, r * 0.016, r * 0.04);

  drawGlossOverlay(ctx, r * 0.6, -0.15);
}

// ═══════════════════════════════════════════════════
// FIRE ORB
// ═══════════════════════════════════════════════════
function drawFireOrb(ctx: CanvasRenderingContext2D, r: number) {
  // Outer glow rings
  for (let i = 3; i >= 0; i--) {
    const ringR = r * (0.9 + i * 0.12);
    const ringGrad = ctx.createRadialGradient(0, 0, ringR * 0.7, 0, 0, ringR);
    ringGrad.addColorStop(0, `rgba(255,100,0,${0.06 - i * 0.01})`);
    ringGrad.addColorStop(1, "rgba(255,50,0,0)");
    ctx.fillStyle = ringGrad;
    ctx.fillRect(-ringR, -ringR, ringR * 2, ringR * 2);
  }

  applyDropShadow(ctx, "rgba(255,60,0,0.5)", r * 0.3);

  // Main orb
  const orbGrad = ctx.createRadialGradient(-r * 0.15, -r * 0.2, 0, 0, 0, r * 0.72);
  orbGrad.addColorStop(0, "#FFEE99");
  orbGrad.addColorStop(0.2, "#FFBB44");
  orbGrad.addColorStop(0.5, "#FF6600");
  orbGrad.addColorStop(0.8, "#DD2200");
  orbGrad.addColorStop(1, "#880000");
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.7, 0, Math.PI * 2);
  ctx.fillStyle = orbGrad;
  ctx.fill();
  clearShadow(ctx);

  // Inner fire plasma
  ctx.save();
  ctx.globalCompositeOperation = "screen";
  for (let i = 0; i < 4; i++) {
    const angle = (i / 4) * Math.PI * 2 + 0.5;
    const sx = Math.cos(angle) * r * 0.2;
    const sy = Math.sin(angle) * r * 0.2;
    const sGrad = ctx.createRadialGradient(sx, sy, 0, sx, sy, r * 0.28);
    sGrad.addColorStop(0, "rgba(255,255,200,0.35)");
    sGrad.addColorStop(0.5, "rgba(255,180,50,0.15)");
    sGrad.addColorStop(1, "rgba(255,100,0,0)");
    ctx.fillStyle = sGrad;
    ctx.beginPath();
    ctx.arc(sx, sy, r * 0.28, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // Edge ring
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.72, 0, Math.PI * 2);
  ctx.strokeStyle = "rgba(255,150,0,0.4)";
  ctx.lineWidth = r * 0.035;
  ctx.stroke();

  // Specular highlight
  ctx.beginPath();
  ctx.ellipse(-r * 0.2, -r * 0.28, r * 0.18, r * 0.1, -0.3, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(255,255,255,0.4)";
  ctx.fill();
  ctx.beginPath();
  ctx.arc(-r * 0.12, -r * 0.22, r * 0.05, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(255,255,255,0.6)";
  ctx.fill();
}

// ═══════════════════════════════════════════════════
// RED GEM — faceted with sparkle
// ═══════════════════════════════════════════════════
function drawRedGem(ctx: CanvasRenderingContext2D, r: number) {
  applyDropShadow(ctx, "rgba(200,0,50,0.4)", r * 0.2);

  // Main gem body
  const gemGrad = ctx.createLinearGradient(-r * 0.6, -r * 0.8, r * 0.6, r * 0.8);
  gemGrad.addColorStop(0, "#FF3366");
  gemGrad.addColorStop(0.25, "#FF1744");
  gemGrad.addColorStop(0.5, "#CC0033");
  gemGrad.addColorStop(0.75, "#FF0033");
  gemGrad.addColorStop(1, "#880022");

  ctx.beginPath();
  ctx.moveTo(0, -r * 0.88);
  ctx.lineTo(r * 0.62, -r * 0.32);
  ctx.lineTo(r * 0.62, r * 0.32);
  ctx.lineTo(0, r * 0.88);
  ctx.lineTo(-r * 0.62, r * 0.32);
  ctx.lineTo(-r * 0.62, -r * 0.32);
  ctx.closePath();
  ctx.fillStyle = gemGrad;
  ctx.fill();
  clearShadow(ctx);
  ctx.strokeStyle = "#FF6680";
  ctx.lineWidth = r * 0.035;
  ctx.stroke();

  // Facet lines with varying opacity
  const facets = [
    [[0, -r * 0.88], [r * 0.3, 0]], [[0, -r * 0.88], [-r * 0.3, 0]],
    [[0, r * 0.88], [r * 0.3, 0]], [[0, r * 0.88], [-r * 0.3, 0]],
    [[-r * 0.62, -r * 0.32], [r * 0.3, 0]], [[r * 0.62, -r * 0.32], [-r * 0.3, 0]],
  ];
  for (const [[x1, y1], [x2, y2]] of facets) {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.strokeStyle = "rgba(255,255,255,0.15)";
    ctx.lineWidth = r * 0.015;
    ctx.stroke();
  }

  // Inner highlight facet
  ctx.beginPath();
  ctx.moveTo(0, -r * 0.88);
  ctx.lineTo(r * 0.3, 0);
  ctx.lineTo(0, r * 0.88);
  ctx.lineTo(-r * 0.3, 0);
  ctx.closePath();
  ctx.fillStyle = "rgba(255,100,150,0.15)";
  ctx.fill();

  // Sparkle highlights
  const sparkles = [[-r * 0.18, -r * 0.35, r * 0.07], [r * 0.2, -r * 0.1, r * 0.05], [-r * 0.1, r * 0.15, r * 0.04]];
  for (const [sx, sy, sr] of sparkles) {
    ctx.beginPath();
    ctx.arc(sx, sy, sr, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255,255,255,0.55)";
    ctx.fill();
  }

  // Star sparkle
  drawStarSparkle(ctx, -r * 0.15, -r * 0.35, r * 0.12);

  drawGlossOverlay(ctx, r * 0.6, -0.3);
}

// ═══════════════════════════════════════════════════
// GOLD COIN — engraved with dragon motif
// ═══════════════════════════════════════════════════
function drawGoldCoin(ctx: CanvasRenderingContext2D, r: number) {
  applyDropShadow(ctx, "rgba(180,130,20,0.4)", r * 0.18);

  // Outer edge — thick metallic ring
  const edgeGrad = ctx.createLinearGradient(-r, -r * 0.3, r, r * 0.3);
  edgeGrad.addColorStop(0, "#8B6914");
  edgeGrad.addColorStop(0.3, "#DAA520");
  edgeGrad.addColorStop(0.5, "#FFE080");
  edgeGrad.addColorStop(0.7, "#DAA520");
  edgeGrad.addColorStop(1, "#8B6914");
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.82, 0, Math.PI * 2);
  ctx.fillStyle = edgeGrad;
  ctx.fill();
  clearShadow(ctx);

  // Inner face
  const faceGrad = ctx.createRadialGradient(-r * 0.15, -r * 0.18, 0, 0, 0, r * 0.7);
  faceGrad.addColorStop(0, "#FFF8DC");
  faceGrad.addColorStop(0.3, "#FFE880");
  faceGrad.addColorStop(0.6, "#FFD700");
  faceGrad.addColorStop(1, "#B8860B");
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.68, 0, Math.PI * 2);
  ctx.fillStyle = faceGrad;
  ctx.fill();

  // Inner rim
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.6, 0, Math.PI * 2);
  ctx.strokeStyle = "rgba(139,105,20,0.3)";
  ctx.lineWidth = r * 0.015;
  ctx.stroke();

  // Dragon silhouette engraving
  ctx.save();
  ctx.globalAlpha = 0.2;
  ctx.beginPath();
  ctx.moveTo(0, -r * 0.4);
  ctx.bezierCurveTo(r * 0.35, -r * 0.35, r * 0.4, -r * 0.05, r * 0.2, r * 0.2);
  ctx.bezierCurveTo(r * 0.05, r * 0.35, -r * 0.1, r * 0.35, -r * 0.25, r * 0.15);
  ctx.bezierCurveTo(-r * 0.35, 0, -r * 0.35, -r * 0.3, 0, -r * 0.4);
  ctx.fillStyle = "#8B6914";
  ctx.fill();
  ctx.restore();

  // Notch details around edge
  for (let i = 0; i < 24; i++) {
    const angle = (i / 24) * Math.PI * 2;
    const nx = Math.cos(angle) * r * 0.76;
    const ny = Math.sin(angle) * r * 0.76;
    ctx.beginPath();
    ctx.arc(nx, ny, r * 0.012, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(139,105,20,0.2)";
    ctx.fill();
  }

  // Edge highlight arc
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.8, -Math.PI * 0.7, -Math.PI * 0.15);
  ctx.strokeStyle = "rgba(255,255,255,0.2)";
  ctx.lineWidth = r * 0.025;
  ctx.stroke();

  // Specular
  ctx.beginPath();
  ctx.ellipse(-r * 0.2, -r * 0.25, r * 0.15, r * 0.08, -0.3, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(255,255,255,0.25)";
  ctx.fill();
}

// ═══════════════════════════════════════════════════
// MOLTEN METAL LETTERS — A, K, Q, J, 10
// ═══════════════════════════════════════════════════
function drawMoltenLetter(ctx: CanvasRenderingContext2D, r: number, letter: string, baseColor: string) {
  // Background plate with inner shadow
  const plateGrad = ctx.createLinearGradient(-r * 0.5, -r * 0.5, r * 0.5, r * 0.5);
  plateGrad.addColorStop(0, "rgba(50,25,8,0.7)");
  plateGrad.addColorStop(0.5, "rgba(35,18,5,0.6)");
  plateGrad.addColorStop(1, "rgba(50,25,8,0.7)");
  roundRectLocal(ctx, -r * 0.52, -r * 0.52, r * 1.04, r * 1.04, r * 0.15);
  ctx.fillStyle = plateGrad;
  ctx.fill();
  // Plate inner shadow
  const innerShadow = ctx.createLinearGradient(0, -r * 0.5, 0, r * 0.5);
  innerShadow.addColorStop(0, "rgba(0,0,0,0.3)");
  innerShadow.addColorStop(0.2, "rgba(0,0,0,0)");
  innerShadow.addColorStop(0.8, "rgba(0,0,0,0)");
  innerShadow.addColorStop(1, "rgba(0,0,0,0.2)");
  ctx.fillStyle = innerShadow;
  ctx.fill();
  // Plate border
  ctx.strokeStyle = "rgba(218,165,32,0.15)";
  ctx.lineWidth = r * 0.015;
  ctx.stroke();

  const fontSize = letter.length > 1 ? r * 0.95 : r * 1.15;
  ctx.font = `900 ${fontSize}px 'Georgia', 'Times New Roman', serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  // Drop shadow
  ctx.fillStyle = "rgba(0,0,0,0.5)";
  ctx.fillText(letter, r * 0.03, r * 0.08);

  // Main letter — metallic gradient
  const letterGrad = ctx.createLinearGradient(0, -r * 0.45, 0, r * 0.45);
  letterGrad.addColorStop(0, "#FFF0C0");
  letterGrad.addColorStop(0.2, baseColor);
  letterGrad.addColorStop(0.5, lightenColor(baseColor, 30));
  letterGrad.addColorStop(0.8, baseColor);
  letterGrad.addColorStop(1, darkenColor(baseColor, 40));
  ctx.fillStyle = letterGrad;
  ctx.fillText(letter, 0, r * 0.05);

  // Outline — dark edge for emboss effect
  ctx.strokeStyle = darkenColor(baseColor, 50);
  ctx.lineWidth = r * 0.025;
  ctx.strokeText(letter, 0, r * 0.05);

  // Inner light stroke (emboss top)
  ctx.save();
  ctx.globalCompositeOperation = "screen";
  ctx.strokeStyle = "rgba(255,255,255,0.2)";
  ctx.lineWidth = r * 0.015;
  ctx.strokeText(letter, -r * 0.01, r * 0.03);
  ctx.restore();

  // Molten glow under letter
  applyDropShadow(ctx, baseColor, r * 0.15);
  ctx.globalAlpha = 0.15;
  ctx.fillStyle = baseColor;
  ctx.fillText(letter, 0, r * 0.05);
  ctx.globalAlpha = 1;
  clearShadow(ctx);
}

// ═══════════════════════════════════════════════════
// SCATTER — Dragon Egg
// ═══════════════════════════════════════════════════
function drawScatter(ctx: CanvasRenderingContext2D, r: number) {
  applyDropShadow(ctx, "rgba(255,0,40,0.5)", r * 0.25);

  // Egg body
  const eggGrad = ctx.createRadialGradient(-r * 0.1, -r * 0.15, 0, 0, r * 0.05, r * 0.8);
  eggGrad.addColorStop(0, "#FF6644");
  eggGrad.addColorStop(0.3, "#DD1122");
  eggGrad.addColorStop(0.7, "#990015");
  eggGrad.addColorStop(1, "#550010");
  ctx.beginPath();
  ctx.ellipse(0, r * 0.05, r * 0.58, r * 0.73, 0, 0, Math.PI * 2);
  ctx.fillStyle = eggGrad;
  ctx.fill();
  clearShadow(ctx);
  ctx.strokeStyle = "#FF4444";
  ctx.lineWidth = r * 0.04;
  ctx.stroke();

  // Scale pattern on egg
  ctx.save();
  ctx.globalAlpha = 0.08;
  for (let row = 0; row < 5; row++) {
    for (let col = -2; col <= 2; col++) {
      const sx = col * r * 0.2 + (row % 2) * r * 0.1;
      const sy = -r * 0.4 + row * r * 0.2;
      ctx.beginPath();
      ctx.arc(sx, sy, r * 0.06, 0, Math.PI * 2);
      ctx.fillStyle = "#FF8800";
      ctx.fill();
    }
  }
  ctx.restore();

  // Cracks — glowing molten
  ctx.save();
  applyDropShadow(ctx, "#FF6600", 6);
  ctx.strokeStyle = "#FFAA00";
  ctx.lineWidth = r * 0.03;
  ctx.beginPath();
  ctx.moveTo(-r * 0.08, -r * 0.42);
  ctx.lineTo(r * 0.05, -r * 0.15);
  ctx.lineTo(-r * 0.12, r * 0.12);
  ctx.lineTo(r * 0.08, r * 0.38);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(r * 0.05, -r * 0.15);
  ctx.lineTo(r * 0.22, -r * 0.02);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-r * 0.12, r * 0.12);
  ctx.lineTo(-r * 0.28, r * 0.2);
  ctx.stroke();
  clearShadow(ctx);
  ctx.restore();

  // Inner glow from cracks
  const crackGlow = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 0.45);
  crackGlow.addColorStop(0, "rgba(255,150,0,0.3)");
  crackGlow.addColorStop(0.5, "rgba(255,100,0,0.1)");
  crackGlow.addColorStop(1, "rgba(255,50,0,0)");
  ctx.fillStyle = crackGlow;
  ctx.fillRect(-r * 0.5, -r * 0.5, r, r);

  // Top specular
  ctx.beginPath();
  ctx.ellipse(-r * 0.12, -r * 0.38, r * 0.18, r * 0.08, -0.2, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(255,255,255,0.2)";
  ctx.fill();

  // SCATTER text — rendered as styled graphic, not emoji
  ctx.save();
  applyDropShadow(ctx, "#FF4400", 5);
  const textGrad = ctx.createLinearGradient(0, r * 0.55, 0, r * 0.75);
  textGrad.addColorStop(0, "#FFE880");
  textGrad.addColorStop(0.5, "#FFD700");
  textGrad.addColorStop(1, "#CC8800");
  ctx.fillStyle = textGrad;
  ctx.font = `900 ${r * 0.26}px 'Arial Black', Arial, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("SCATTER", 0, r * 0.65);
  ctx.strokeStyle = "#8B6914";
  ctx.lineWidth = r * 0.012;
  ctx.strokeText("SCATTER", 0, r * 0.65);
  clearShadow(ctx);
  ctx.restore();
}

// ═══════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════
function drawStarSparkle(ctx: CanvasRenderingContext2D, x: number, y: number, size: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = "rgba(255,255,255,0.7)";
  // Four-point star
  ctx.beginPath();
  ctx.moveTo(0, -size);
  ctx.lineTo(size * 0.15, -size * 0.15);
  ctx.lineTo(size, 0);
  ctx.lineTo(size * 0.15, size * 0.15);
  ctx.lineTo(0, size);
  ctx.lineTo(-size * 0.15, size * 0.15);
  ctx.lineTo(-size, 0);
  ctx.lineTo(-size * 0.15, -size * 0.15);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function lightenColor(hex: string, amount: number): string {
  const r = Math.min(255, parseInt(hex.slice(1, 3), 16) + amount);
  const g = Math.min(255, parseInt(hex.slice(3, 5), 16) + amount);
  const b = Math.min(255, parseInt(hex.slice(5, 7), 16) + amount);
  return `rgb(${r},${g},${b})`;
}

function darkenColor(hex: string, amount: number): string {
  const r = Math.max(0, parseInt(hex.slice(1, 3), 16) - amount);
  const g = Math.max(0, parseInt(hex.slice(3, 5), 16) - amount);
  const b = Math.max(0, parseInt(hex.slice(5, 7), 16) - amount);
  return `rgb(${r},${g},${b})`;
}

function roundRectLocal(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, rad: number) {
  ctx.beginPath();
  ctx.moveTo(x + rad, y);
  ctx.lineTo(x + w - rad, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + rad);
  ctx.lineTo(x + w, y + h - rad);
  ctx.quadraticCurveTo(x + w, y + h, x + w - rad, y + h);
  ctx.lineTo(x + rad, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - rad);
  ctx.lineTo(x, y + rad);
  ctx.quadraticCurveTo(x, y, x + rad, y);
  ctx.closePath();
}

export function getSymbolCanvas(sym: SymbolDef, size: number): HTMLCanvasElement {
  const key = `${sym.id}_${size}`;
  if (!symbolCache.has(key)) {
    symbolCache.set(key, drawSymbolToCanvas(sym, size));
  }
  return symbolCache.get(key)!;
}
