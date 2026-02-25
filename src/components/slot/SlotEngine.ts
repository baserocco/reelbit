/**
 * SlotEngine — Dragon's Inferno Premium AAA 5-reel, 3-row slot.
 * High-volatility fantasy dragon theme with tumble/cascade mechanic.
 */

export interface SymbolDef {
  id: string;
  name: string;
  color: string;
  weight: number;
  multiplier: number;
  isBonus?: boolean;
  isWild?: boolean;
}

export const SYMBOLS: SymbolDef[] = [
  { id: "fire_dragon", name: "Fire Dragon",  color: "#FF2200", weight: 5,   multiplier: 75 },
  { id: "ice_dragon",  name: "Ice Dragon",   color: "#00CCFF", weight: 6,   multiplier: 50 },
  { id: "wild",        name: "Wild",         color: "#FF6600", weight: 4,   multiplier: 0, isWild: true },
  { id: "treasure",    name: "Treasure",     color: "#FFD700", weight: 10,  multiplier: 25 },
  { id: "sword",       name: "Flame Sword",  color: "#FF6600", weight: 12,  multiplier: 15 },
  { id: "fire_orb",    name: "Fire Orb",     color: "#FF4400", weight: 14,  multiplier: 10 },
  { id: "red_gem",     name: "Red Gem",      color: "#CC0033", weight: 16,  multiplier: 8  },
  { id: "gold_coin",   name: "Gold Coin",    color: "#FFAA00", weight: 18,  multiplier: 6  },
  { id: "ace",         name: "A",            color: "#E8C060", weight: 22,  multiplier: 4  },
  { id: "king",        name: "K",            color: "#D4A040", weight: 24,  multiplier: 3  },
  { id: "queen",       name: "Q",            color: "#C09030", weight: 26,  multiplier: 2.5},
  { id: "jack",        name: "J",            color: "#B08028", weight: 28,  multiplier: 2  },
  { id: "ten",         name: "10",           color: "#A07020", weight: 28,  multiplier: 1.5},
  { id: "nine",        name: "9",            color: "#907018", weight: 30,  multiplier: 1  },
  { id: "scatter",     name: "Scatter",      color: "#FF0044", weight: 4,   multiplier: 0, isBonus: true },
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
  [2, 1, 2, 1, 2],
  [1, 0, 1, 0, 1],
  [1, 2, 1, 2, 1],
  [0, 0, 1, 0, 0],
  [2, 2, 1, 2, 2],
  [0, 1, 1, 1, 0],
  [2, 1, 1, 1, 2],
  [0, 2, 0, 2, 0],
  [2, 0, 2, 0, 2],
  [1, 0, 2, 0, 1],
];

export function weightedRandomSymbol(): SymbolDef {
  let r = Math.random() * TOTAL_WEIGHT;
  for (const sym of SYMBOLS) {
    r -= sym.weight;
    if (r <= 0) return sym;
  }
  return SYMBOLS[SYMBOLS.length - 1];
}

/** Generate a symbol that is NOT a scatter or wild (for tumble refills) */
export function weightedRandomNonSpecial(): SymbolDef {
  let sym: SymbolDef;
  do {
    sym = weightedRandomSymbol();
  } while (sym.isBonus || sym.isWild);
  return sym;
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
  winningCells: [number, number][]; // [reel, row]
}

/** Check if sym matches target (wild substitution) */
function symbolMatches(sym: SymbolDef, target: SymbolDef): boolean {
  if (sym.id === target.id) return true;
  if (sym.isWild && !target.isBonus) return true;
  if (target.isWild && !sym.isBonus) return true;
  return false;
}

export function evaluateWins(grid: SymbolDef[][], bet: number, multiplier: number = 1): WinResult[] {
  const wins: WinResult[] = [];

  for (let pl = 0; pl < PAYLINES.length; pl++) {
    const line = PAYLINES[pl];
    const firstSym = grid[0][line[0]];
    if (firstSym.isBonus) continue;

    // If first symbol is wild, find the first non-wild to determine the paying symbol
    let payingSym = firstSym;
    if (firstSym.isWild) {
      for (let r = 1; r < NUM_REELS; r++) {
        const s = grid[r][line[r]];
        if (!s.isWild && !s.isBonus) { payingSym = s; break; }
      }
      if (payingSym.isWild) continue; // all wilds, no pay
    }

    let count = 1;
    const cells: [number, number][] = [[0, line[0]]];
    for (let r = 1; r < NUM_REELS; r++) {
      if (symbolMatches(grid[r][line[r]], payingSym)) {
        count++;
        cells.push([r, line[r]]);
      } else break;
    }

    if (count >= 3) {
      const payScale = count === 5 ? 1 : count === 4 ? 0.4 : 0.15;
      const payout = bet * payingSym.multiplier * payScale * multiplier;
      wins.push({
        paylineIndex: pl,
        positions: line,
        symbol: payingSym,
        count,
        payout,
        winningCells: cells,
      });
    }
  }

  return wins;
}

/** Get all unique winning cell positions from win results */
export function getWinningCells(wins: WinResult[]): Set<string> {
  const cells = new Set<string>();
  for (const w of wins) {
    for (const [reel, row] of w.winningCells) {
      cells.add(`${reel}_${row}`);
    }
  }
  return cells;
}

/** Remove winning symbols and cascade remaining down, filling from top */
export function tumbleGrid(grid: SymbolDef[][], winningCells: Set<string>): SymbolDef[][] {
  const newGrid: SymbolDef[][] = [];
  for (let r = 0; r < NUM_REELS; r++) {
    const col: SymbolDef[] = [];
    // Keep non-winning symbols
    for (let row = 0; row < NUM_ROWS; row++) {
      if (!winningCells.has(`${r}_${row}`)) {
        col.push(grid[r][row]);
      }
    }
    // Fill from top with new symbols
    while (col.length < NUM_ROWS) {
      col.unshift(weightedRandomNonSpecial());
    }
    newGrid.push(col);
  }
  return newGrid;
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

/** Game mode state */
export type GameMode = "base" | "freespins";

export interface GameState {
  mode: GameMode;
  freeSpinsRemaining: number;
  freeSpinsTotal: number;
  tumbleMultiplier: number;
  tumbleCount: number;
  totalFreeSpinWin: number;
  stickyWilds: [number, number][]; // positions of sticky wilds during free spins
}

export function createInitialGameState(): GameState {
  return {
    mode: "base",
    freeSpinsRemaining: 0,
    freeSpinsTotal: 0,
    tumbleMultiplier: 1,
    tumbleCount: 0,
    totalFreeSpinWin: 0,
    stickyWilds: [],
  };
}

/** Get free spins count from scatter count */
export function getFreespinsCount(scatterCount: number): number {
  if (scatterCount >= 5) return 20;
  if (scatterCount >= 4) return 15;
  if (scatterCount >= 3) return 10;
  return 0;
}

/** Tumble multiplier progression */
const TUMBLE_MULTIPLIERS = [1, 2, 3, 5, 8, 10, 15, 20, 25, 30, 40, 50];

export function getTumbleMultiplier(tumbleCount: number, inFreeSpins: boolean): number {
  if (!inFreeSpins) return 1;
  const idx = Math.min(tumbleCount, TUMBLE_MULTIPLIERS.length - 1);
  return TUMBLE_MULTIPLIERS[idx];
}

export const BUY_FEATURE_MULTIPLIER = 100; // 100x bet to buy free spins
