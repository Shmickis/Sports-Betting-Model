import { NextResponse } from "next/server";
import { getDb } from "@/lib/db/client";
import { ensureSeeded } from "@/lib/db/seed";
import { opportunities, researchNotes, wagers } from "@/lib/db/schema";
import { getUnitUsd } from "@/lib/queries";
import {
  breakEvenProb,
  potentialPayout,
  unitsFromStake,
} from "@/lib/calcs";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    ensureSeeded();
    const body = await request.json();
    const { kind, form, analysis } = body ?? {};
    if (!kind || !form) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const now = new Date().toISOString();
    const db = getDb();
    const unit = getUnitUsd();
    const american = Number(form.american);
    const stake = Number(form.stake);
    const line = form.line === "" ? null : Number(form.line);

    if (kind === "research" || kind === "pass") {
      const id = `research-${Date.now()}`;
      db.insert(researchNotes)
        .values({
          id,
          title: `${kind.toUpperCase()}: ${form.selection || form.event || "Untitled"}`,
          body: JSON.stringify({ form, analysis }, null, 2),
          createdAt: now,
          robustFlag: 0,
        })
        .run();
      return NextResponse.json({
        message:
          kind === "pass"
            ? "Marked PASS and saved to research notes"
            : "Saved as research note",
      });
    }

    if (kind === "edge") {
      const id = `opp-${Date.now()}`;
      db.insert(opportunities)
        .values({
          id,
          sport: form.sport || "Unknown",
          league: form.league || null,
          event: form.event || "Unknown event",
          startTime: form.eventTime || null,
          market: form.marketType || "Unknown",
          selection: form.selection || "Unknown",
          line: Number.isFinite(line) ? line : null,
          sportsbook: form.sportsbook || null,
          currentOdds: Number.isFinite(american) ? american : null,
          marketTimestamp: now,
          breakEvenProb: Number.isFinite(american)
            ? breakEvenProb(american)
            : null,
          truelineProb: form.trueProb || null,
          estimatedEdge: analysis?.decision?.edge ?? null,
          classification: analysis?.decision?.classification || "LEAN",
          status: "Monitoring",
          supportingFactors: form.notes || null,
          dataSourceStatus: "Manual data mode",
          lastUpdated: now,
        })
        .run();
      return NextResponse.json({ message: "Added to Edge Watch" });
    }

    if (kind === "executed") {
      const id = `exec-${Date.now()}`;
      const isOfficial =
        analysis?.decision?.classification === "PLAY" &&
        form.cashOrPromo === "cash";
      db.insert(wagers)
        .values({
          id,
          placedAt: now,
          eventDate: form.eventTime || now.slice(0, 10),
          sport: form.sport || "Unknown",
          league: form.league || null,
          event: form.event || null,
          marketType: form.marketType || null,
          selection: form.selection || "Unknown",
          line: Number.isFinite(line) ? line : null,
          sportsbook: form.sportsbook || null,
          entryOdds: Number.isFinite(american) ? american : null,
          stakeUsd: stake,
          stakeUnits: Number.isFinite(stake) ? unitsFromStake(stake, unit) : null,
          cashAmount: form.cashOrPromo === "cash" ? stake : 0,
          bonusAmount: form.cashOrPromo === "cash" ? 0 : stake,
          promotionType: form.cashOrPromo,
          timing: form.timing,
          classification: analysis?.decision?.classification || "Independent",
          officialStatus: isOfficial ? "official" : "non_official",
          truelineProb: form.trueProb || null,
          breakEvenProb: Number.isFinite(american)
            ? breakEvenProb(american)
            : null,
          estimatedEdge: analysis?.decision?.edge ?? null,
          result: "open",
          potentialPayout:
            Number.isFinite(american) && Number.isFinite(stake)
              ? potentialPayout(stake, american)
              : null,
          clvStatus: "unconfirmed",
          notes: form.notes || null,
          source: "analyzer",
          portfolio: isOfficial ? "Official PLAY" : "Independent",
          createdAt: now,
          updatedAt: now,
        })
        .run();
      return NextResponse.json({
        message: isOfficial
          ? "Recorded as Official PLAY candidate (cash + PLAY gate)"
          : "Recorded executed wager as non-Official",
      });
    }

    return NextResponse.json({ error: "Unknown kind" }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed" },
      { status: 500 },
    );
  }
}
