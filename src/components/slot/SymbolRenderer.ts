/**
 * SymbolRenderer — Dragon's Inferno themed symbols.
 * Glossy, embossed, high-value fantasy graphics.
 */

import type { SymbolDef } from "./SlotEngine";

const symbolCache = new Map<string, HTMLCanvasElement>();

function drawSymbolToCanvas(sym: SymbolDef, size: number): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const cx = size / 2;
  const cy = size / 2;
  const r = size * 0.38;

  // Background glow
  const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * 1.3);
  glow.addColorStop(0, sym.color + "35");
  glow.addColorStop(1, "transparent");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, size, size);

  ctx.save();
  ctx.translate(cx, cy);

  switch (sym.id) {
    case "dragon": drawDragon(ctx, r); break;
    case "sword": drawSword(ctx, r); break;
    case "treasure": drawTreasure(ctx, r); break;
    case "fire_orb": drawFireOrb(ctx, r); break;
    case "red_gem": drawRedGem(ctx, r); break;
    case "gold_coin": drawGoldCoin(ctx, r); break;
    case "ace": drawLetter(ctx, r, "A", "#F0D060"); break;
    case "king": drawLetter(ctx, r, "K", "#E0B840"); break;
    case "queen": drawLetter(ctx, r, "Q", "#D0A030"); break;
    case "jack": drawLetter(ctx, r, "J", "#C09028"); break;
    case "ten": drawLetter(ctx, r, "10", "#B08020"); break;
    case "scatter": drawScatter(ctx, r); break;
  }

  ctx.restore();
  return canvas;
}

function drawDragon(ctx: CanvasRenderingContext2D, r: number) {
  // Fierce dragon head
  const grad = ctx.createRadialGradient(0, 0, r * 0.1, 0, 0, r);
  grad.addColorStop(0, "#FF4400");
  grad.addColorStop(0.5, "#CC1100");
  grad.addColorStop(1, "#880000");

  // Head shape
  ctx.beginPath();
  ctx.moveTo(0, -r * 0.85);
  ctx.bezierCurveTo(r * 0.6, -r * 0.7, r * 0.8, -r * 0.2, r * 0.6, r * 0.3);
  ctx.bezierCurveTo(r * 0.4, r * 0.7, r * 0.1, r * 0.85, 0, r * 0.7);
  ctx.bezierCurveTo(-r * 0.1, r * 0.85, -r * 0.4, r * 0.7, -r * 0.6, r * 0.3);
  ctx.bezierCurveTo(-r * 0.8, -r * 0.2, -r * 0.6, -r * 0.7, 0, -r * 0.85);
  ctx.closePath();
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.strokeStyle = "#FF6600";
  ctx.lineWidth = r * 0.04;
  ctx.stroke();

  // Horns
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(side * r * 0.35, -r * 0.55);
    ctx.quadraticCurveTo(side * r * 0.7, -r * 1.1, side * r * 0.5, -r * 0.95);
    ctx.strokeStyle = "#FFD700";
    ctx.lineWidth = r * 0.06;
    ctx.stroke();
  }

  // Eyes — glowing
  for (const side of [-1, 1]) {
    const ex = side * r * 0.25;
    const ey = -r * 0.15;
    ctx.beginPath();
    ctx.ellipse(ex, ey, r * 0.12, r * 0.08, side * 0.2, 0, Math.PI * 2);
    ctx.fillStyle = "#FFFF00";
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(ex, ey, r * 0.05, r * 0.08, 0, 0, Math.PI * 2);
    ctx.fillStyle = "#000";
    ctx.fill();
    // Eye glow
    const eyeGlow = ctx.createRadialGradient(ex, ey, 0, ex, ey, r * 0.2);
    eyeGlow.addColorStop(0, "rgba(255,255,0,0.3)");
    eyeGlow.addColorStop(1, "rgba(255,255,0,0)");
    ctx.fillStyle = eyeGlow;
    ctx.fillRect(ex - r * 0.2, ey - r * 0.2, r * 0.4, r * 0.4);
  }

  // Snout / nostrils
  ctx.beginPath();
  ctx.arc(-r * 0.1, r * 0.2, r * 0.04, 0, Math.PI * 2);
  ctx.arc(r * 0.1, r * 0.2, r * 0.04, 0, Math.PI * 2);
  ctx.fillStyle = "#220000";
  ctx.fill();

  // Mouth line
  ctx.beginPath();
  ctx.moveTo(-r * 0.3, r * 0.4);
  ctx.quadraticCurveTo(0, r * 0.55, r * 0.3, r * 0.4);
  ctx.strokeStyle = "#440000";
  ctx.lineWidth = r * 0.03;
  ctx.stroke();

  // Scales texture — highlights
  ctx.globalAlpha = 0.15;
  for (let i = 0; i < 8; i++) {
    const sx = (Math.random() - 0.5) * r * 1.2;
    const sy = (Math.random() - 0.5) * r * 1.2;
    ctx.beginPath();
    ctx.arc(sx, sy, r * 0.08, 0, Math.PI * 2);
    ctx.fillStyle = "#FF8800";
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // Top highlight
  ctx.beginPath();
  ctx.ellipse(0, -r * 0.4, r * 0.3, r * 0.15, 0, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(255,200,100,0.15)";
  ctx.fill();
}

function drawSword(ctx: CanvasRenderingContext2D, r: number) {
  // Blade
  const bladeGrad = ctx.createLinearGradient(-r * 0.1, -r * 0.9, r * 0.1, r * 0.2);
  bladeGrad.addColorStop(0, "#E0E0E0");
  bladeGrad.addColorStop(0.3, "#FFFFFF");
  bladeGrad.addColorStop(0.5, "#C0C0C0");
  bladeGrad.addColorStop(1, "#909090");
  ctx.beginPath();
  ctx.moveTo(0, -r * 0.9);
  ctx.lineTo(r * 0.12, -r * 0.7);
  ctx.lineTo(r * 0.1, r * 0.15);
  ctx.lineTo(-r * 0.1, r * 0.15);
  ctx.lineTo(-r * 0.12, -r * 0.7);
  ctx.closePath();
  ctx.fillStyle = bladeGrad;
  ctx.fill();
  ctx.strokeStyle = "#FFD700";
  ctx.lineWidth = r * 0.02;
  ctx.stroke();

  // Blade center line
  ctx.beginPath();
  ctx.moveTo(0, -r * 0.85);
  ctx.lineTo(0, r * 0.12);
  ctx.strokeStyle = "rgba(255,255,255,0.4)";
  ctx.lineWidth = r * 0.02;
  ctx.stroke();

  // Crossguard
  const guardGrad = ctx.createLinearGradient(-r * 0.4, r * 0.15, r * 0.4, r * 0.15);
  guardGrad.addColorStop(0, "#B8860B");
  guardGrad.addColorStop(0.5, "#FFD700");
  guardGrad.addColorStop(1, "#B8860B");
  ctx.beginPath();
  ctx.moveTo(-r * 0.4, r * 0.1);
  ctx.lineTo(r * 0.4, r * 0.1);
  ctx.lineTo(r * 0.35, r * 0.22);
  ctx.lineTo(-r * 0.35, r * 0.22);
  ctx.closePath();
  ctx.fillStyle = guardGrad;
  ctx.fill();

  // Guard gem
  ctx.beginPath();
  ctx.arc(0, r * 0.16, r * 0.06, 0, Math.PI * 2);
  ctx.fillStyle = "#FF0044";
  ctx.fill();
  ctx.strokeStyle = "#FFD700";
  ctx.lineWidth = r * 0.02;
  ctx.stroke();

  // Handle
  ctx.fillStyle = "#5C3A1E";
  ctx.fillRect(-r * 0.06, r * 0.22, r * 0.12, r * 0.45);
  // Handle wrapping
  for (let i = 0; i < 4; i++) {
    ctx.beginPath();
    ctx.moveTo(-r * 0.06, r * (0.28 + i * 0.1));
    ctx.lineTo(r * 0.06, r * (0.24 + i * 0.1));
    ctx.strokeStyle = "#DAA520";
    ctx.lineWidth = r * 0.02;
    ctx.stroke();
  }

  // Pommel
  ctx.beginPath();
  ctx.arc(0, r * 0.72, r * 0.08, 0, Math.PI * 2);
  ctx.fillStyle = "#FFD700";
  ctx.fill();

  // Flame effect on blade
  ctx.globalAlpha = 0.3;
  for (let i = 0; i < 5; i++) {
    const fy = -r * 0.8 + i * r * 0.2;
    const fx = (Math.random() - 0.5) * r * 0.15;
    const fGrad = ctx.createRadialGradient(fx, fy, 0, fx, fy, r * 0.15);
    fGrad.addColorStop(0, "#FF6600");
    fGrad.addColorStop(1, "rgba(255,100,0,0)");
    ctx.fillStyle = fGrad;
    ctx.fillRect(fx - r * 0.15, fy - r * 0.15, r * 0.3, r * 0.3);
  }
  ctx.globalAlpha = 1;
}

function drawTreasure(ctx: CanvasRenderingContext2D, r: number) {
  // Chest body
  const chestGrad = ctx.createLinearGradient(0, -r * 0.3, 0, r * 0.6);
  chestGrad.addColorStop(0, "#8B6914");
  chestGrad.addColorStop(0.5, "#6B4F12");
  chestGrad.addColorStop(1, "#4A3510");
  ctx.beginPath();
  ctx.rect(-r * 0.65, -r * 0.1, r * 1.3, r * 0.7);
  ctx.fillStyle = chestGrad;
  ctx.fill();
  ctx.strokeStyle = "#DAA520";
  ctx.lineWidth = r * 0.03;
  ctx.stroke();

  // Chest lid (curved)
  ctx.beginPath();
  ctx.moveTo(-r * 0.65, -r * 0.1);
  ctx.quadraticCurveTo(0, -r * 0.6, r * 0.65, -r * 0.1);
  ctx.lineTo(r * 0.65, -r * 0.1);
  ctx.lineTo(-r * 0.65, -r * 0.1);
  ctx.closePath();
  const lidGrad = ctx.createLinearGradient(0, -r * 0.6, 0, -r * 0.1);
  lidGrad.addColorStop(0, "#A0781C");
  lidGrad.addColorStop(1, "#7A5C14");
  ctx.fillStyle = lidGrad;
  ctx.fill();
  ctx.strokeStyle = "#DAA520";
  ctx.lineWidth = r * 0.03;
  ctx.stroke();

  // Gold coins spilling out
  const coinPositions = [
    [-r * 0.3, -r * 0.25], [0, -r * 0.35], [r * 0.25, -r * 0.2],
    [-r * 0.15, -r * 0.45], [r * 0.1, -r * 0.4],
  ];
  for (const [cx, cy] of coinPositions) {
    const cGrad = ctx.createRadialGradient(cx - r * 0.02, cy - r * 0.02, 0, cx, cy, r * 0.1);
    cGrad.addColorStop(0, "#FFF8DC");
    cGrad.addColorStop(0.5, "#FFD700");
    cGrad.addColorStop(1, "#B8860B");
    ctx.beginPath();
    ctx.ellipse(cx, cy, r * 0.1, r * 0.08, 0, 0, Math.PI * 2);
    ctx.fillStyle = cGrad;
    ctx.fill();
    ctx.strokeStyle = "#DAA520";
    ctx.lineWidth = r * 0.015;
    ctx.stroke();
  }

  // Golden glow from chest
  const glowGrad = ctx.createRadialGradient(0, -r * 0.3, 0, 0, -r * 0.3, r * 0.5);
  glowGrad.addColorStop(0, "rgba(255,215,0,0.25)");
  glowGrad.addColorStop(1, "rgba(255,215,0,0)");
  ctx.fillStyle = glowGrad;
  ctx.fillRect(-r, -r * 0.8, r * 2, r * 0.8);

  // Lock
  ctx.beginPath();
  ctx.arc(0, r * 0.15, r * 0.08, 0, Math.PI * 2);
  ctx.fillStyle = "#FFD700";
  ctx.fill();
  ctx.beginPath();
  ctx.rect(-r * 0.04, r * 0.15, r * 0.08, r * 0.1);
  ctx.fillStyle = "#B8860B";
  ctx.fill();
}

function drawFireOrb(ctx: CanvasRenderingContext2D, r: number) {
  // Outer glow
  const outerGlow = ctx.createRadialGradient(0, 0, r * 0.3, 0, 0, r * 1.1);
  outerGlow.addColorStop(0, "rgba(255,100,0,0.3)");
  outerGlow.addColorStop(1, "rgba(255,50,0,0)");
  ctx.fillStyle = outerGlow;
  ctx.fillRect(-r * 1.1, -r * 1.1, r * 2.2, r * 2.2);

  // Main orb
  const orbGrad = ctx.createRadialGradient(-r * 0.15, -r * 0.15, 0, 0, 0, r * 0.75);
  orbGrad.addColorStop(0, "#FFEE88");
  orbGrad.addColorStop(0.3, "#FF8800");
  orbGrad.addColorStop(0.7, "#FF4400");
  orbGrad.addColorStop(1, "#AA0000");
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.7, 0, Math.PI * 2);
  ctx.fillStyle = orbGrad;
  ctx.fill();

  // Inner fire swirls
  ctx.globalAlpha = 0.3;
  for (let i = 0; i < 3; i++) {
    const angle = (i / 3) * Math.PI * 2;
    const sx = Math.cos(angle) * r * 0.25;
    const sy = Math.sin(angle) * r * 0.25;
    const sGrad = ctx.createRadialGradient(sx, sy, 0, sx, sy, r * 0.3);
    sGrad.addColorStop(0, "#FFFFFF");
    sGrad.addColorStop(1, "rgba(255,200,0,0)");
    ctx.fillStyle = sGrad;
    ctx.beginPath();
    ctx.arc(sx, sy, r * 0.3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // Highlight
  ctx.beginPath();
  ctx.ellipse(-r * 0.2, -r * 0.25, r * 0.15, r * 0.1, -0.3, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(255,255,255,0.35)";
  ctx.fill();

  // Ring
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.72, 0, Math.PI * 2);
  ctx.strokeStyle = "#FF660060";
  ctx.lineWidth = r * 0.04;
  ctx.stroke();
}

function drawRedGem(ctx: CanvasRenderingContext2D, r: number) {
  const grad = ctx.createLinearGradient(-r, -r, r, r);
  grad.addColorStop(0, "#FF1744");
  grad.addColorStop(0.3, "#FF6680");
  grad.addColorStop(0.5, "#FF0033");
  grad.addColorStop(1, "#880022");

  // Gem shape (hexagonal cut)
  ctx.beginPath();
  ctx.moveTo(0, -r * 0.85);
  ctx.lineTo(r * 0.6, -r * 0.35);
  ctx.lineTo(r * 0.6, r * 0.35);
  ctx.lineTo(0, r * 0.85);
  ctx.lineTo(-r * 0.6, r * 0.35);
  ctx.lineTo(-r * 0.6, -r * 0.35);
  ctx.closePath();
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.strokeStyle = "#FF8899";
  ctx.lineWidth = r * 0.04;
  ctx.stroke();

  // Facet lines
  ctx.beginPath();
  ctx.moveTo(0, -r * 0.85);
  ctx.lineTo(0, r * 0.85);
  ctx.moveTo(-r * 0.6, -r * 0.35);
  ctx.lineTo(r * 0.6, r * 0.35);
  ctx.moveTo(r * 0.6, -r * 0.35);
  ctx.lineTo(-r * 0.6, r * 0.35);
  ctx.strokeStyle = "rgba(255,255,255,0.2)";
  ctx.lineWidth = r * 0.02;
  ctx.stroke();

  // Sparkle
  ctx.fillStyle = "rgba(255,255,255,0.5)";
  ctx.beginPath();
  ctx.arc(-r * 0.15, -r * 0.3, r * 0.08, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(r * 0.2, -r * 0.1, r * 0.05, 0, Math.PI * 2);
  ctx.fill();
}

function drawGoldCoin(ctx: CanvasRenderingContext2D, r: number) {
  // Coin edge
  const edgeGrad = ctx.createLinearGradient(-r, 0, r, 0);
  edgeGrad.addColorStop(0, "#B8860B");
  edgeGrad.addColorStop(0.5, "#FFD700");
  edgeGrad.addColorStop(1, "#B8860B");
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.8, 0, Math.PI * 2);
  ctx.fillStyle = edgeGrad;
  ctx.fill();

  // Inner face
  const faceGrad = ctx.createRadialGradient(-r * 0.15, -r * 0.15, 0, 0, 0, r * 0.7);
  faceGrad.addColorStop(0, "#FFF8DC");
  faceGrad.addColorStop(0.4, "#FFD700");
  faceGrad.addColorStop(1, "#DAA520");
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.68, 0, Math.PI * 2);
  ctx.fillStyle = faceGrad;
  ctx.fill();

  // Dragon emblem on coin
  ctx.strokeStyle = "#B8860B";
  ctx.lineWidth = r * 0.03;
  ctx.beginPath();
  ctx.moveTo(0, -r * 0.35);
  ctx.bezierCurveTo(r * 0.3, -r * 0.3, r * 0.35, 0, r * 0.15, r * 0.25);
  ctx.bezierCurveTo(0, r * 0.4, -r * 0.15, r * 0.25, -r * 0.3, r * 0.1);
  ctx.bezierCurveTo(-r * 0.35, 0, -r * 0.3, -r * 0.3, 0, -r * 0.35);
  ctx.stroke();

  // Edge detail
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.8, 0, Math.PI * 2);
  ctx.strokeStyle = "#DAA520";
  ctx.lineWidth = r * 0.05;
  ctx.stroke();

  // Rim highlight
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.78, -Math.PI * 0.6, -Math.PI * 0.1);
  ctx.strokeStyle = "rgba(255,255,255,0.2)";
  ctx.lineWidth = r * 0.03;
  ctx.stroke();
}

function drawLetter(ctx: CanvasRenderingContext2D, r: number, letter: string, baseColor: string) {
  // Embossed molten metal letter
  // Background plate
  const plateGrad = ctx.createLinearGradient(-r * 0.5, -r * 0.5, r * 0.5, r * 0.5);
  plateGrad.addColorStop(0, "rgba(60,30,10,0.6)");
  plateGrad.addColorStop(1, "rgba(40,20,5,0.4)");
  ctx.beginPath();
  roundRectLocal(ctx, -r * 0.5, -r * 0.5, r, r, r * 0.15);
  ctx.fillStyle = plateGrad;
  ctx.fill();

  // Letter shadow
  ctx.fillStyle = "rgba(0,0,0,0.4)";
  ctx.font = `bold ${r * 1.2}px 'Georgia', serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(letter, r * 0.03, r * 0.08);

  // Main letter with gradient
  const letterGrad = ctx.createLinearGradient(0, -r * 0.5, 0, r * 0.5);
  letterGrad.addColorStop(0, "#FFF0C0");
  letterGrad.addColorStop(0.3, baseColor);
  letterGrad.addColorStop(0.7, baseColor);
  letterGrad.addColorStop(1, "#6B4F12");
  ctx.fillStyle = letterGrad;
  ctx.fillText(letter, 0, r * 0.05);

  // Outline
  ctx.strokeStyle = "#8B6914";
  ctx.lineWidth = r * 0.03;
  ctx.strokeText(letter, 0, r * 0.05);

  // Top highlight
  ctx.globalAlpha = 0.3;
  ctx.fillStyle = "#FFFFFF";
  ctx.font = `bold ${r * 1.2}px 'Georgia', serif`;
  ctx.fillText(letter, -r * 0.01, r * 0.02);
  ctx.globalAlpha = 1;
}

function drawScatter(ctx: CanvasRenderingContext2D, r: number) {
  // Dragon egg / fire scatter
  const eggGrad = ctx.createRadialGradient(-r * 0.1, -r * 0.15, 0, 0, 0, r * 0.8);
  eggGrad.addColorStop(0, "#FF6644");
  eggGrad.addColorStop(0.4, "#CC0022");
  eggGrad.addColorStop(1, "#660011");

  // Egg shape
  ctx.beginPath();
  ctx.ellipse(0, r * 0.05, r * 0.6, r * 0.75, 0, 0, Math.PI * 2);
  ctx.fillStyle = eggGrad;
  ctx.fill();
  ctx.strokeStyle = "#FF4444";
  ctx.lineWidth = r * 0.05;
  ctx.stroke();

  // Cracks with glow
  ctx.strokeStyle = "#FFAA00";
  ctx.lineWidth = r * 0.03;
  ctx.shadowColor = "#FF6600";
  ctx.shadowBlur = 8;
  ctx.beginPath();
  ctx.moveTo(-r * 0.1, -r * 0.4);
  ctx.lineTo(r * 0.05, -r * 0.1);
  ctx.lineTo(-r * 0.15, r * 0.15);
  ctx.lineTo(r * 0.1, r * 0.4);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(r * 0.05, -r * 0.1);
  ctx.lineTo(r * 0.25, 0);
  ctx.stroke();
  ctx.shadowBlur = 0;

  // Glow from cracks
  const crackGlow = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 0.4);
  crackGlow.addColorStop(0, "rgba(255,150,0,0.25)");
  crackGlow.addColorStop(1, "rgba(255,100,0,0)");
  ctx.fillStyle = crackGlow;
  ctx.fillRect(-r * 0.4, -r * 0.4, r * 0.8, r * 0.8);

  // Highlight
  ctx.beginPath();
  ctx.ellipse(-r * 0.15, -r * 0.35, r * 0.18, r * 0.1, -0.3, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(255,255,255,0.2)";
  ctx.fill();

  // "SCATTER" text
  ctx.fillStyle = "#FFD700";
  ctx.font = `bold ${r * 0.28}px 'Arial'`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.shadowColor = "#FF4400";
  ctx.shadowBlur = 6;
  ctx.fillText("SCATTER", 0, r * 0.65);
  ctx.shadowBlur = 0;
}

function roundRectLocal(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
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

export function getSymbolCanvas(sym: SymbolDef, size: number): HTMLCanvasElement {
  const key = `${sym.id}_${size}`;
  if (!symbolCache.has(key)) {
    symbolCache.set(key, drawSymbolToCanvas(sym, size));
  }
  return symbolCache.get(key)!;
}
