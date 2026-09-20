import fs from "fs";
import path from "path";
import { getDb } from "./client";
import {
  alerts,
  bankrollTransactions,
  integrations,
  modelVersions,
  opportunities,
  settings,
  wagers,
} from "./schema";
import { breakEvenProb, potentialPayout, unitsFromStake } from "../calcs";

type Official = {
  id: string;
  date: string;
  sport: string;
  event: string;
  market: string;
  side: string;
  line: number | null;
  book: string;
  odds: number;
  stake: number;
  result: "W" | "L";
  pnl: number;
  prob?: string;
  notes: string;
  quality: string;
};

type Paper = {
  id: string;
  timestamp: string;
  sport: string;
  event: string;
  market: string;
  side: string;
  line: number | null;
  odds: number;
  stake: number;
  source: string;
  result: string;
  pnl: number;
  edge: number;
  model: string;
  classification?: string;
};

function mapResult(r: string): string {
  const x = r.toLowerCase();
  if (x === "w" || x === "win") return "win";
  if (x === "l" || x === "loss") return "loss";
  if (x === "void") return "void";
  if (x === "not_bet") return "open";
  return r;
}

export function ensureSeeded() {
  const db = getDb();
  const existing = db.select().from(settings).all();
  if (existing.length > 0) return;

  const now = new Date().toISOString();
  const unit = 10;

  db.insert(settings)
    .values({
      unitUsd: unit,
      timezone: "America/Anchorage",
      bankrollUsd: 500,
      dataMode: "manual",
      updatedAt: now,
    })
    .run();

  db.insert(modelVersions)
    .values({
      version: "v0.4.2-sp",
      notes:
        "Official vs Independent never mixed for ROI. MISSING probabilities stay blank — never backfilled.",
      edgeFloor: 0.03,
      status: "live",
      createdAt: now,
    })
    .run();

  const officialPath = path.join(process.cwd(), "data", "official-plays.json");
  const paperPath = path.join(process.cwd(), "data", "paper-bets.json");
  const official = JSON.parse(fs.readFileSync(officialPath, "utf8")) as Official[];
  const paper = JSON.parse(fs.readFileSync(paperPath, "utf8")) as Paper[];

  for (const play of official) {
    const entryOdds = play.odds;
    db.insert(wagers)
      .values({
        id: `official-${play.id}`,
        placedAt: play.date,
        eventDate: play.date,
        sport: play.sport,
        league: play.sport,
        event: play.event || null,
        marketType: play.market,
        selection: play.side,
        line: play.line,
        sportsbook: play.book || null,
        entryOdds,
        stakeUsd: play.stake,
        stakeUnits: unitsFromStake(play.stake, unit),
        cashAmount: play.stake,
        promotionType: "none",
        classification: "PLAY",
        officialStatus: "official",
        truelineProb: play.prob || null,
        breakEvenProb: entryOdds ? breakEvenProb(entryOdds) : null,
        result: mapResult(play.result),
        pnlUsd: play.pnl,
        potentialPayout: potentialPayout(play.stake, entryOdds),
        clvStatus: "unconfirmed",
        notes: play.notes,
        dataQuality: play.quality,
        source: "drive-ledger",
        portfolio: "Official PLAY",
        createdAt: now,
        updatedAt: now,
      })
      .run();
  }

  for (const bet of paper) {
    const classification =
      bet.classification ||
      (bet.source === "paper" ? "Research/Hypothetical" : "Independent");
    db.insert(wagers)
      .values({
        id: `paper-${bet.id}`,
        placedAt: bet.timestamp,
        eventDate: bet.timestamp.slice(0, 10),
        sport: bet.sport,
        league: bet.sport,
        event: bet.event,
        marketType: bet.market,
        selection: bet.side,
        line: bet.line,
        sportsbook: "FanDuel",
        entryOdds: bet.odds,
        stakeUsd: bet.stake,
        stakeUnits: unitsFromStake(bet.stake, unit),
        cashAmount: bet.stake,
        classification,
        officialStatus: "non_official",
        estimatedEdge: bet.edge,
        breakEvenProb: breakEvenProb(bet.odds),
        result: mapResult(bet.result),
        pnlUsd: bet.result === "not_bet" ? null : bet.pnl,
        potentialPayout: potentialPayout(bet.stake, bet.odds),
        clvStatus: "unconfirmed",
        notes: null,
        source: bet.source,
        modelVersion: bet.model,
        portfolio: "Paper",
        createdAt: now,
        updatedAt: now,
      })
      .run();

    if (bet.result === "not_bet") {
      db.insert(opportunities)
        .values({
          id: `opp-${bet.id}`,
          sport: bet.sport,
          league: bet.sport,
          event: bet.event,
          market: bet.market,
          selection: bet.side,
          line: bet.line,
          sportsbook: "FanDuel",
          currentOdds: bet.odds,
          breakEvenProb: breakEvenProb(bet.odds),
          estimatedEdge: bet.edge,
          classification: "LEAN",
          status: "Monitoring",
          dataSourceStatus: "Manual data mode",
          lastUpdated: bet.timestamp,
          requiredPrice: "Awaiting data",
          playableTo: "Not recorded",
        })
        .run();
    }
  }

  db.insert(bankrollTransactions)
    .values({
      id: "txn-seed-deposit",
      type: "deposit",
      amountUsd: 500,
      source: "seed",
      note: "Starting bankroll for desk",
      createdAt: now,
    })
    .run();

  db.insert(alerts)
    .values({
      id: "alert-seed",
      kind: "integrity",
      title: "Manual data mode active",
      body: "No live odds/injury feeds connected. Do not claim scanning.",
      createdAt: now,
      read: 0,
    })
    .run();

  // Integration adapters start disconnected — never claim scanning.
  const integrationDefaults = [
    { id: "int-odds", name: "Live odds API", kind: "odds" },
    { id: "int-results", name: "Sports results API", kind: "results" },
    { id: "int-injury", name: "Injury/lineup data", kind: "injury" },
    { id: "int-weather", name: "Weather API", kind: "weather" },
    { id: "int-auth", name: "Auth / cloud database", kind: "auth" },
  ];
  for (const d of integrationDefaults) {
    db.insert(integrations)
      .values({
        ...d,
        status: "disconnected",
        freshnessNote: "Not connected — manual workflows remain active",
        updatedAt: now,
      })
      .run();
  }
}
