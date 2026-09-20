import { relations } from "drizzle-orm";
import {
  integer,
  real,
  sqliteTable,
  text,
} from "drizzle-orm/sqlite-core";

export const settings = sqliteTable("settings", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  unitUsd: real("unit_usd").notNull().default(10),
  timezone: text("timezone").notNull().default("America/Anchorage"),
  bankrollUsd: real("bankroll_usd").notNull().default(0),
  dataMode: text("data_mode").notNull().default("manual"),
  updatedAt: text("updated_at").notNull(),
});

export const modelVersions = sqliteTable("model_versions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  version: text("version").notNull().unique(),
  notes: text("notes"),
  edgeFloor: real("edge_floor").notNull().default(0.03),
  status: text("status").notNull().default("live"),
  createdAt: text("created_at").notNull(),
});

export const wagers = sqliteTable("wagers", {
  id: text("id").primaryKey(),
  placedAt: text("placed_at"),
  eventDate: text("event_date"),
  sport: text("sport").notNull(),
  league: text("league"),
  event: text("event"),
  marketType: text("market_type"),
  selection: text("selection").notNull(),
  direction: text("direction"),
  line: real("line"),
  sportsbook: text("sportsbook"),
  entryOdds: integer("entry_odds"),
  baseOdds: integer("base_odds"),
  promoOdds: integer("promo_odds"),
  stakeUsd: real("stake_usd").notNull(),
  stakeUnits: real("stake_units"),
  cashAmount: real("cash_amount"),
  bonusAmount: real("bonus_amount").default(0),
  promotionType: text("promotion_type").default("none"),
  timing: text("timing").default("prematch"),
  classification: text("classification").notNull(),
  officialStatus: text("official_status").notNull().default("non_official"),
  truelineProb: text("trueline_prob"),
  breakEvenProb: real("break_even_prob"),
  estimatedEdge: real("estimated_edge"),
  result: text("result"),
  pnlUsd: real("pnl_usd"),
  potentialPayout: real("potential_payout"),
  actualPayout: real("actual_payout"),
  settledAt: text("settled_at"),
  closingOdds: integer("closing_odds"),
  clvStatus: text("clv_status").notNull().default("unconfirmed"),
  clvNote: text("clv_note"),
  notes: text("notes"),
  correlationTag: text("correlation_tag"),
  dataQuality: text("data_quality"),
  source: text("source"),
  modelVersion: text("model_version"),
  portfolio: text("portfolio"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const auditLogs = sqliteTable("audit_logs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  wagerId: text("wager_id").notNull(),
  field: text("field").notNull(),
  previousValue: text("previous_value"),
  correctedValue: text("corrected_value"),
  reason: text("reason"),
  createdAt: text("created_at").notNull(),
});

export const opportunities = sqliteTable("opportunities", {
  id: text("id").primaryKey(),
  sport: text("sport").notNull(),
  league: text("league"),
  event: text("event").notNull(),
  startTime: text("start_time"),
  market: text("market").notNull(),
  selection: text("selection").notNull(),
  line: real("line"),
  sportsbook: text("sportsbook"),
  currentOdds: integer("current_odds"),
  marketTimestamp: text("market_timestamp"),
  breakEvenProb: real("break_even_prob"),
  truelineProb: text("trueline_prob"),
  estimatedEdge: real("estimated_edge"),
  classification: text("classification").notNull().default("Research/Hypothetical"),
  confidence: text("confidence"),
  status: text("status").notNull().default("New"),
  supportingFactors: text("supporting_factors"),
  risks: text("risks"),
  requiredPrice: text("required_price"),
  playableTo: text("playable_to"),
  dataSourceStatus: text("data_source_status").notNull().default("Manual data mode"),
  lastUpdated: text("last_updated").notNull(),
});

export const classificationHistory = sqliteTable("classification_history", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  opportunityId: text("opportunity_id").notNull(),
  classification: text("classification").notNull(),
  odds: integer("odds"),
  note: text("note"),
  createdAt: text("created_at").notNull(),
});

export const bankrollTransactions = sqliteTable("bankroll_transactions", {
  id: text("id").primaryKey(),
  type: text("type").notNull(),
  amountUsd: real("amount_usd").notNull(),
  source: text("source"),
  linkedWagerId: text("linked_wager_id"),
  note: text("note"),
  createdAt: text("created_at").notNull(),
});

export const alerts = sqliteTable("alerts", {
  id: text("id").primaryKey(),
  kind: text("kind").notNull(),
  title: text("title").notNull(),
  body: text("body"),
  createdAt: text("created_at").notNull(),
  read: integer("read").notNull().default(0),
});

export const dailyBriefs = sqliteTable("daily_briefs", {
  id: text("id").primaryKey(),
  slot: text("slot").notNull(),
  briefDate: text("brief_date").notNull(),
  content: text("content").notNull(),
  createdAt: text("created_at").notNull(),
});

export const researchNotes = sqliteTable("research_notes", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  modelVersion: text("model_version"),
  robustFlag: integer("robust_flag").notNull().default(0),
  createdAt: text("created_at").notNull(),
});

export const clvCheckpoints = sqliteTable("clv_checkpoints", {
  id: text("id").primaryKey(),
  wagerId: text("wager_id").notNull(),
  checkpoint: text("checkpoint").notNull(), // entry | h6 | m90 | m30 | close
  oddsAmerican: integer("odds_american"),
  sportsbook: text("sportsbook"),
  sameBookMarket: integer("same_book_market").notNull().default(1),
  note: text("note"),
  recordedAt: text("recorded_at").notNull(),
});

export const integrations = sqliteTable("integrations", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  kind: text("kind").notNull(),
  status: text("status").notNull().default("disconnected"),
  lastSuccessAt: text("last_success_at"),
  lastError: text("last_error"),
  freshnessNote: text("freshness_note"),
  updatedAt: text("updated_at").notNull(),
});

export const sportsbookBalances = sqliteTable("sportsbook_balances", {
  id: text("id").primaryKey(),
  sportsbook: text("sportsbook").notNull(),
  balanceUsd: real("balance_usd").notNull().default(0),
  updatedAt: text("updated_at").notNull(),
});

export const wagerRelations = relations(wagers, ({ many }) => ({
  audits: many(auditLogs),
  clv: many(clvCheckpoints),
}));
