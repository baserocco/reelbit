"use client";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export const USDC_UNIT = 1_000_000; // 1 USDC in micro-units

export interface BalanceEntry {
  playable:            number;
  bonus:               number;
  wageringRequired:    number;
  wageringCompleted:   number;
  welcomeBonusClaimed: boolean;
}

export function formatUsdc(usdcUnits: number): string {
  return `$${(usdcUnits / USDC_UNIT).toFixed(2)}`;
}

export async function fetchBalance(wallet: string): Promise<BalanceEntry> {
  const res = await fetch(`${API}/balance/${wallet}`);
  if (!res.ok) return { playable: 0, bonus: 0, wageringRequired: 0, wageringCompleted: 0, welcomeBonusClaimed: false };
  return res.json();
}

export async function fetchSolPrice(): Promise<number> {
  const res = await fetch(`${API}/sol-price`);
  if (!res.ok) return 150;
  const data = await res.json();
  return data.price ?? 150;
}

/**
 * Confirm a SOL → USDC deposit.
 * The house wallet received SOL, swapped to USDC, and credits internal balance.
 */
export async function confirmDeposit(
  txSignature: string,
  wallet: string,
): Promise<{ balance: number; deposited: number; bonus: number; bonusClaimed: boolean }> {
  const res = await fetch(`${API}/deposit/confirm`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ txSignature, wallet }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Deposit failed");
  return data;
}

export async function requestWithdraw(
  wallet: string,
  usdcUnits: number,
  destination?: string,
): Promise<{ txSignature: string; balance: number; withdrawalFee: number }> {
  const res = await fetch(`${API}/withdraw`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ wallet, usdcUnits, destination: destination ?? wallet }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Withdrawal failed");
  return data;
}

export async function requestTransfer(
  from: string,
  toUserId: string,
  usdcUnits: number,
): Promise<{ balance: number; transferred: number; transferFee: number; recipient: { userId: string; username: string } }> {
  const res = await fetch(`${API}/transfer`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ from, toUserId, usdcUnits }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Transfer failed");
  return data;
}

export async function fetchHouseWallet(): Promise<string> {
  const res = await fetch(`${API}/house-wallet`);
  if (!res.ok) return "";
  const data = await res.json();
  return data.address ?? "";
}
