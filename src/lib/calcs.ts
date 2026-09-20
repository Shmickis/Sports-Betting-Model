/** Pure betting math — never invent missing inputs. */

export function americanToDecimal(american: number): number {
  if (american === 0) throw new Error("American odds cannot be 0");
  return american > 0 ? 1 + american / 100 : 1 + 100 / Math.abs(american);
}

export function breakEvenProb(american: number): number {
  const dec = americanToDecimal(american);
  return 1 / dec;
}

export function potentialProfit(stakeUsd: number, american: number): number {
  if (american > 0) return (stakeUsd * american) / 100;
  return (stakeUsd * 100) / Math.abs(american);
}

export function potentialPayout(stakeUsd: number, american: number): number {
  return stakeUsd + potentialProfit(stakeUsd, american);
}

export function unitsFromStake(stakeUsd: number, unitUsd: number): number {
  if (unitUsd <= 0) throw new Error("Unit size must be positive");
  return stakeUsd / unitUsd;
}

export function roi(pnlUsd: number, riskedUsd: number): number | null {
  if (riskedUsd <= 0) return null;
  return pnlUsd / riskedUsd;
}

export function edgeFromProb(
  trueProb: number,
  american: number,
): number | null {
  if (trueProb < 0 || trueProb > 1) return null;
  return trueProb - breakEvenProb(american);
}

export function edgeRange(
  lowProb: number,
  highProb: number,
  american: number,
): { low: number; high: number } | null {
  if (lowProb < 0 || highProb > 1 || lowProb > highProb) return null;
  const be = breakEvenProb(american);
  return { low: lowProb - be, high: highProb - be };
}

/** Probability-based CLV in percentage points (entry vs close). */
export function clvPp(
  entryAmerican: number,
  closeAmerican: number,
): number {
  return (breakEvenProb(entryAmerican) - breakEvenProb(closeAmerican)) * 100;
}

export function brierScore(prob: number, outcome: 0 | 1): number {
  return (prob - outcome) ** 2;
}

export function logLoss(prob: number, outcome: 0 | 1): number {
  const p = Math.min(Math.max(prob, 1e-12), 1 - 1e-12);
  return outcome === 1 ? -Math.log(p) : -Math.log(1 - p);
}

export type UncertaintyFlags = {
  injury?: boolean;
  lineup?: boolean;
  starter?: boolean;
  role?: boolean;
  workload?: boolean;
  weather?: boolean;
  liquidity?: boolean;
  dataQuality?: boolean;
};

export type Classification =
  | "PLAY"
  | "STRONG LEAN"
  | "LEAN"
  | "PASS"
  | "NO BET"
  | "Independent"
  | "Research/Hypothetical"
  | "INSUFFICIENT DATA";

export function classifyOpportunity(input: {
  trueProb?: number | null;
  probLow?: number | null;
  probHigh?: number | null;
  american?: number | null;
  edgeFloor?: number;
  uncertainty?: UncertaintyFlags;
  edgeSurvivesUncertainty?: boolean | null;
}): {
  classification: Classification;
  breakEven: number | null;
  edge: number | null;
  edgeRange: { low: number; high: number } | null;
  reasons: string[];
} {
  const reasons: string[] = [];
  const floor = input.edgeFloor ?? 0.03;

  if (input.american == null) {
    return {
      classification: "INSUFFICIENT DATA",
      breakEven: null,
      edge: null,
      edgeRange: null,
      reasons: ["Executable odds not recorded"],
    };
  }

  const breakEven = breakEvenProb(input.american);
  let edge: number | null = null;
  let range: { low: number; high: number } | null = null;

  if (input.trueProb != null) {
    edge = edgeFromProb(input.trueProb, input.american);
  } else if (input.probLow != null && input.probHigh != null) {
    range = edgeRange(input.probLow, input.probHigh, input.american);
    edge = range ? (range.low + range.high) / 2 : null;
  } else {
    return {
      classification: "INSUFFICIENT DATA",
      breakEven,
      edge: null,
      edgeRange: null,
      reasons: ["No TrueLine probability or justified range supplied"],
    };
  }

  const uncertaintyCount = Object.values(input.uncertainty ?? {}).filter(Boolean)
    .length;
  if (uncertaintyCount > 0) {
    reasons.push(`${uncertaintyCount} uncertainty flag(s) present`);
  }

  if (edge == null) {
    return {
      classification: "INSUFFICIENT DATA",
      breakEven,
      edge,
      edgeRange: range,
      reasons: [...reasons, "Edge could not be calculated"],
    };
  }

  if (input.edgeSurvivesUncertainty === false) {
    reasons.push("Edge does not survive uncertainty at executable price");
    return {
      classification: "PASS",
      breakEven,
      edge,
      edgeRange: range,
      reasons,
    };
  }

  if (edge < floor) {
    reasons.push(`Edge ${edge.toFixed(3)} below floor ${floor}`);
    return {
      classification: edge > 0 ? "LEAN" : "PASS",
      breakEven,
      edge,
      edgeRange: range,
      reasons,
    };
  }

  if (edge >= floor * 2 && uncertaintyCount === 0) {
    reasons.push("Edge clears 2x floor with no uncertainty flags");
    return {
      classification: "PLAY",
      breakEven,
      edge,
      edgeRange: range,
      reasons,
    };
  }

  if (edge >= floor * 1.5) {
    reasons.push("Edge clears 1.5x floor");
    return {
      classification: "STRONG LEAN",
      breakEven,
      edge,
      edgeRange: range,
      reasons,
    };
  }

  reasons.push("Edge clears floor with residual uncertainty or modest size");
  return {
    classification: "LEAN",
    breakEven,
    edge,
    edgeRange: range,
    reasons,
  };
}

export function unknownLabel(value: unknown, fallback = "Not recorded"): string {
  if (value === null || value === undefined || value === "") return fallback;
  return String(value);
}

export type ClvLabel =
  | "positive"
  | "negative"
  | "flat"
  | "directional_only"
  | "unconfirmed"
  | "not_available";

export function labelClv(input: {
  entryAmerican?: number | null;
  closeAmerican?: number | null;
  exactClose?: boolean;
  sameBookMarket?: boolean;
}): { label: ClvLabel; pp: number | null; note: string } {
  if (input.entryAmerican == null || input.closeAmerican == null) {
    return {
      label: "unconfirmed",
      pp: null,
      note: "Closing or near-close reference not recorded",
    };
  }
  if (!input.sameBookMarket) {
    const pp = clvPp(input.entryAmerican, input.closeAmerican);
    return {
      label: "directional_only",
      pp,
      note: "Comparison uses a different book or related market",
    };
  }
  if (!input.exactClose) {
    const pp = clvPp(input.entryAmerican, input.closeAmerican);
    return {
      label: "directional_only",
      pp,
      note: "Near-start reference only — not an exact close",
    };
  }
  const pp = clvPp(input.entryAmerican, input.closeAmerican);
  if (Math.abs(pp) < 0.05) {
    return { label: "flat", pp, note: "Confirmed flat CLV" };
  }
  return {
    label: pp > 0 ? "positive" : "negative",
    pp,
    note: "Confirmed same-book/market CLV",
  };
}

export function isCashPromotion(type: string | null | undefined): boolean {
  return !type || type === "none" || type === "cash";
}

export function separateRisked(wagers: {
  stakeUsd: number;
  cashAmount?: number | null;
  bonusAmount?: number | null;
  promotionType?: string | null;
  result?: string | null;
}[]) {
  let cashRisked = 0;
  let promoRisked = 0;
  for (const w of wagers) {
    if (w.result !== "win" && w.result !== "loss") continue;
    if (isCashPromotion(w.promotionType)) {
      cashRisked += w.cashAmount ?? w.stakeUsd;
    } else {
      promoRisked += w.bonusAmount ?? w.stakeUsd;
    }
  }
  return { cashRisked, promoRisked };
}

export function officialPlayGate(input: {
  hasTrueLineProb: boolean;
  hasExecutableOdds: boolean;
  hasTimestamp: boolean;
  edge: number | null;
  edgeSurvivesUncertainty: boolean;
  uncertaintyEvaluated: boolean;
  priceSatisfiesThreshold: boolean;
}): { pass: boolean; failures: string[] } {
  const failures: string[] = [];
  if (!input.hasTrueLineProb) failures.push("TrueLine probability/range missing");
  if (!input.hasExecutableOdds) failures.push("Executable odds missing");
  if (!input.hasTimestamp) failures.push("Executable timestamp missing");
  if (input.edge == null) failures.push("Estimated edge not explicit");
  if (!input.uncertaintyEvaluated) failures.push("Uncertainty not evaluated");
  if (!input.edgeSurvivesUncertainty) failures.push("Edge does not survive uncertainty");
  if (!input.priceSatisfiesThreshold) failures.push("Price fails playable threshold");
  return { pass: failures.length === 0, failures };
}

export function findDuplicateCandidates(
  existing: {
    event?: string | null;
    selection: string;
    line?: number | null;
    entryOdds?: number | null;
    sportsbook?: string | null;
    placedAt?: string | null;
  }[],
  candidate: {
    event?: string | null;
    selection: string;
    line?: number | null;
    entryOdds?: number | null;
    sportsbook?: string | null;
    placedAt?: string | null;
  },
) {
  return existing.filter((w) => {
    const sameEvent = (w.event || "") === (candidate.event || "");
    const sameSel = w.selection === candidate.selection;
    const sameLine =
      (w.line ?? null) === (candidate.line ?? null) ||
      (w.line == null && candidate.line == null);
    const sameOdds = (w.entryOdds ?? null) === (candidate.entryOdds ?? null);
    const sameBook = (w.sportsbook || "") === (candidate.sportsbook || "");
    const sameDay =
      (w.placedAt || "").slice(0, 10) === (candidate.placedAt || "").slice(0, 10);
    return sameEvent && sameSel && sameLine && sameOdds && sameBook && sameDay;
  });
}
