import { desc, eq } from "drizzle-orm";
import { getDb } from "./db/client";
import { ensureSeeded } from "./db/seed";
import {
  settings,
  wagers,
  opportunities,
  alerts,
  modelVersions,
  clvCheckpoints,
  dailyBriefs,
  researchNotes,
  auditLogs,
  classificationHistory,
  integrations,
  sportsbookBalances,
  bankrollTransactions,
} from "./db/schema";
import {
  clvPp,
  labelClv,
  roi,
  separateRisked,
  findDuplicateCandidates,
} from "./calcs";

export type WagerFilters = {
  officialOnly?: boolean;
  portfolio?: string;
  result?: string;
  sport?: string;
  league?: string;
  sportsbook?: string;
  classification?: string;
  promotionType?: string;
  dateFrom?: string;
  dateTo?: string;
};

export function getUnitUsd() {
  ensureSeeded();
  const row = getDb().select().from(settings).get();
  return row?.unitUsd ?? 10;
}

export function getSettings() {
  ensureSeeded();
  return getDb().select().from(settings).get()!;
}

export function updateSettings(patch: {
  unitUsd?: number;
  timezone?: string;
  bankrollUsd?: number;
}) {
  ensureSeeded();
  const db = getDb();
  const current = db.select().from(settings).get()!;
  db.update(settings)
    .set({
      unitUsd: patch.unitUsd ?? current.unitUsd,
      timezone: patch.timezone ?? current.timezone,
      bankrollUsd: patch.bankrollUsd ?? current.bankrollUsd,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(settings.id, current.id))
    .run();
  return getSettings();
}

export function listWagers(filters?: WagerFilters) {
  ensureSeeded();
  let rows = getDb().select().from(wagers).all();
  if (filters?.officialOnly) {
    rows = rows.filter((w) => w.officialStatus === "official");
  }
  if (filters?.portfolio) {
    rows = rows.filter((w) => w.portfolio === filters.portfolio);
  }
  if (filters?.result) {
    rows = rows.filter((w) => w.result === filters.result);
  }
  if (filters?.sport) {
    rows = rows.filter((w) => w.sport === filters.sport);
  }
  if (filters?.league) {
    rows = rows.filter((w) => w.league === filters.league);
  }
  if (filters?.sportsbook) {
    rows = rows.filter((w) => w.sportsbook === filters.sportsbook);
  }
  if (filters?.classification) {
    rows = rows.filter((w) => w.classification === filters.classification);
  }
  if (filters?.promotionType) {
    if (filters.promotionType === "cash") {
      rows = rows.filter(
        (w) => !w.promotionType || w.promotionType === "none" || w.promotionType === "cash",
      );
    } else {
      rows = rows.filter((w) => w.promotionType === filters.promotionType);
    }
  }
  if (filters?.dateFrom) {
    rows = rows.filter(
      (w) => (w.placedAt || w.eventDate || "") >= filters.dateFrom!,
    );
  }
  if (filters?.dateTo) {
    rows = rows.filter(
      (w) => (w.placedAt || w.eventDate || "").slice(0, 10) <= filters.dateTo!,
    );
  }
  return rows.sort((a, b) =>
    (b.placedAt || b.createdAt).localeCompare(a.placedAt || a.createdAt),
  );
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

export function dashboardSummary(filters?: WagerFilters) {
  ensureSeeded();
  const s = getSettings();
  const all = listWagers(filters);
  const official = all.filter((w) => w.officialStatus === "official");
  const nonOfficial = all.filter((w) => w.officialStatus !== "official");
  const settledOfficial = official.filter(
    (w) => w.result === "win" || w.result === "loss",
  );
  const settledNon = nonOfficial.filter(
    (w) => w.result === "win" || w.result === "loss",
  );
  const open = all.filter((w) => w.result === "open");
  const awaiting = all.filter((w) => !w.result || w.result === "pending");

  const officialCash = settledOfficial.filter(
    (w) => !w.promotionType || w.promotionType === "none" || w.promotionType === "cash",
  );
  const officialPnl = officialCash.reduce((a, w) => a + (w.pnlUsd ?? 0), 0);
  const { cashRisked: officialRisked } = separateRisked(officialCash);
  const nonPnl = settledNon.reduce((a, w) => a + (w.pnlUsd ?? 0), 0);
  const nonRisked = settledNon.reduce((a, w) => a + w.stakeUsd, 0);
  const wins = settledOfficial.filter((w) => w.result === "win").length;
  const losses = settledOfficial.filter((w) => w.result === "loss").length;
  const nonWins = settledNon.filter((w) => w.result === "win").length;
  const nonLosses = settledNon.filter((w) => w.result === "loss").length;

  const confirmedClvRows = all.filter((w) => w.clvStatus === "confirmed");
  let confirmedAvgClv: number | null = null;
  if (confirmedClvRows.length > 0) {
    const pps: number[] = [];
    for (const w of confirmedClvRows) {
      if (w.entryOdds != null && w.closingOdds != null) {
        pps.push(clvPp(w.entryOdds, w.closingOdds));
      }
    }
    confirmedAvgClv =
      pps.length === 0 ? null : pps.reduce((a, b) => a + b, 0) / pps.length;
  }

  const today = todayKey();
  const todays = all.filter(
    (w) => (w.placedAt || w.eventDate || "").slice(0, 10) === today,
  );
  const todaysPlays = todays.filter(
    (w) => w.classification === "PLAY" || w.officialStatus === "official",
  ).length;
  const todaysLeans = todays.filter((w) =>
    w.classification.toUpperCase().includes("LEAN"),
  ).length;
  const todaysPass = todays.filter((w) =>
    w.classification.toUpperCase().includes("PASS"),
  ).length;

  const model = getDb()
    .select()
    .from(modelVersions)
    .orderBy(desc(modelVersions.id))
    .get();

  const recentAlerts = getDb().select().from(alerts).all().slice(0, 8);
  const edgeWatch = getDb().select().from(opportunities).all();

  return {
    settings: s,
    model,
    bankroll: s.bankrollUsd,
    unitUsd: s.unitUsd,
    official: {
      record: `${wins}-${losses}`,
      pnl: officialPnl,
      risked: officialRisked,
      roi: roi(officialPnl, officialRisked),
      settled: settledOfficial.length,
      maturity: settledOfficial.length < 50 ? "TOO EARLY" : "MATURING",
    },
    nonOfficial: {
      record: `${nonWins}-${nonLosses}`,
      pnl: nonPnl,
      risked: nonRisked,
      roi: roi(nonPnl, nonRisked),
    },
    openCount: open.length,
    awaitingCount: awaiting.length,
    confirmedAvgClv,
    confirmedClvCount: confirmedClvRows.length,
    today: { plays: todaysPlays, leans: todaysLeans, passes: todaysPass },
    recent: all.slice(0, 12),
    alerts: recentAlerts,
    edgeWatchCount: edgeWatch.length,
    dataMode: s.dataMode,
    filterOptions: {
      sports: [...new Set(listWagers().map((w) => w.sport).filter(Boolean))],
      books: [
        ...new Set(
          listWagers()
            .map((w) => w.sportsbook)
            .filter(Boolean) as string[],
        ),
      ],
      classes: [
        ...new Set(listWagers().map((w) => w.classification).filter(Boolean)),
      ],
    },
  };
}

export function listOpportunities() {
  ensureSeeded();
  return getDb()
    .select()
    .from(opportunities)
    .all()
    .sort((a, b) => b.lastUpdated.localeCompare(a.lastUpdated));
}

export function getOpportunityHistory(opportunityId: string) {
  ensureSeeded();
  return getDb()
    .select()
    .from(classificationHistory)
    .all()
    .filter((h) => h.opportunityId === opportunityId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function createOpportunity(input: {
  sport: string;
  league?: string;
  event: string;
  startTime?: string;
  market: string;
  selection: string;
  line?: number | null;
  sportsbook?: string;
  currentOdds?: number | null;
  truelineProb?: string;
  estimatedEdge?: number | null;
  classification?: string;
  status?: string;
  supportingFactors?: string;
  risks?: string;
  requiredPrice?: string;
  playableTo?: string;
  confidence?: string;
}) {
  ensureSeeded();
  const now = new Date().toISOString();
  const id = `opp-${Date.now()}`;
  const db = getDb();
  const classification = input.classification || "LEAN";
  db.insert(opportunities)
    .values({
      id,
      sport: input.sport,
      league: input.league || null,
      event: input.event,
      startTime: input.startTime || null,
      market: input.market,
      selection: input.selection,
      line: input.line ?? null,
      sportsbook: input.sportsbook || null,
      currentOdds: input.currentOdds ?? null,
      marketTimestamp: now,
      breakEvenProb: null,
      truelineProb: input.truelineProb || null,
      estimatedEdge: input.estimatedEdge ?? null,
      classification,
      confidence: input.confidence || null,
      status: input.status || "New",
      supportingFactors: input.supportingFactors || null,
      risks: input.risks || null,
      requiredPrice: input.requiredPrice || "Not recorded",
      playableTo: input.playableTo || "Not recorded",
      dataSourceStatus: "Manual data mode",
      lastUpdated: now,
    })
    .run();
  db.insert(classificationHistory)
    .values({
      opportunityId: id,
      classification,
      odds: input.currentOdds ?? null,
      note: "Created",
      createdAt: now,
    })
    .run();
  return id;
}

export function updateOpportunityClassification(
  id: string,
  classification: string,
  odds?: number | null,
  note?: string,
  status?: string,
) {
  ensureSeeded();
  const db = getDb();
  const row = db.select().from(opportunities).where(eq(opportunities.id, id)).get();
  if (!row) throw new Error("Opportunity not found");
  const now = new Date().toISOString();
  const prev = row.classification;
  db.update(opportunities)
    .set({
      classification,
      status: status || row.status,
      currentOdds: odds ?? row.currentOdds,
      lastUpdated: now,
    })
    .where(eq(opportunities.id, id))
    .run();
  db.insert(classificationHistory)
    .values({
      opportunityId: id,
      classification,
      odds: odds ?? row.currentOdds,
      note: note || `${prev} → ${classification}`,
      createdAt: now,
    })
    .run();

  if (classification === "PLAY" && prev !== "PLAY") {
    db.insert(alerts)
      .values({
        id: `alert-${Date.now()}`,
        kind: prev.includes("LEAN") ? "lean_to_play" : "new_play",
        title: prev.includes("LEAN") ? "LEAN becoming PLAY" : "New PLAY",
        body: `${row.selection} on ${row.event}`,
        createdAt: now,
        read: 0,
      })
      .run();
  }
  if (prev === "PLAY" && classification === "PASS") {
    db.insert(alerts)
      .values({
        id: `alert-${Date.now()}`,
        kind: "play_to_pass",
        title: "PLAY becoming PASS before execution",
        body: `${row.selection} on ${row.event}`,
        createdAt: now,
        read: 0,
      })
      .run();
  }
}

export function listClvBoard() {
  ensureSeeded();
  const all = listWagers();
  const checkpoints = getDb().select().from(clvCheckpoints).all();
  return all.map((w) => {
    const cps = checkpoints.filter((c) => c.wagerId === w.id);
    const close = cps.find((c) => c.checkpoint === "close");
    const labeled = labelClv({
      entryAmerican: w.entryOdds,
      closeAmerican: close?.oddsAmerican ?? w.closingOdds,
      exactClose: Boolean(close) || w.clvStatus === "confirmed",
      sameBookMarket: close ? close.sameBookMarket === 1 : true,
    });
    return { wager: w, checkpoints: cps, clv: labeled };
  });
}

export function upsertClvCheckpoint(input: {
  wagerId: string;
  checkpoint: string;
  oddsAmerican?: number | null;
  sportsbook?: string;
  sameBookMarket?: boolean;
  note?: string;
}) {
  ensureSeeded();
  const db = getDb();
  const now = new Date().toISOString();
  const id = `clv-${input.wagerId}-${input.checkpoint}`;
  const existing = db
    .select()
    .from(clvCheckpoints)
    .where(eq(clvCheckpoints.id, id))
    .get();
  if (existing) {
    db.update(clvCheckpoints)
      .set({
        oddsAmerican: input.oddsAmerican ?? null,
        sportsbook: input.sportsbook || null,
        sameBookMarket: input.sameBookMarket === false ? 0 : 1,
        note: input.note || null,
        recordedAt: now,
      })
      .where(eq(clvCheckpoints.id, id))
      .run();
  } else {
    db.insert(clvCheckpoints)
      .values({
        id,
        wagerId: input.wagerId,
        checkpoint: input.checkpoint,
        oddsAmerican: input.oddsAmerican ?? null,
        sportsbook: input.sportsbook || null,
        sameBookMarket: input.sameBookMarket === false ? 0 : 1,
        note: input.note || null,
        recordedAt: now,
      })
      .run();
  }

  if (input.checkpoint === "close" && input.oddsAmerican != null) {
    const wager = db.select().from(wagers).where(eq(wagers.id, input.wagerId)).get();
    if (wager?.entryOdds != null) {
      const labeled = labelClv({
        entryAmerican: wager.entryOdds,
        closeAmerican: input.oddsAmerican,
        exactClose: true,
        sameBookMarket: input.sameBookMarket !== false,
      });
      db.update(wagers)
        .set({
          closingOdds: input.oddsAmerican,
          clvStatus:
            labeled.label === "unconfirmed" || labeled.label === "not_available"
              ? "unconfirmed"
              : labeled.label === "directional_only"
                ? "directional"
                : "confirmed",
          clvNote: `${labeled.note}${labeled.pp != null ? ` (${labeled.pp.toFixed(2)} pp)` : ""}`,
          updatedAt: now,
        })
        .where(eq(wagers.id, input.wagerId))
        .run();
    }
  }
}

export function listBriefs(date?: string) {
  ensureSeeded();
  const d = date || todayKey();
  return getDb()
    .select()
    .from(dailyBriefs)
    .all()
    .filter((b) => b.briefDate === d);
}

export function saveBrief(slot: string, content: string, briefDate?: string) {
  ensureSeeded();
  const now = new Date().toISOString();
  const date = briefDate || todayKey();
  const id = `brief-${date}-${slot}`;
  const db = getDb();
  const existing = db.select().from(dailyBriefs).where(eq(dailyBriefs.id, id)).get();
  if (existing) {
    db.update(dailyBriefs)
      .set({ content, createdAt: now })
      .where(eq(dailyBriefs.id, id))
      .run();
  } else {
    db.insert(dailyBriefs)
      .values({ id, slot, briefDate: date, content, createdAt: now })
      .run();
  }
}

export function listResearch() {
  ensureSeeded();
  return getDb()
    .select()
    .from(researchNotes)
    .all()
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function saveResearchNote(input: {
  title: string;
  body: string;
  modelVersion?: string;
  robustFlag?: boolean;
}) {
  ensureSeeded();
  const id = `research-${Date.now()}`;
  getDb()
    .insert(researchNotes)
    .values({
      id,
      title: input.title,
      body: input.body,
      modelVersion: input.modelVersion || null,
      robustFlag: input.robustFlag ? 1 : 0,
      createdAt: new Date().toISOString(),
    })
    .run();
  return id;
}

export function correctWager(input: {
  wagerId: string;
  field: string;
  value: string;
  reason: string;
}) {
  ensureSeeded();
  const db = getDb();
  const row = db.select().from(wagers).where(eq(wagers.id, input.wagerId)).get();
  if (!row) throw new Error("Wager not found");
  const allowed = [
    "result",
    "pnlUsd",
    "notes",
    "closingOdds",
    "clvStatus",
    "clvNote",
    "sportsbook",
    "entryOdds",
    "baseOdds",
    "promoOdds",
  ] as const;
  if (!allowed.includes(input.field as (typeof allowed)[number])) {
    throw new Error("Field not correctable");
  }
  const prev = String((row as Record<string, unknown>)[input.field] ?? "");
  const patch: Record<string, unknown> = {
    updatedAt: new Date().toISOString(),
  };
  if (["pnlUsd"].includes(input.field)) patch[input.field] = Number(input.value);
  else if (["closingOdds", "entryOdds", "baseOdds", "promoOdds"].includes(input.field)) {
    patch[input.field] = Number(input.value);
  } else patch[input.field] = input.value;

  db.update(wagers)
    .set(patch)
    .where(eq(wagers.id, input.wagerId))
    .run();
  db.insert(auditLogs)
    .values({
      wagerId: input.wagerId,
      field: input.field,
      previousValue: prev,
      correctedValue: input.value,
      reason: input.reason,
      createdAt: new Date().toISOString(),
    })
    .run();
}

export function listAudit(wagerId?: string) {
  ensureSeeded();
  const rows = getDb().select().from(auditLogs).all();
  return (wagerId ? rows.filter((r) => r.wagerId === wagerId) : rows).sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt),
  );
}

export function ensureIntegrations() {
  ensureSeeded();
  const db = getDb();
  const now = new Date().toISOString();
  const defaults = [
    { id: "int-odds", name: "Live odds API", kind: "odds" },
    { id: "int-results", name: "Sports results API", kind: "results" },
    { id: "int-injury", name: "Injury/lineup data", kind: "injury" },
    { id: "int-weather", name: "Weather API", kind: "weather" },
    { id: "int-auth", name: "Auth / cloud database", kind: "auth" },
  ];
  for (const d of defaults) {
    const exists = db.select().from(integrations).where(eq(integrations.id, d.id)).get();
    if (!exists) {
      db.insert(integrations)
        .values({
          ...d,
          status: "disconnected",
          lastSuccessAt: null,
          lastError: null,
          freshnessNote: "Not connected — manual workflows remain active",
          updatedAt: now,
        })
        .run();
    }
  }
  return db.select().from(integrations).all();
}

export function listSportsbookBalances() {
  ensureSeeded();
  return getDb().select().from(sportsbookBalances).all();
}

export function previewImportWagers(
  candidates: {
    event?: string;
    selection: string;
    line?: number | null;
    entryOdds?: number | null;
    sportsbook?: string;
    placedAt?: string;
    stakeUsd: number;
    classification: string;
    sport: string;
  }[],
) {
  ensureSeeded();
  const existing = listWagers();
  return candidates.map((c, i) => ({
    index: i,
    candidate: c,
    duplicates: findDuplicateCandidates(existing, c),
  }));
}

export function exportWagersJson() {
  ensureSeeded();
  return {
    exportedAt: new Date().toISOString(),
    settings: getSettings(),
    wagers: listWagers(),
    opportunities: listOpportunities(),
    briefs: getDb().select().from(dailyBriefs).all(),
    research: listResearch(),
    bankroll: getDb().select().from(bankrollTransactions).all(),
    clv: getDb().select().from(clvCheckpoints).all(),
  };
}

export function exportWagersCsv() {
  const rows = listWagers();
  const headers = [
    "id",
    "placedAt",
    "sport",
    "event",
    "marketType",
    "selection",
    "line",
    "sportsbook",
    "entryOdds",
    "stakeUsd",
    "classification",
    "officialStatus",
    "result",
    "pnlUsd",
    "clvStatus",
    "promotionType",
  ];
  const lines = [headers.join(",")];
  for (const w of rows) {
    lines.push(
      headers
        .map((h) => {
          const v = (w as Record<string, unknown>)[h];
          const s = v == null ? "" : String(v);
          return s.includes(",") ? `"${s.replace(/"/g, '""')}"` : s;
        })
        .join(","),
    );
  }
  return lines.join("\n");
}
