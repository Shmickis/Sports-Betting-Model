import { describe, expect, it } from "vitest";
import {
  americanToDecimal,
  breakEvenProb,
  classifyOpportunity,
  clvPp,
  edgeFromProb,
  potentialProfit,
  roi,
  unitsFromStake,
  brierScore,
  logLoss,
  labelClv,
  officialPlayGate,
  findDuplicateCandidates,
  separateRisked,
  isCashPromotion,
} from "./calcs";

describe("betting calcs", () => {
  it("converts American odds", () => {
    expect(americanToDecimal(-110)).toBeCloseTo(1.909, 3);
    expect(americanToDecimal(100)).toBeCloseTo(2, 5);
  });

  it("computes break-even and profit", () => {
    expect(breakEvenProb(-110)).toBeCloseTo(0.5238, 3);
    expect(potentialProfit(10, -110)).toBeCloseTo(9.0909, 3);
    expect(potentialProfit(10, 150)).toBeCloseTo(15, 5);
  });

  it("units and roi", () => {
    expect(unitsFromStake(25, 10)).toBe(2.5);
    expect(roi(7.02, 230)).toBeCloseTo(0.0305, 3);
    expect(roi(5, 0)).toBeNull();
  });

  it("edge and CLV", () => {
    expect(edgeFromProb(0.55, -110)).toBeCloseTo(0.0262, 3);
    expect(clvPp(-120, -110)).toBeCloseTo(2.1645, 2);
  });

  it("returns INSUFFICIENT DATA without probability", () => {
    const r = classifyOpportunity({ american: -110 });
    expect(r.classification).toBe("INSUFFICIENT DATA");
  });

  it("classifies PLAY when edge clears 2x floor without uncertainty", () => {
    const r = classifyOpportunity({
      american: 100,
      trueProb: 0.58,
      edgeFloor: 0.03,
    });
    expect(r.classification).toBe("PLAY");
  });

  it("scores calibration helpers", () => {
    expect(brierScore(0.7, 1)).toBeCloseTo(0.09, 5);
    expect(logLoss(0.7, 1)).toBeGreaterThan(0);
  });
});

describe("integrity helpers", () => {
  it("labels CLV without inventing closes", () => {
    expect(labelClv({ entryAmerican: -110 }).label).toBe("unconfirmed");
    expect(
      labelClv({
        entryAmerican: -120,
        closeAmerican: -110,
        exactClose: true,
        sameBookMarket: true,
      }).label,
    ).toBe("positive");
    expect(
      labelClv({
        entryAmerican: -110,
        closeAmerican: -120,
        exactClose: false,
        sameBookMarket: true,
      }).label,
    ).toBe("directional_only");
  });

  it("enforces Official Play Gate", () => {
    const fail = officialPlayGate({
      hasTrueLineProb: false,
      hasExecutableOdds: true,
      hasTimestamp: true,
      edge: 0.05,
      edgeSurvivesUncertainty: true,
      uncertaintyEvaluated: true,
      priceSatisfiesThreshold: true,
    });
    expect(fail.pass).toBe(false);
    const ok = officialPlayGate({
      hasTrueLineProb: true,
      hasExecutableOdds: true,
      hasTimestamp: true,
      edge: 0.05,
      edgeSurvivesUncertainty: true,
      uncertaintyEvaluated: true,
      priceSatisfiesThreshold: true,
    });
    expect(ok.pass).toBe(true);
  });

  it("separates cash and promo risk", () => {
    expect(isCashPromotion("cash")).toBe(true);
    expect(isCashPromotion("boost")).toBe(false);
    const sep = separateRisked([
      { stakeUsd: 10, promotionType: "cash", result: "win" },
      { stakeUsd: 10, bonusAmount: 10, promotionType: "freebet", result: "loss" },
    ]);
    expect(sep.cashRisked).toBe(10);
    expect(sep.promoRisked).toBe(10);
  });

  it("detects duplicate candidates", () => {
    const dups = findDuplicateCandidates(
      [
        {
          event: "DET@BUF",
          selection: "Under 53.5",
          line: 53.5,
          entryOdds: -105,
          sportsbook: "FanDuel",
          placedAt: "2026-09-15",
        },
      ],
      {
        event: "DET@BUF",
        selection: "Under 53.5",
        line: 53.5,
        entryOdds: -105,
        sportsbook: "FanDuel",
        placedAt: "2026-09-15T05:00:00Z",
      },
    );
    expect(dups).toHaveLength(1);
  });
});
