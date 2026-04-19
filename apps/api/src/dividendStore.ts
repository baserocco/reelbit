/**
 * Dividend store — tracks accumulated holder dividend lamports per mint.
 *
 * The LP harvest cron carves out 10% of LP fees into this store rather than
 * transferring them out. The holder dividend cron reads and drains it every 24h.
 *
 * Data persisted to data/dividends.json so it survives server restarts.
 */

import fs from "fs";
import path from "path";

const STORE_PATH = path.resolve(process.cwd(), "data/dividends.json");

export interface DividendEntry {
  accumulated:     number; // lamports waiting to be distributed to holders
  lastDistributed: number; // unix ms timestamp of last completed distribution
  totalDistributed: number; // lifetime total lamports distributed
}

function readStore(): Record<string, DividendEntry> {
  try {
    return JSON.parse(fs.readFileSync(STORE_PATH, "utf-8"));
  } catch {
    return {};
  }
}

function writeStore(store: Record<string, DividendEntry>): void {
  fs.mkdirSync(path.dirname(STORE_PATH), { recursive: true });
  fs.writeFileSync(STORE_PATH, JSON.stringify(store, null, 2));
}

export function addDividend(mint: string, lamports: number): void {
  if (lamports <= 0) return;
  const store = readStore();
  if (!store[mint]) {
    store[mint] = { accumulated: 0, lastDistributed: 0, totalDistributed: 0 };
  }
  store[mint].accumulated += lamports;
  writeStore(store);
}

export function getDividend(mint: string): DividendEntry | null {
  return readStore()[mint] ?? null;
}

export function getAllDividends(): Array<{ mint: string } & DividendEntry> {
  return Object.entries(readStore()).map(([mint, entry]) => ({ mint, ...entry }));
}

/** Call after a successful distribution to clear the accumulator. */
export function recordDistribution(mint: string, lamportsDistributed: number): void {
  const store = readStore();
  if (!store[mint]) return;
  store[mint].accumulated     -= lamportsDistributed;
  store[mint].lastDistributed  = Date.now();
  store[mint].totalDistributed += lamportsDistributed;
  writeStore(store);
}
