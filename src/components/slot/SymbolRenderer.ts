/**
 * SymbolRenderer — Draws crypto-themed slot symbols on Canvas.
 * Each symbol is a hand-drawn vector graphic.
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
  const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * 1.2);
  glow.addColorStop(0, sym.color + "30");
  glow.addColorStop(1, "transparent");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, size, size);

  ctx.save();
  ctx.translate(cx, cy);

  switch (sym.id) {
    case "bitcoin":
      drawBitcoin(ctx, r, sym.color);
      break;
    case "ethereum":
      drawEthereum(ctx, r, sym.color);
      break;
    case "solana":
      drawSolana(ctx, r, sym.color);
      break;
    case "diamond":
      drawDiamond(ctx, r, sym.color);
      break;
    case "gold_bar":
      drawGoldBar(ctx, r, sym.color);
      break;
    case "seven":
      drawSeven(ctx, r, sym.color);
      break;
    case "cherry":
      drawCherry(ctx, r, sym.color);
      break;
    case "bell":
      drawBell(ctx, r, sym.color);
      break;
    case "star":
      drawStar(ctx, r, sym.color);
      break;
    case "bonus":
      drawBonus(ctx, r, sym.color);
      break;
  }

  ctx.restore();
  return canvas;
}

function drawBitcoin(ctx: CanvasRenderingContext2D, r: number, color: string) {
  // Circle
  const grad = ctx.createLinearGradient(-r, -r, r, r);
  grad.addColorStop(0, "#F7931A");
  grad.addColorStop(1, "#E8820B");
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.strokeStyle = "#FFB84D";
  ctx.lineWidth = r * 0.06;
  ctx.stroke();

  // B symbol
  ctx.fillStyle = "#FFF";
  ctx.font = `bold ${r * 1.1}px 'Arial'`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("₿", 0, r * 0.05);

  // Shine
  ctx.beginPath();
  ctx.arc(-r * 0.25, -r * 0.3, r * 0.5, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(255,255,255,0.12)";
  ctx.fill();
}

function drawEthereum(ctx: CanvasRenderingContext2D, r: number, color: string) {
  const grad = ctx.createLinearGradient(0, -r, 0, r);
  grad.addColorStop(0, "#8C9EFF");
  grad.addColorStop(0.5, "#627EEA");
  grad.addColorStop(1, "#3D5AFE");

  // Diamond shape
  ctx.beginPath();
  ctx.moveTo(0, -r * 0.95);
  ctx.lineTo(r * 0.55, 0);
  ctx.lineTo(0, r * 0.95);
  ctx.lineTo(-r * 0.55, 0);
  ctx.closePath();
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.strokeStyle = "#B388FF";
  ctx.lineWidth = r * 0.04;
  ctx.stroke();

  // Inner detail
  ctx.beginPath();
  ctx.moveTo(0, -r * 0.95);
  ctx.lineTo(r * 0.55, 0);
  ctx.lineTo(0, r * 0.2);
  ctx.lineTo(-r * 0.55, 0);
  ctx.closePath();
  ctx.fillStyle = "rgba(255,255,255,0.15)";
  ctx.fill();

  // Center line
  ctx.beginPath();
  ctx.moveTo(-r * 0.55, 0);
  ctx.lineTo(r * 0.55, 0);
  ctx.strokeStyle = "rgba(255,255,255,0.3)";
  ctx.lineWidth = r * 0.03;
  ctx.stroke();
}

function drawSolana(ctx: CanvasRenderingContext2D, r: number, color: string) {
  const grad = ctx.createLinearGradient(-r, -r, r, r);
  grad.addColorStop(0, "#9945FF");
  grad.addColorStop(1, "#14F195");

  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.strokeStyle = "#B974FF";
  ctx.lineWidth = r * 0.05;
  ctx.stroke();

  // Three parallelogram bars
  const barH = r * 0.18;
  const offsets = [-r * 0.4, 0, r * 0.4];
  ctx.fillStyle = "#FFF";
  for (const oy of offsets) {
    ctx.beginPath();
    ctx.moveTo(-r * 0.5, oy - barH / 2);
    ctx.lineTo(r * 0.5, oy - barH / 2 - r * 0.1);
    ctx.lineTo(r * 0.5, oy + barH / 2 - r * 0.1);
    ctx.lineTo(-r * 0.5, oy + barH / 2);
    ctx.closePath();
    ctx.fill();
  }
}

function drawDiamond(ctx: CanvasRenderingContext2D, r: number, color: string) {
  const grad = ctx.createLinearGradient(-r, -r, r, r);
  grad.addColorStop(0, "#00F5FF");
  grad.addColorStop(0.5, "#FFFFFF");
  grad.addColorStop(1, "#00BCD4");

  ctx.beginPath();
  ctx.moveTo(0, -r * 0.9);
  ctx.lineTo(r * 0.7, -r * 0.15);
  ctx.lineTo(r * 0.45, r * 0.85);
  ctx.lineTo(-r * 0.45, r * 0.85);
  ctx.lineTo(-r * 0.7, -r * 0.15);
  ctx.closePath();
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.strokeStyle = "#80DEEA";
  ctx.lineWidth = r * 0.04;
  ctx.stroke();

  // Facets
  ctx.beginPath();
  ctx.moveTo(-r * 0.7, -r * 0.15);
  ctx.lineTo(0, r * 0.1);
  ctx.lineTo(r * 0.7, -r * 0.15);
  ctx.strokeStyle = "rgba(255,255,255,0.4)";
  ctx.lineWidth = r * 0.02;
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(0, -r * 0.9);
  ctx.lineTo(0, r * 0.1);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(0, r * 0.1);
  ctx.lineTo(-r * 0.45, r * 0.85);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(0, r * 0.1);
  ctx.lineTo(r * 0.45, r * 0.85);
  ctx.stroke();

  // Sparkle
  ctx.fillStyle = "rgba(255,255,255,0.5)";
  ctx.beginPath();
  ctx.arc(-r * 0.15, -r * 0.35, r * 0.08, 0, Math.PI * 2);
  ctx.fill();
}

function drawGoldBar(ctx: CanvasRenderingContext2D, r: number, _color: string) {
  const grad = ctx.createLinearGradient(-r, -r * 0.5, r, r * 0.5);
  grad.addColorStop(0, "#FFD700");
  grad.addColorStop(0.3, "#FFF8DC");
  grad.addColorStop(0.7, "#FFD700");
  grad.addColorStop(1, "#B8860B");

  // Trapezoid bar
  ctx.beginPath();
  ctx.moveTo(-r * 0.35, -r * 0.35);
  ctx.lineTo(r * 0.35, -r * 0.35);
  ctx.lineTo(r * 0.6, r * 0.35);
  ctx.lineTo(-r * 0.6, r * 0.35);
  ctx.closePath();
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.strokeStyle = "#B8860B";
  ctx.lineWidth = r * 0.04;
  ctx.stroke();

  // Top face
  ctx.beginPath();
  ctx.moveTo(-r * 0.35, -r * 0.35);
  ctx.lineTo(-r * 0.2, -r * 0.55);
  ctx.lineTo(r * 0.5, -r * 0.55);
  ctx.lineTo(r * 0.35, -r * 0.35);
  ctx.closePath();
  ctx.fillStyle = "#FFF8DC";
  ctx.fill();
  ctx.strokeStyle = "#B8860B";
  ctx.lineWidth = r * 0.03;
  ctx.stroke();

  // Side face
  ctx.beginPath();
  ctx.moveTo(r * 0.35, -r * 0.35);
  ctx.lineTo(r * 0.5, -r * 0.55);
  ctx.lineTo(r * 0.75, r * 0.15);
  ctx.lineTo(r * 0.6, r * 0.35);
  ctx.closePath();
  ctx.fillStyle = "#DAA520";
  ctx.fill();
  ctx.strokeStyle = "#B8860B";
  ctx.lineWidth = r * 0.03;
  ctx.stroke();
}

function drawSeven(ctx: CanvasRenderingContext2D, r: number, color: string) {
  const grad = ctx.createLinearGradient(-r, -r, r, r);
  grad.addColorStop(0, "#FF00AA");
  grad.addColorStop(1, "#FF66CC");

  ctx.fillStyle = grad;
  ctx.font = `bold ${r * 1.6}px 'Arial'`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("7", 0, r * 0.05);

  ctx.strokeStyle = "#FFB3DD";
  ctx.lineWidth = r * 0.04;
  ctx.strokeText("7", 0, r * 0.05);

  // Sparkles
  ctx.fillStyle = "#FFF";
  ctx.globalAlpha = 0.6;
  ctx.beginPath(); ctx.arc(-r * 0.3, -r * 0.5, r * 0.06, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(r * 0.35, -r * 0.2, r * 0.05, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = 1;
}

function drawCherry(ctx: CanvasRenderingContext2D, r: number, _color: string) {
  // Stem
  ctx.strokeStyle = "#4CAF50";
  ctx.lineWidth = r * 0.08;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(0, -r * 0.8);
  ctx.quadraticCurveTo(-r * 0.2, -r * 0.3, -r * 0.35, r * 0.1);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(0, -r * 0.8);
  ctx.quadraticCurveTo(r * 0.2, -r * 0.3, r * 0.35, r * 0.1);
  ctx.stroke();

  // Cherries
  for (const ox of [-r * 0.35, r * 0.35]) {
    const grad = ctx.createRadialGradient(ox - r * 0.1, r * 0.05, 0, ox, r * 0.2, r * 0.3);
    grad.addColorStop(0, "#FF6666");
    grad.addColorStop(0.7, "#FF0000");
    grad.addColorStop(1, "#CC0000");
    ctx.beginPath();
    ctx.arc(ox, r * 0.25, r * 0.3, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.strokeStyle = "#990000";
    ctx.lineWidth = r * 0.03;
    ctx.stroke();

    // Shine
    ctx.beginPath();
    ctx.arc(ox - r * 0.1, r * 0.12, r * 0.08, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255,255,255,0.4)";
    ctx.fill();
  }

  // Leaf
  ctx.beginPath();
  ctx.ellipse(r * 0.15, -r * 0.65, r * 0.2, r * 0.1, Math.PI / 4, 0, Math.PI * 2);
  ctx.fillStyle = "#66BB6A";
  ctx.fill();
}

function drawBell(ctx: CanvasRenderingContext2D, r: number, _color: string) {
  const grad = ctx.createLinearGradient(0, -r, 0, r);
  grad.addColorStop(0, "#FFD54F");
  grad.addColorStop(0.5, "#FFAB00");
  grad.addColorStop(1, "#FF8F00");

  ctx.beginPath();
  ctx.moveTo(0, -r * 0.7);
  ctx.quadraticCurveTo(-r * 0.7, -r * 0.3, -r * 0.65, r * 0.4);
  ctx.lineTo(r * 0.65, r * 0.4);
  ctx.quadraticCurveTo(r * 0.7, -r * 0.3, 0, -r * 0.7);
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.strokeStyle = "#E65100";
  ctx.lineWidth = r * 0.04;
  ctx.stroke();

  // Clapper
  ctx.beginPath();
  ctx.arc(0, r * 0.55, r * 0.12, 0, Math.PI * 2);
  ctx.fillStyle = "#5D4037";
  ctx.fill();

  // Ring top
  ctx.beginPath();
  ctx.arc(0, -r * 0.75, r * 0.12, 0, Math.PI * 2);
  ctx.strokeStyle = grad;
  ctx.lineWidth = r * 0.07;
  ctx.stroke();

  // Shine
  ctx.beginPath();
  ctx.arc(-r * 0.2, -r * 0.2, r * 0.15, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(255,255,255,0.15)";
  ctx.fill();
}

function drawStar(ctx: CanvasRenderingContext2D, r: number, color: string) {
  const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
  grad.addColorStop(0, "#F8BBD0");
  grad.addColorStop(1, "#E040FB");

  ctx.beginPath();
  for (let i = 0; i < 5; i++) {
    const outerAngle = (Math.PI * 2 * i) / 5 - Math.PI / 2;
    const innerAngle = outerAngle + Math.PI / 5;
    ctx.lineTo(Math.cos(outerAngle) * r * 0.85, Math.sin(outerAngle) * r * 0.85);
    ctx.lineTo(Math.cos(innerAngle) * r * 0.35, Math.sin(innerAngle) * r * 0.35);
  }
  ctx.closePath();
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.strokeStyle = "#CE93D8";
  ctx.lineWidth = r * 0.04;
  ctx.stroke();

  // Center sparkle
  ctx.fillStyle = "rgba(255,255,255,0.4)";
  ctx.beginPath();
  ctx.arc(0, -r * 0.1, r * 0.12, 0, Math.PI * 2);
  ctx.fill();
}

function drawBonus(ctx: CanvasRenderingContext2D, r: number, color: string) {
  // Glowing circle
  const grad = ctx.createRadialGradient(0, 0, r * 0.2, 0, 0, r);
  grad.addColorStop(0, "#80FF80");
  grad.addColorStop(0.5, "#00FF88");
  grad.addColorStop(1, "#00AA44");
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.85, 0, Math.PI * 2);
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.strokeStyle = "#66FF99";
  ctx.lineWidth = r * 0.06;
  ctx.stroke();

  // Text
  ctx.fillStyle = "#FFF";
  ctx.font = `bold ${r * 0.5}px 'Arial'`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("BONUS", 0, 0);
}

/** Get or create cached symbol canvas */
export function getSymbolCanvas(sym: SymbolDef, size: number): HTMLCanvasElement {
  const key = `${sym.id}_${size}`;
  if (!symbolCache.has(key)) {
    symbolCache.set(key, drawSymbolToCanvas(sym, size));
  }
  return symbolCache.get(key)!;
}
