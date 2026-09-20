import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import fs from "fs";
import path from "path";
import * as schema from "./schema";

const DATA_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "trueline.sqlite");

let _db: ReturnType<typeof drizzle<typeof schema>> | null = null;

export function getDb() {
  if (_db) return _db;
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  const sqlite = new Database(DB_PATH);
  sqlite.pragma("journal_mode = WAL");
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      unit_usd REAL NOT NULL DEFAULT 10,
      timezone TEXT NOT NULL DEFAULT 'America/Anchorage',
      bankroll_usd REAL NOT NULL DEFAULT 0,
      data_mode TEXT NOT NULL DEFAULT 'manual',
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS model_versions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      version TEXT NOT NULL UNIQUE,
      notes TEXT,
      edge_floor REAL NOT NULL DEFAULT 0.03,
      status TEXT NOT NULL DEFAULT 'live',
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS wagers (
      id TEXT PRIMARY KEY,
      placed_at TEXT,
      event_date TEXT,
      sport TEXT NOT NULL,
      league TEXT,
      event TEXT,
      market_type TEXT,
      selection TEXT NOT NULL,
      direction TEXT,
      line REAL,
      sportsbook TEXT,
      entry_odds INTEGER,
      base_odds INTEGER,
      promo_odds INTEGER,
      stake_usd REAL NOT NULL,
      stake_units REAL,
      cash_amount REAL,
      bonus_amount REAL DEFAULT 0,
      promotion_type TEXT DEFAULT 'none',
      timing TEXT DEFAULT 'prematch',
      classification TEXT NOT NULL,
      official_status TEXT NOT NULL DEFAULT 'non_official',
      trueline_prob TEXT,
      break_even_prob REAL,
      estimated_edge REAL,
      result TEXT,
      pnl_usd REAL,
      potential_payout REAL,
      actual_payout REAL,
      settled_at TEXT,
      closing_odds INTEGER,
      clv_status TEXT NOT NULL DEFAULT 'unconfirmed',
      clv_note TEXT,
      notes TEXT,
      correlation_tag TEXT,
      data_quality TEXT,
      source TEXT,
      model_version TEXT,
      portfolio TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      wager_id TEXT NOT NULL,
      field TEXT NOT NULL,
      previous_value TEXT,
      corrected_value TEXT,
      reason TEXT,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS opportunities (
      id TEXT PRIMARY KEY,
      sport TEXT NOT NULL,
      league TEXT,
      event TEXT NOT NULL,
      start_time TEXT,
      market TEXT NOT NULL,
      selection TEXT NOT NULL,
      line REAL,
      sportsbook TEXT,
      current_odds INTEGER,
      market_timestamp TEXT,
      break_even_prob REAL,
      trueline_prob TEXT,
      estimated_edge REAL,
      classification TEXT NOT NULL DEFAULT 'Research/Hypothetical',
      confidence TEXT,
      status TEXT NOT NULL DEFAULT 'New',
      supporting_factors TEXT,
      risks TEXT,
      required_price TEXT,
      playable_to TEXT,
      data_source_status TEXT NOT NULL DEFAULT 'Manual data mode',
      last_updated TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS classification_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      opportunity_id TEXT NOT NULL,
      classification TEXT NOT NULL,
      odds INTEGER,
      note TEXT,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS bankroll_transactions (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      amount_usd REAL NOT NULL,
      source TEXT,
      linked_wager_id TEXT,
      note TEXT,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS alerts (
      id TEXT PRIMARY KEY,
      kind TEXT NOT NULL,
      title TEXT NOT NULL,
      body TEXT,
      created_at TEXT NOT NULL,
      read INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS daily_briefs (
      id TEXT PRIMARY KEY,
      slot TEXT NOT NULL,
      brief_date TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS research_notes (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      model_version TEXT,
      robust_flag INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS clv_checkpoints (
      id TEXT PRIMARY KEY,
      wager_id TEXT NOT NULL,
      checkpoint TEXT NOT NULL,
      odds_american INTEGER,
      sportsbook TEXT,
      same_book_market INTEGER NOT NULL DEFAULT 1,
      note TEXT,
      recorded_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS integrations (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      kind TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'disconnected',
      last_success_at TEXT,
      last_error TEXT,
      freshness_note TEXT,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS sportsbook_balances (
      id TEXT PRIMARY KEY,
      sportsbook TEXT NOT NULL,
      balance_usd REAL NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL
    );
  `);
  _db = drizzle(sqlite, { schema });
  return _db;
}
