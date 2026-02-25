/**
 * SlotEngine — Core game logic for Dragon's Inferno 5-reel, 3-row slot.
 * High-volatility fantasy dragon theme.
 */

export interface SymbolDef {
  id: string;
  name: string;
  color: string;
  weight: number;
  multiplier: number;
  isBonus?: boolean;
}

export const SYMBOLS: SymbolDef[] = [
  { id: "dragon",    name: "Dragon",     color: "#FF2200", weight: 5,   multiplier: 75 },
  { id: "sword",     name: "Flame Sword",color: "#FF6600", weight: 8,   multiplier: 40 },
  { id: "treasure",  name: "Treasure",   color: "#FFD700", weight: 10,  multiplier: 25 },
  { id: "fire_orb",  name: "Fire Orb",   color: "#FF4400", weight: 14,  multiplier: 15 },
  { id: "red_gem",   name: "Red Gem",    color: "#CC0033", weight: 16,  multiplier: 10 },
  { id: "gold_coin", name: "Gold Coin",  color: "#FFAA00", weight: 18,  multiplier: 8  },
  { id: "ace",       name: "A",          color: "#E8C060", weight: 22,  multiplier: 4  },
  { id: "king",      name: "K",          color: "#D4A040", weight: 24,  multiplier: 3  },
  { id: "queen",     name: "Q",          color: "#C09030", weight: 26,  multiplier: 2.5},
  { id: "jack",      name: "J",          color: "#B08028", weight: 28,  multiplier: 2  },
  { id: "ten",       name: "10",         color: "#A07020", weight: 30,  multiplier: 1.5},
  { id: "scatter",   name: "Scatter",    color: "#FF0044", weight: 4,   multiplier: 0, isBonus: true },
];

const TOTAL_WEIGHT = SYMBOLS.reduce((sum, s) => sum + s.weight, 0);

export const NUM_REELS = 5;
export const NUM_ROWS = 3;

export const PAYLINES: number[][] = [
  [1, 1, 1, 1, 1],
  [0, 0, 0, 0, 0],
  [2, 2, 2, 2, 2],
  [0, 1, 2, 1, 0],
  [2, 1, 0, 1, 2],
  [0, 0, 1, 2, 2],
  [2, 2, 1, 0, 0],
  [1, 0, 0, 0, 1],
  [1, 2, 2, 2, 1],
  [0, 1, 0, 1, 0],
];

export function weightedRandomSymbol(): SymbolDef {
  let r = Math.random() * TOTAL_WEIGHT;
  for (const sym of SYMBOLS) {
    r -= sym.weight;
    if (r <= 0) return sym;
  }
  return SYMBOLS[SYMBOLS.length - 1];
}

export function generateGrid(): SymbolDef[][] {
  return Array.from({ length: NUM_REELS }, () =>
    Array.from({ length: NUM_ROWS }, () => weightedRandomSymbol())
  );
}

export interface WinResult {
  paylineIndex: number;
  positions: number[];
  symbol: SymbolDef;
  count: number;
  payout: number;
}

export function evaluateWins(grid: SymbolDef[][], bet: number): WinResult[] {
  const wins: WinResult[] = [];

  for (let pl = 0; pl < PAYLINES.length; pl++) {
    const line = PAYLINES[pl];
    const firstSym = grid[0][line[0]];
    if (firstSym.isBonus) continue;

    let count = 1;
    for (let r = 1; r < NUM_REELS; r++) {
      if (grid[r][line[r]].id === firstSym.id) count++;
      else break;
    }

    if (count >= 3) {
      const payScale = count === 5 ? 1 : count === 4 ? 0.4 : 0.15;
      const payout = bet * firstSym.multiplier * payScale;
      wins.push({
        paylineIndex: pl,
        positions: line,
        symbol: firstSym,
        count,
        payout,
      });
    }
  }

  return wins;
}

export function countBonusSymbols(grid: SymbolDef[][]): number {
  let count = 0;
  for (const reel of grid) {
    for (const sym of reel) {
      if (sym.isBonus) count++;
    }
  }
  return count;
}

export function shouldAnticipate(grid: SymbolDef[][], reelsStopped: number): boolean {
  if (reelsStopped < 3) return false;
  let bonusCount = 0;
  for (let r = 0; r < reelsStopped; r++) {
    for (const sym of grid[r]) {
      if (sym.isBonus) bonusCount++;
    }
  }
  return bonusCount >= 2;
}
