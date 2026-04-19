"use client";

/**
 * Client-side demo session.
 *
 * Stored entirely in localStorage — nothing hits the server.
 * Cleared on explicit logout (exitDemo). No personal data, no wallet required.
 */

import type { SpinResult } from "@/components/slot/types";

// ── Session shape ─────────────────────────────────────────────────────────────

export interface DemoSession {
  username:   string;
  balance:    number; // USDC μ-units
  nonce:      number;
  createdAt:  number;
}

const STORAGE_KEY  = "reelbit_demo_session";
const DEMO_BALANCE = 100 * 1_000_000; // $100 in μUSDC

export function createDemoSession(username: string): DemoSession {
  const session: DemoSession = {
    username: username.trim().slice(0, 20),
    balance:  DEMO_BALANCE,
    nonce:    0,
    createdAt: Date.now(),
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  return session;
}

export function getDemoSession(): DemoSession | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as DemoSession) : null;
  } catch { return null; }
}

export function isDemoMode(): boolean {
  return getDemoSession() !== null;
}

export function exitDemo(): void {
  localStorage.removeItem(STORAGE_KEY);
}

function saveSession(session: DemoSession): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

export function debitDemo(usdcUnits: number): DemoSession {
  const session = getDemoSession();
  if (!session) throw new Error("No demo session");
  if (session.balance < usdcUnits) throw new Error("Insufficient demo balance");
  session.balance -= usdcUnits;
  saveSession(session);
  return session;
}

export function creditDemo(usdcUnits: number): DemoSession {
  const session = getDemoSession();
  if (!session) throw new Error("No demo session");
  session.balance += usdcUnits;
  saveSession(session);
  return session;
}

// ── Client-side spin engine ───────────────────────────────────────────────────
// Mirrors the game-server engine logic. Uses Math.random() — demo is not
// provably fair by design; it's purely for demonstration purposes.

type SymbolId = "SEVEN" | "BAR3" | "BAR2" | "BAR1" | "CHERRY" | "BELL" | "LEMON" | "ORANGE" | "WILD";

const WEIGHTS_3: [SymbolId, number][] = [
  ["SEVEN",  1], ["BAR3",  2], ["BAR2",  3], ["BAR1",  4],
  ["BELL",   5], ["CHERRY", 6], ["LEMON",  8], ["ORANGE", 9],
];

const WEIGHTS_5: [SymbolId, number][] = [
  ["SEVEN",  1], ["BAR3",  2], ["BAR2",  3], ["BAR1",  4],
  ["BELL",   5], ["CHERRY", 6], ["LEMON",  8], ["ORANGE", 9], ["WILD", 2],
];

const PAYTABLE_3: Record<string, number> = {
  "SEVEN,SEVEN,SEVEN": 200,  // reduced jackpot for demo
  "BAR3,BAR3,BAR3": 50, "BAR2,BAR2,BAR2": 25, "BAR1,BAR1,BAR1": 12,
  "BELL,BELL,BELL": 9, "CHERRY,CHERRY,CHERRY": 6, "LEMON,LEMON,LEMON": 3,
  "ORANGE,ORANGE,ORANGE": 2, "BAR1,BAR2,BAR3": 2, "BAR1,BAR3,BAR2": 2,
  "BAR2,BAR1,BAR3": 2, "BAR2,BAR3,BAR1": 2, "BAR3,BAR1,BAR2": 2,
  "BAR3,BAR2,BAR1": 2, "CHERRY,*,*": 1, "CHERRY,CHERRY,*": 2,
};

const PAYTABLE_5: Record<string, number> = {
  "SEVEN,SEVEN,SEVEN,SEVEN,SEVEN": 150,
  "BAR3,BAR3,BAR3,BAR3,BAR3": 40, "BAR2,BAR2,BAR2,BAR2,BAR2": 20,
  "BELL,BELL,BELL,BELL,BELL": 12, "CHERRY,CHERRY,CHERRY,CHERRY,CHERRY": 8,
  "LEMON,LEMON,LEMON,LEMON,LEMON": 4, "ORANGE,ORANGE,ORANGE,ORANGE,ORANGE": 3,
  "SEVEN,SEVEN,SEVEN,*,*": 20, "BAR3,BAR3,BAR3,*,*": 8,
  "BAR2,BAR2,BAR2,*,*": 4, "BELL,BELL,BELL,*,*": 3,
  "CHERRY,CHERRY,CHERRY,*,*": 2, "CHERRY,*,*,*,*": 1,
};

function weightedPick(weights: [SymbolId, number][]): SymbolId {
  const total = weights.reduce((s, [, w]) => s + w, 0);
  let r = Math.random() * total;
  for (const [sym, w] of weights) { r -= w; if (r <= 0) return sym; }
  return weights[weights.length - 1][0];
}

function spinReel(rows: number, weights: [SymbolId, number][]): SymbolId[] {
  return Array.from({ length: rows }, () => weightedPick(weights));
}

function matchesPattern(symbols: SymbolId[], pattern: string): boolean {
  const parts = pattern.split(",");
  for (let i = 0; i < parts.length; i++) {
    if (parts[i] === "*") continue;
    if (parts[i] !== symbols[i]) return false;
  }
  return true;
}

function applyWilds(symbols: SymbolId[]): SymbolId[] {
  if (!symbols.includes("WILD")) return symbols;
  const nonWild = symbols.find((s) => s !== "WILD");
  return nonWild ? symbols.map((s) => (s === "WILD" ? nonWild : s)) : symbols;
}

function evalLine(symbols: SymbolId[], paytable: Record<string, number>): number {
  const effective = applyWilds(symbols);
  for (const [pattern, mult] of Object.entries(paytable)) {
    if (matchesPattern(effective, pattern)) return mult;
  }
  return 0;
}

const PAYLINES_3 = [[1, 1, 1]];
const PAYLINES_5 = [
  [1,1,1,1,1],[0,0,0,0,0],[2,2,2,2,2],[0,1,2,1,0],[2,1,0,1,2],
  [1,0,0,0,1],[1,2,2,2,1],[0,0,1,2,2],[2,2,1,0,0],[1,1,0,1,1],
];

export function demoSpin(
  betUsdc: number,
  model: "Classic3Reel" | "Standard5Reel" | "FiveReelFreeSpins",
): SpinResult {
  const session = getDemoSession()!;
  const is3 = model === "Classic3Reel";
  const reelCount = is3 ? 3 : 5;
  const weights   = is3 ? WEIGHTS_3 : WEIGHTS_5;
  const paytable  = is3 ? PAYTABLE_3 : PAYTABLE_5;
  const paylines  = is3 ? PAYLINES_3 : PAYLINES_5;

  // Build reels: [reel][row]
  const reels: SymbolId[][] = Array.from({ length: reelCount }, () => spinReel(3, weights));

  const winLines: { paylineIndex: number; symbols: SymbolId[]; multiplier: number; payout: number }[] = [];
  let totalPayout = 0;

  for (let pi = 0; pi < paylines.length; pi++) {
    const rowsForPayline = paylines[pi];
    const lineSymbols: SymbolId[] = rowsForPayline.map((row, reel) => reels[reel][row]);
    const mult = evalLine(lineSymbols, paytable);
    if (mult > 0) {
      const payout = betUsdc * mult;
      winLines.push({ paylineIndex: pi, symbols: lineSymbols, multiplier: mult, payout });
      totalPayout += payout;
    }
  }

  // Free spins: BELL on all reels center row for FiveReelFreeSpins
  const freeSpinsAwarded = model === "FiveReelFreeSpins" && reels.every((r) => r[1] === "BELL") ? 5 : 0;

  // Update session in place (nonce bump)
  session.nonce += 1;
  session.balance = Math.max(0, session.balance - betUsdc + totalPayout);
  saveSession(session);

  return {
    model,
    reels,
    winLines,
    totalPayout,
    betAmount: betUsdc,
    isJackpot: false, // no real jackpot in demo
    freeSpinsAwarded,
    serverSeedHash: "demo-mode",
    clientSeed:     "demo",
    nonce:          session.nonce,
  };
}
