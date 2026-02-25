/**
 * SlotEngine — Core game logic for a 5-reel, 3-row slot machine.
 * Handles symbol generation, weighted distribution, payline evaluation, and RTP targeting.
 */

export interface SymbolDef {
  id: string;
  name: string;
  color: string;
  weight: number;      // Higher = more common
  multiplier: number;  // Payout multiplier for 5-of-a-kind
  isBonus?: boolean;
}

export const SYMBOLS: SymbolDef[] = [
  { id: "bitcoin",   name: "Bitcoin",   color: "#F7931A", weight: 8,  multiplier: 50 },
  { id: "ethereum",  name: "Ethereum",  color: "#627EEA", weight: 10, multiplier: 25 },
  { id: "solana",    name: "Solana",    color: "#9945FF", weight: 12, multiplier: 15 },
  { id: "diamond",   name: "Diamond",   color: "#00F5FF", weight: 15, multiplier: 10 },
  { id: "gold_bar",  name: "Gold Bar",  color: "#FFD700", weight: 18, multiplier: 8  },
  { id: "seven",     name: "Lucky 7",   color: "#FF00AA", weight: 20, multiplier: 5  },
  { id: "cherry",    name: "Cherry",    color: "#FF4444", weight: 25, multiplier: 3  },
  { id: "bell",      name: "Bell",      color: "#FFAB00", weight: 28, multiplier: 2  },
  { id: "star",      name: "Star",      color: "#E040FB", weight: 30, multiplier: 2  },
  { id: "bonus",     name: "Bonus",     color: "#00FF88", weight: 5,  multiplier: 0, isBonus: true },
];

const TOTAL_WEIGHT = SYMBOLS.reduce((sum, s) => sum + s.weight, 0);

export const NUM_REELS = 5;
export const NUM_ROWS = 3;

// 10 paylines (indices per reel: 0=top, 1=mid, 2=bot)
export const PAYLINES: number[][] = [
  [1, 1, 1, 1, 1], // center
  [0, 0, 0, 0, 0], // top
  [2, 2, 2, 2, 2], // bottom
  [0, 1, 2, 1, 0], // V shape
  [2, 1, 0, 1, 2], // inverted V
  [0, 0, 1, 2, 2], // diagonal down
  [2, 2, 1, 0, 0], // diagonal up
  [1, 0, 0, 0, 1], // W top
  [1, 2, 2, 2, 1], // W bottom
  [0, 1, 0, 1, 0], // zigzag
];

/** Pick a random symbol based on weights */
export function weightedRandomSymbol(): SymbolDef {
  let r = Math.random() * TOTAL_WEIGHT;
  for (const sym of SYMBOLS) {
    r -= sym.weight;
    if (r <= 0) return sym;
  }
  return SYMBOLS[SYMBOLS.length - 1];
}

/** Generate a full grid of symbols (5 reels × 3 rows) */
export function generateGrid(): SymbolDef[][] {
  return Array.from({ length: NUM_REELS }, () =>
    Array.from({ length: NUM_ROWS }, () => weightedRandomSymbol())
  );
}

export interface WinResult {
  paylineIndex: number;
  positions: number[];   // row index for each reel on this payline
  symbol: SymbolDef;
  count: number;
  payout: number;
}

/** Evaluate all paylines and return wins */
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
      // Payout scales: 3-of-kind = mult*1, 4-of-kind = mult*3, 5-of-kind = mult*full
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

/** Count bonus symbols across the grid */
export function countBonusSymbols(grid: SymbolDef[][]): number {
  let count = 0;
  for (const reel of grid) {
    for (const sym of reel) {
      if (sym.isBonus) count++;
    }
  }
  return count;
}

/** Check if 2+ bonus symbols in first 4 reels (anticipation trigger) */
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
