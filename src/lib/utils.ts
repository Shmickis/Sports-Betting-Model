import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function fmtMoney(n: number | null | undefined, signed = true) {
  if (n == null || Number.isNaN(n)) return "Not recorded";
  const sign = signed && n > 0 ? "+" : "";
  return `${sign}$${n.toFixed(2)}`;
}

export function fmtOdds(n: number | null | undefined) {
  if (n == null) return "Not recorded";
  return n > 0 ? `+${n}` : `${n}`;
}

export function fmtPct(n: number | null | undefined, digits = 1) {
  if (n == null || Number.isNaN(n)) return "Not recorded";
  return `${(n * 100).toFixed(digits)}%`;
}

export function fmtRoi(n: number | null | undefined) {
  if (n == null) return "Incomplete data";
  return `${(n * 100).toFixed(2)}%`;
}
