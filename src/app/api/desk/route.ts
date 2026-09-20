import { NextResponse } from "next/server";
import {
  correctWager,
  createOpportunity,
  exportWagersCsv,
  exportWagersJson,
  previewImportWagers,
  saveBrief,
  saveResearchNote,
  updateOpportunityClassification,
  upsertClvCheckpoint,
  listWagers,
  getUnitUsd,
} from "@/lib/queries";
import { getDb } from "@/lib/db/client";
import { ensureSeeded } from "@/lib/db/seed";
import { wagers } from "@/lib/db/schema";
import {
  breakEvenProb,
  potentialPayout,
  unitsFromStake,
} from "@/lib/calcs";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const format = searchParams.get("format") || "json";
  if (format === "csv") {
    return new NextResponse(exportWagersCsv(), {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": 'attachment; filename="trueline-ledger.csv"',
      },
    });
  }
  return NextResponse.json(exportWagersJson());
}

export async function POST(request: Request) {
  try {
    ensureSeeded();
    const body = await request.json();
    const action = body?.action;

    if (action === "correct") {
      correctWager(body);
      return NextResponse.json({ ok: true });
    }
    if (action === "clv") {
      upsertClvCheckpoint(body);
      return NextResponse.json({ ok: true });
    }
    if (action === "brief") {
      saveBrief(body.slot, body.content, body.briefDate);
      return NextResponse.json({ ok: true });
    }
    if (action === "research") {
      const id = saveResearchNote(body);
      return NextResponse.json({ ok: true, id });
    }
    if (action === "opportunity") {
      const id = createOpportunity(body);
      return NextResponse.json({ ok: true, id });
    }
    if (action === "opportunity_class") {
      updateOpportunityClassification(
        body.id,
        body.classification,
        body.odds,
        body.note,
        body.status,
      );
      return NextResponse.json({ ok: true });
    }
    if (action === "import_preview") {
      return NextResponse.json({
        preview: previewImportWagers(body.candidates || []),
      });
    }
    if (action === "import_commit") {
      const unit = getUnitUsd();
      const now = new Date().toISOString();
      const db = getDb();
      const existing = listWagers();
      let imported = 0;
      let skipped = 0;
      for (const c of body.candidates || []) {
        const dups = previewImportWagers([c])[0]?.duplicates || [];
        if (dups.length && !body.allowDuplicates) {
          skipped += 1;
          continue;
        }
        db.insert(wagers)
          .values({
            id: `import-${Date.now()}-${imported}`,
            placedAt: c.placedAt || now,
            eventDate: (c.placedAt || now).slice(0, 10),
            sport: c.sport || "Unknown",
            event: c.event || null,
            marketType: c.marketType || null,
            selection: c.selection,
            line: c.line ?? null,
            sportsbook: c.sportsbook || null,
            entryOdds: c.entryOdds ?? null,
            stakeUsd: c.stakeUsd,
            stakeUnits: unitsFromStake(c.stakeUsd, unit),
            cashAmount: c.stakeUsd,
            promotionType: c.promotionType || "cash",
            classification: c.classification || "Independent",
            officialStatus: c.officialStatus || "non_official",
            breakEvenProb:
              c.entryOdds != null ? breakEvenProb(c.entryOdds) : null,
            potentialPayout:
              c.entryOdds != null
                ? potentialPayout(c.stakeUsd, c.entryOdds)
                : null,
            result: c.result || null,
            pnlUsd: c.pnlUsd ?? null,
            clvStatus: "unconfirmed",
            source: "csv_import",
            portfolio: c.portfolio || "Import",
            createdAt: now,
            updatedAt: now,
            notes: c.notes || `Import against ${existing.length} existing rows`,
          })
          .run();
        imported += 1;
      }
      return NextResponse.json({ ok: true, imported, skipped });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed" },
      { status: 400 },
    );
  }
}
